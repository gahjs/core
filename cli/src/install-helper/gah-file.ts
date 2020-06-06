import { IFileSystemService, GahHost, GahModule, IWorkspaceService } from '@awdware/gah-shared';
import { GahModuleBase } from './gah-module-base';
import { GahModuleDef } from './gah-module-def';
import { GahHostDef } from './gah-host-def';
import DIContainer from '../di-container';
import { FileSystemService } from '../services/file-system.service';
import { WorkspaceService } from '../services/workspace.service';
import { CopyHost } from './copy-host';

export class GahFile {
  private _fileSystemService: IFileSystemService;
  private _workspaceService: IWorkspaceService;

  private _gahFileName: string;

  public isHost: boolean;
  public isInstalled: boolean;

  private _modules: GahModuleBase[];
  constructor(filePath: string) {
    const initializedModules = new Array<GahModuleBase>();

    this._fileSystemService = DIContainer.get(FileSystemService);
    this._workspaceService = DIContainer.get(WorkspaceService);
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

  public install() {
    if (this.isHost) {
      this.copyHostFiles();
    }

    this._modules.forEach(x => {
      x.install();
    });
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
}
