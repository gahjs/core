import { IFileSystemService, GahHost, GahModule } from '@awdware/gah-shared';
import { GahModuleBase } from './gah-module-base';
import { GahModuleDef } from './gah-module-def';
import { GahHostDef } from './gah-host-def';
import DIContainer from '../di-container';
import { FileSystemService } from '../services/file-system.service';

export class GahFile {
  private _fileSystemService: IFileSystemService;

  private _gahFileName: string;

  public isHost: boolean;
  public isInstalled: boolean;

  protected _modules: GahModuleBase[];
  constructor(filePath: string) {
    this._fileSystemService = DIContainer.get(FileSystemService);
    this.isInstalled = false;

    this._gahFileName = this._fileSystemService.getFilenameFromFilePath(filePath);

    this.setModuleType(filePath);

    if (this.isHost) {
      const hostCfg = this._fileSystemService.parseFile<GahHost>(filePath);
      this.loadHost(hostCfg, filePath);
    } else {
      const moduleCfg = this._fileSystemService.parseFile<GahModule>(filePath);
      this.loadModule(moduleCfg, filePath);
    }
  }

  public install() {
    this._modules.forEach(x => {
      x.install();
    });
  }

  private loadHost(cfg: GahHost, cfgPath: string) {
    cfg.modules.forEach(moduleRef => {
      moduleRef.names.forEach(moduleName => {
        this._modules.push(new GahModuleDef(moduleRef.path, moduleName));
      });
    });
    this._modules.push(new GahHostDef(cfgPath));
  }

  private loadModule(cfg: GahModule, cfgPath: string) {
    cfg.modules.forEach(moduleDef => {
      this._modules.push(new GahModuleDef(cfgPath, moduleDef.name));
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
}
