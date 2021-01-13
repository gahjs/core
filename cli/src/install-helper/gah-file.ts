import chalk from 'chalk';
import DIContainer from '../di-container';
import {
  IFileSystemService, GahHost, GahModule, IWorkspaceService, ILoggerService, GahFileData, IPluginService, GahConfig
} from '@gah/shared';
import { GahModuleBase } from './gah-module-base';
import { GahModuleDef } from './gah-module-def';
import { GahHostDef } from './gah-host-def';
import { FileSystemService } from '../services/file-system.service';
import { WorkspaceService } from '../services/workspace.service';
import { CopyHost } from './copy-host';
import { LoggerService } from '../services/logger.service';
import { PluginService } from '../services/plugin.service';
import compareVersions from 'compare-versions';

export class GahFile {
  private readonly _fileSystemService: IFileSystemService;
  private readonly _workspaceService: IWorkspaceService;
  private readonly _loggerService: ILoggerService;
  private readonly _pluginService: IPluginService;
  private readonly _configs: { moduleName: string, cfg: GahConfig }[];

  private readonly _gahFileName: string;

  public isHost: boolean;
  public isInstalled: boolean;

  private readonly _modules: GahModuleBase[];
  private _rootModule: GahModuleBase;
  private readonly _filePath: string;

  constructor(filePath: string) {

    this._fileSystemService = DIContainer.get(FileSystemService);
    this._workspaceService = DIContainer.get(WorkspaceService);
    this._loggerService = DIContainer.get(LoggerService);
    this._pluginService = DIContainer.get(PluginService);
    this.isInstalled = false;
    this._modules = new Array<GahModuleBase>();
    this._configs = new Array<{ moduleName: string, cfg: GahConfig }>();

    this._gahFileName = this._fileSystemService.getFilenameFromFilePath(filePath);

    this.setModuleType(filePath);
    this._filePath = filePath;
  }

  public async init() {
    const initializedModules = new Array<GahModuleBase>();

    if (this.isHost) {
      let hostCfg: GahHost;
      try {
        hostCfg = await this._fileSystemService.parseFile<GahHost>(this._filePath);
      } catch (error) {
        this._loggerService.error(`could not parse host file at ${this._filePath}`);
        throw error;
      }
      await this.loadHost(hostCfg, this._filePath, initializedModules);
    } else {
      let moduleCfg: GahModule;
      try {
        moduleCfg = await this._fileSystemService.parseFile<GahModule>(this._filePath);
      } catch (error) {
        this._loggerService.error(`could not parse module file at ${this._filePath}`);
        throw error;
      }
      await this.loadModule(moduleCfg, this._filePath, initializedModules);
    }
  }

  public async data(): Promise<GahFileData> {
    return {
      isHost: this.isHost,
      isInstalled: this.isInstalled,
      modules: await Promise.all(this._modules.map(x => x.data()))
    };
  }

  public getConfig(globalCfg: GahConfig): GahConfig {
    return GahFile.mergeConfigs([globalCfg, ...this._configs.map(x => x.cfg)]);
  }

  public getConfigs() {
    return this._configs;
  }

  public static mergeConfigs(cfgs: GahConfig[]): GahConfig {
    const cfgRes = new GahConfig();

    cfgs.forEach(cfg => this.mergeGahConfig(cfg, cfgRes));

    return cfgRes;
  }

  private static mergeGahConfig(source: GahConfig, target: GahConfig) {
    if (source.plugins) {
      target.plugins ??= [];
      target.plugins.push(...source.plugins);
    }
    if (source.precompiled) {
      target.precompiled ??= [];
      target.precompiled.push(...source.precompiled);
    }
  }

