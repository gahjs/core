import {
  IFileSystemService, GahHost, GahModule, IWorkspaceService, ILoggerService, GahFileData, IPluginService
} from '@awdware/gah-shared';
import { GahModuleBase } from './gah-module-base';
import { GahModuleDef } from './gah-module-def';
import { GahHostDef } from './gah-host-def';
import DIContainer from '../di-container';
import { FileSystemService } from '../services/file-system.service';
import { WorkspaceService } from '../services/workspace.service';
import { CopyHost } from './copy-host';
import { LoggerService } from '../services/logger.service';
import { PluginService } from '../services/plugin.service';
import chalk from 'chalk';

export class GahFile {
  private readonly _fileSystemService: IFileSystemService;
  private readonly _workspaceService: IWorkspaceService;
  private readonly _loggerService: ILoggerService;
  private readonly _pluginService: IPluginService;

  private readonly _gahFileName: string;

  public isHost: boolean;
  public isInstalled: boolean;

  private readonly _modules: GahModuleBase[];
  constructor(filePath: string) {
    const initializedModules = new Array<GahModuleBase>();

    this._fileSystemService = DIContainer.get(FileSystemService);
    this._workspaceService = DIContainer.get(WorkspaceService);
    this._loggerService = DIContainer.get(LoggerService);
    this._pluginService = DIContainer.get(PluginService);
    this.isInstalled = false;
    this._modules = new Array<GahModuleBase>();

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

  public async install() {
    this._loggerService.startLoadingAnimation(`Installing modules ${this._loggerService.getProgressBarString(this._modules.length, 0)} 1/${this._modules.length}`);

    if (this.isHost) {
      this.checkValidConfiguration();
      this.copyHostFiles();
      this._pluginService.triggerEvent('HOST_COPIED', { gahFile: this.data() });
    }
    let i = 0;
    for (const x of this._modules) {
      this._pluginService.triggerEvent('STARTING_MODULE_INSTALL', { module: x.data() });
      this._loggerService.stopLoadingAnimation(true);
      this._loggerService.startLoadingAnimation(`Installing modules ${this._loggerService.getProgressBarString(this._modules.length, i)} ${i}/${this._modules.length}`);
      await x.install();
      i++;
      this._pluginService.triggerEvent('FINISHED_MODULE_INSTALL', { module: x.data() });
    }
    this._loggerService.stopLoadingAnimation(false, true, `All modules installed ${i}/${i}!`);
  }

  public why(moduleName: string) {
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

  private loadHost(cfg: GahHost, cfgPath: string, initializedModules: GahModuleBase[]) {
    cfg.modules.forEach(moduleRef => {
      moduleRef.names.forEach(moduleName => {
        this._modules.push(new GahModuleDef(moduleRef.path, moduleName, initializedModules));
      });
    });
    this._modules.push(new GahHostDef(cfgPath, initializedModules));
  }

  private loadModule(cfg: GahModule, cfgPath: string, initializedModules: GahModuleBase[]) {
    cfg.modules.forEach(moduleDef => {
      this._modules.push(new GahModuleDef(cfgPath, moduleDef.name, initializedModules));
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
      default:
        angularCoreVersion = '10';
        break;
    }


    CopyHost.copy(this._fileSystemService, this._workspaceService, angularCoreVersion, true);
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
