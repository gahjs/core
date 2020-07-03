import {
  IFileSystemService, GahHost, GahModule, IWorkspaceService, ILoggerService, GahFileData, IPluginService,
  GahEvent, HostCopiedEvent, StartingModuleInstallEvent, FinishedgModuleInstallEvent
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
      const hostCfg = this._fileSystemService.parseFile<GahHost>(filePath);
      this.loadHost(hostCfg, filePath, initializedModules);
    } else {
      const moduleCfg = this._fileSystemService.parseFile<GahModule>(filePath);
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
    this._loggerService.startLoadingAnimation(`Installing modules 1/${this._modules.length}`);

    if (this.isHost) {
      this.checkValidConfiguration();
      this.copyHostFiles();
      this._pluginService.triggerEvent(GahEvent.HOST_COPIED, { gahFile: this.data() } as HostCopiedEvent);
    }
    let i = 1;
    for (const x of this._modules) {
      this._pluginService.triggerEvent(GahEvent.STARTING_MODULE_INSTALL, { module: x.data() } as StartingModuleInstallEvent);
      this._loggerService.stopLoadingAnimation(true);
      this._loggerService.startLoadingAnimation(`Installing modules ${i}/${this._modules.length}`);
      await x.install();
      i++;
      this._pluginService.triggerEvent(GahEvent.FINISHED_MODULE_INSTALL, { module: x.data() } as FinishedgModuleInstallEvent);
    }
    this._loggerService.stopLoadingAnimation(false, true, `All modules installed ${i}/${i}!`);
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
      throw new Error('The provided file is not a gah module or gah host file!\npath: "' + filePath + '"');
    }
  }

  private copyHostFiles() {
    CopyHost.copy(this._fileSystemService, this._workspaceService, true);
  }

  private checkValidConfiguration() {
    let entryModuleNames: string[] = [];
    this._modules.forEach(x => {
      if (x.isEntry) {
        entryModuleNames.push(x.moduleName!);
      }
    });
    if (entryModuleNames.length === 0) {
      throw new Error('You do not have any entry modules defined! You need at exactly one entry module for the system to work!');
    } else if (entryModuleNames.length > 1) {
      throw new Error('You have too many entry modules defined! You need at exactly one entry module for the system to work!'
        + ' The following modules are configured as entry modules: ' + entryModuleNames.join(', '));
    }
  }
}