  public async install(skipPackageInstall: boolean) {
    if (this.isHost) {
      this.checkValidConfiguration();
      this._pluginService.triggerEvent('BEFORE_COPY_HOST', { gahFile: await this.data() });
      await this.copyHostFiles();
      this._pluginService.triggerEvent('AFTER_COPY_HOST', { gahFile: await this.data() });
    }

    this._pluginService.triggerEvent('BEFORE_INSTALL_MODULE', { module: await this._rootModule.data() });
    await this._rootModule.install(skipPackageInstall);
    this._pluginService.triggerEvent('AFTER_INSTALL_MODULE', { module: await this._rootModule.data() });

    // workaround
    for (const m of this._modules) {
      await m.executePreinstallScripts();
      await m.executePostinstallScripts();
    }

    this._loggerService.stopLoadingAnimation(false, true, `gah install done ${this._rootModule.installStepCount}/${this._rootModule.installStepCount}!`);
  }

  public whyModule(moduleName: string) {
    let refs: string[][];
    if (this.isHost) {
      const host = this._modules.find(x => x.isHost);
      if (!host) {
        throw new Error('Could not find host');
      }
      refs = this.findRecursiveDependencieChains(moduleName, host, [], [], 'HOST');
    } else {
      const refsArray = this._modules.map(mod => this.findRecursiveDependencieChains(moduleName, mod, [], [], mod.moduleName!));
      refs = Array.prototype.concat(...refsArray);
    }

    if (refs.length <= 1) {
      this._loggerService.log(`'${chalk.green(moduleName)}' is not referenced`);
    } else {
      this._loggerService.log(`'${chalk.green(moduleName)}' is referenced by the following configurations:`);
      refs.forEach(chain => {
        const chainLine = chain.map(x => `'${chalk.green(x)}'`).join(' -> ');
        this._loggerService.log(chainLine);
      });
    }
  }

  private findRecursiveDependencieChains(searchedName: string, module: GahModuleBase, chains: string[][], chain: string[], pathStart: string): string[][] {
    if (!chain || chain.length === 0) {
      chain = [pathStart];
    }
    for (const dep of module.dependencies) {
      if (chain.indexOf(dep.moduleName!) !== -1) {
        this._loggerService.warn(`ERROR: circular dependdency detected: ${[...chain, dep.moduleName!].map(x => `'${chalk.red(x)}'`).join(' -> ')}`);
        continue;
      }
      if (dep.moduleName === searchedName) {
        chains.push([...chain, searchedName]);
      } else {
        chain.push(dep.moduleName!);
        const res = this.findRecursiveDependencieChains(searchedName, dep, chains, chain, pathStart);
        if (res && res.length > 0) {
          chain = [pathStart];
        } else {
          chain.pop();
        }
      }
    }
    return chains;
  }

  public async whyPackage(packageName: string) {
    const host = this._modules.find(x => x.isHost);
    if (!host) {
      throw new Error('Host could not be found');
    }

    const becauseOfUs: GahModuleDef[] = [];

    for (const x of host.allRecursiveDependencies) {
      if ((await x.getPackageJson()).dependencies?.[packageName] || (await x.getPackageJson()).devDependencies?.[packageName]) {
        becauseOfUs.push(x);
      }
    }
    if (becauseOfUs.length <= 1) {
      this._loggerService.log(`'${chalk.yellow(packageName)}' is not referenced`);
    } else {
      this._loggerService.log(`'${chalk.yellow(packageName)}' is referenced by the following configurations: (red means it is excluded)`);

      for (const module of becauseOfUs) {
        const modulePackageJson = await module.getPackageJson();
        const packageVersion = (modulePackageJson.dependencies ?? modulePackageJson.devDependencies)?.[packageName];

        if (module.excludedPackages.indexOf(packageName) !== -1) {
          this._loggerService.log(`'${chalk.red(module.moduleName ?? '#N/A#')}' references version '${chalk.gray(packageVersion ?? 'unknown')}'`);
        } else {
          this._loggerService.log(`'${chalk.green(module.moduleName ?? '#N/A#')}' references version '${chalk.gray(packageVersion ?? 'unknown')}'`);
        }
      }
    }
  }

