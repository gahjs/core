import { IFileSystemService, GahConfig, GahHost, GahModule } from '@awdware/gah-shared';
import { GahModuleBase } from './gah-module-base';
import { GahModuleDef } from './gah-module-def';
import { GahHostDef } from './gah-host-def';

export class GahFile {
  public isHost: boolean;
  public isInstalled: boolean;
  protected _path: string;
  protected _gahFileName: string;
  protected _fileSystemService: IFileSystemService;
  protected gahCfg: GahConfig;

  protected _modules: GahModuleBase[];
  constructor(filePath: string, fileSystemService: IFileSystemService) {
    this._fileSystemService = fileSystemService;
    this.isInstalled = false;

    this._path = this._fileSystemService.getDirectoryPathFromFilePath(filePath);
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
    this.allReferencedModules.forEach(x => {
      x.install();
    });
  }

  private loadHost(cfg: GahHost, cfgPath: string) {
    cfg.modules.forEach(moduleRef => {
      moduleRef.names.forEach(moduleName => {
        this._modules.push(new GahModuleDef(moduleRef.path, moduleName, this._fileSystemService));
      });
    });
    this._modules.push(new GahHostDef(cfgPath, this._fileSystemService));
  }

  private loadModule(cfg: GahModule, cfgPath: string) {
    cfg.modules.forEach(moduleDef => {
      this._modules.push(new GahModuleDef(cfgPath, moduleDef.name, this._fileSystemService));
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

  public get allReferencedModules(): GahModuleBase[] {
    const allModules = new Array<GahModuleBase>();
    this._modules.forEach(mod => {
      this.collectAllReferencedModules(mod, allModules);
    });
    return allModules;
  }

  private collectAllReferencedModules(module: GahModuleBase, allModules: GahModuleBase[]) {
    if (allModules.indexOf(module) === -1) {
      allModules.push(module);
    }
    module.dependencies.forEach(dep => {
      this.collectAllReferencedModules(dep, allModules);
    });
  }
}
