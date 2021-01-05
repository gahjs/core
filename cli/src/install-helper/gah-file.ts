import chalk from 'chalk';
import DIContainer from '../di-container';
import {
  IFileSystemService, GahHost, GahModule, IWorkspaceService, ILoggerService, GahFileData, IPluginService, GahConfig, GahPluginDependencyConfig
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

  constructor(filePath: string) {
    const initializedModules = new Array<GahModuleBase>();

    this._fileSystemService = DIContainer.get(FileSystemService);
    this._workspaceService = DIContainer.get(WorkspaceService);
    this._loggerService = DIContainer.get(LoggerService);
    this._pluginService = DIContainer.get(PluginService);
    this.isInstalled = false;
    this._modules = new Array<GahModuleBase>();
    this._configs = new Array<{ moduleName: string, cfg: GahConfig }>();

    this._gahFileName = this._fileSystemService.getFilenameFromFilePath(filePath);

    this.setModuleType(filePath);

    if (this.isHost) {
      let hostCfg: GahHost;
      try {
        hostCfg = this._fileSystemService.parseFile<GahHost>(filePath);
      } catch (error) {
        this._loggerService.error(`could not parse host file at ${filePath}`);
        throw error;
      }
      this.loadHost(hostCfg, filePath, initializedModules);
    } else {
      let moduleCfg: GahModule;
      try {
        moduleCfg = this._fileSystemService.parseFile<GahModule>(filePath);
      } catch (error) {
        this._loggerService.error(`could not parse module file at ${filePath}`);
        throw error;
      }
      this.loadModule(moduleCfg, filePath, initializedModules);
    }
  }

  public data(): GahFileData {
    return {
      isHost: this.isHost,
      isInstalled: this.isInstalled,
      modules: this._modules.map(x => x.data())
    };
  }

  public getConfig(globalCfg: GahConfig): GahConfig {
    return GahFile.mergeConfigs([globalCfg, ...this._configs.map(x => x.cfg)]);
  }

  public getPluginConfigs(globalCfg: GahConfig, moduleName?: string): GahPluginDependencyConfig[] | undefined {
    return GahFile.mergeConfigs([globalCfg, ...this._configs.filter(x => x.moduleName === moduleName).map(x => x.cfg)]).plugins;
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

    this._rootModule.prog('Copying host');

    if (this.isHost) {
      this.checkValidConfiguration();
      this.copyHostFiles();
      this._pluginService.triggerEvent('HOST_COPIED', { gahFile: this.data() });
    }

    this._pluginService.triggerEvent('STARTING_MODULE_INSTALL', { module: this._rootModule.data() });
    await this._rootModule.install(skipPackageInstall);
    this._pluginService.triggerEvent('FINISHED_MODULE_INSTALL', { module: this._rootModule.data() });

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

  public whyPackage(packageName: string) {
    const host = this._modules.find(x => x.isHost);
    if (!host) {
      throw new Error('Host could not be found');
    }
    const becauseOfus = host.allRecursiveDependencies
      .filter(x => x.packageJson.dependencies?.[packageName] || x.packageJson.devDependencies?.[packageName]);
    if (becauseOfus.length <= 1) {
      this._loggerService.log(`'${chalk.yellow(packageName)}' is not referenced`);
    } else {
      this._loggerService.log(`'${chalk.yellow(packageName)}' is referenced by the following configurations: (red means it is excluded)`);
      becauseOfus.forEach(module => {

        const packageVersion = (module.packageJson.dependencies ?? module.packageJson.devDependencies)?.[packageName];

        if (module.excludedPackages.indexOf(packageName) !== -1) {
          this._loggerService.log(`'${chalk.red(module.moduleName ?? '#N/A#')}' references version '${chalk.gray(packageVersion ?? 'unknown')}'`);
        } else {
          this._loggerService.log(`'${chalk.green(module.moduleName ?? '#N/A#')}' references version '${chalk.gray(packageVersion ?? 'unknown')}'`);
        }
      });
    }
  }

  public tidyPackages() {
    const host = this._modules.find(x => x.isHost);
    if (!host) {
      this._loggerService.error('Could not find host');
      return;
    }
    const modulesThatChanged: GahModuleBase[] = [];
    const hostPackageJson = host.packageJson;
    Object.keys(hostPackageJson.dependencies!).forEach(dep => {
      this._modules.filter(x => !x.isHost).forEach(mod => {
        if (mod.packageJson.dependencies?.[dep] && compareVersions(
          mod.packageJson.dependencies[dep].replace('~', '').replace('^', ''),
          hostPackageJson.dependencies![dep].replace('~', '').replace('^', '')
        )) {
          mod.packageJson.dependencies[dep] = hostPackageJson.dependencies![dep];
          if (!modulesThatChanged.includes(mod)) {
            modulesThatChanged.push(mod);
          }
        }
      });
    });
    Object.keys(hostPackageJson.devDependencies!).forEach(dep => {
      this._modules.filter(x => !x.isHost).forEach(mod => {
        if (mod.packageJson.devDependencies?.[dep] && compareVersions(
          mod.packageJson.devDependencies[dep].replace('~', '').replace('^', ''),
          hostPackageJson.devDependencies![dep].replace('~', '').replace('^', '')
        )) {
          mod.packageJson.devDependencies[dep] = hostPackageJson.devDependencies![dep];
          if (!modulesThatChanged.includes(mod)) {
            modulesThatChanged.push(mod);
          }
        }
      });
    });
    modulesThatChanged.forEach(mod => {
      this._fileSystemService.saveObjectToFile(this._fileSystemService.join(mod.basePath, 'package.json'), mod.packageJson);
    });
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

  private copyHostFiles() {
    const entryPackageJson = this._modules.find(x => x.isEntry)!.packageJson;
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


    CopyHost.copy(this._fileSystemService, this._workspaceService, this._loggerService, angularCoreVersion, true);
  }

  private checkValidConfiguration() {
    const entryModuleNames: string[] = [];
    this._modules.forEach(x => {
      if (x.isEntry) {
        entryModuleNames.push(x.moduleName!);
      }
    });
    if (entryModuleNames.length === 0) {
      this._loggerService.error('You do not have any entry modules defined! You need exactly one entry module for the system to work!');
      process.exit(1);
    } else if (entryModuleNames.length > 1) {
      this._loggerService.error(`${'You have too many entry modules defined! You need exactly one entry module for the system to work!'
        + ' The following modules are configured as entry modules: '}${entryModuleNames.join(', ')}`);
      process.exit(1);
    }
  }
}