  public async tidyPackages() {
    const host = this._modules.find(x => x.isHost);
    if (!host) {
      this._loggerService.error('Could not find host');
      return;
    }
    const modulesThatChanged: GahModuleBase[] = [];
    const hostPackageJson = await host.getPackageJson();
    for (const dep of Object.keys(hostPackageJson.dependencies!)) {
      const modules = this._modules.filter(x => !x.isHost);
      for (const mod of modules) {
        const modPackageJson = await mod.getPackageJson();
        if (modPackageJson.dependencies?.[dep] && compareVersions(
          modPackageJson.dependencies[dep].replace('~', '').replace('^', ''),
          hostPackageJson.dependencies![dep].replace('~', '').replace('^', '')
        )) {
          modPackageJson.dependencies[dep] = hostPackageJson.dependencies![dep];
          if (!modulesThatChanged.includes(mod)) {
            modulesThatChanged.push(mod);
          }
        }
      }
    }
    for (const dep of Object.keys(hostPackageJson.devDependencies!)) {
      const modules = this._modules.filter(x => !x.isHost);
      for (const mod of modules) {
        const modPackageJson = await mod.getPackageJson();
        if (modPackageJson.devDependencies?.[dep] && compareVersions(
          modPackageJson.devDependencies[dep].replace('~', '').replace('^', ''),
          hostPackageJson.devDependencies![dep].replace('~', '').replace('^', '')
        )) {
          modPackageJson.devDependencies[dep] = hostPackageJson.devDependencies![dep];
          if (!modulesThatChanged.includes(mod)) {
            modulesThatChanged.push(mod);
          }
        }
      }
    }
    for (const mod of modulesThatChanged) {
      await this._fileSystemService.saveObjectToFile(this._fileSystemService.join(mod.basePath, 'package.json'), await mod.getPackageJson());
    }
  }

  private loadHost(cfg: GahHost, cfgPath: string, initializedModules: GahModuleBase[]) {

    cfg.modules.forEach(moduleRef => {
      moduleRef.names.forEach(moduleName => {
        this._modules.push(new GahModuleDef(moduleRef.path, moduleName, initializedModules, this._configs));
      });
    });

    const newHost = new GahHostDef(cfgPath, initializedModules, this._configs);
    this._rootModule = newHost;
    this._modules.push(newHost);
  }

  private loadModule(cfg: GahModule, cfgPath: string, initializedModules: GahModuleBase[]) {
    cfg.modules.forEach(moduleDef => {
      const newModule = new GahModuleDef(cfgPath, moduleDef.name, initializedModules, this._configs);
      this._rootModule = newModule;
      this._modules.push(newModule);
    });
  }

  private setModuleType(filePath: string) {
    if (this._gahFileName === 'gah-host.json') {
      this.isHost = true;
    }
    else if (this._gahFileName === 'gah-module.json') {
      this.isHost = false;
    }
    else {
      throw new Error(`The provided file is not a gah module or gah host file!\npath: "${filePath}"`);
    }
  }

  private async copyHostFiles() {
    const entryPackageJson = await this._modules.find(x => x.isEntry)!.getPackageJson();
    let angularCoreVersion = entryPackageJson.dependencies?.['@angular/core']?.match(/(\d+)\.\d+\.\d+/)?.[1];

    switch (angularCoreVersion) {
      case '8':
        break;
      case '9':
        angularCoreVersion = '8';
        break;
      case '10':
        angularCoreVersion = '10';
        break;
      default:
        angularCoreVersion = '11';
        break;
    }


    await CopyHost.copy(this._fileSystemService, this._workspaceService, this._loggerService, angularCoreVersion, true);
  }

  private checkValidConfiguration() {
    const entryModuleNames: string[] = [];
    this._modules.forEach(x => {
      if (x.isEntry) {
        entryModuleNames.push(x.moduleName!);
      }
    });
    if (entryModuleNames.length === 0) {
      throw new Error('You do not have any entry modules defined! You need exactly one entry module for the system to work!');
    } else if (entryModuleNames.length > 1) {
      throw new Error(`${'You have too many entry modules defined! You need exactly one entry module for the system to work!'
        + ' The following modules are configured as entry modules: '}${entryModuleNames.join(', ')}`);
    }
  }
}
