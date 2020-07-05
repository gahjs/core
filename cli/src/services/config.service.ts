import { injectable, inject } from 'inversify';

import { GahConfig, TsConfig, IConfigurationService, IFileSystemService, GahHost, GahModule, GahModuleType } from '@awdware/gah-shared';

import { FileSystemService } from './file-system.service';

const gahConfigFileName = 'gah-config.json';
const gahModuleConfigFileName = 'gah-module.json';
const gahHostConfigFileName = 'gah-host.json';

const tsConfigPath = 'tsconfig.json';

@injectable()
export class ConfigService implements IConfigurationService {

  @inject(FileSystemService)
  private readonly _fileSystemService: IFileSystemService;
  private _cfg: GahConfig;
  private _moduleCfg: GahModule | GahHost;
  private _tsCfg: TsConfig;
  private isHost: boolean;

  public externalConfigPath: string;
  public externalConfig: GahModule;

  public gahConfigExists() {
    return this._fileSystemService.fileExists(gahConfigFileName);
  }

  public getGahConfig(forceLoad: boolean = false) {
    if (!this._cfg || forceLoad) {
      this.loadGahConfig();
    }
    return this._cfg;
  }

  public getGahModule(forceLoad?: boolean): GahModule {
    if (!this._moduleCfg || forceLoad) {
      this.loadGahModuleConfig(false);
    }
    if (this._moduleCfg.isHost) {
      throw new Error('Expected module config but found host config file');
    }
    return this._moduleCfg as GahModule;
  }

  public getGahHost(forceLoad?: boolean): GahHost {
    if (!this._moduleCfg || forceLoad) {
      this.loadGahModuleConfig(true);
    }
    if (!this._moduleCfg.isHost) {
      throw new Error('Expected host config but found module config file');
    }
    return this._moduleCfg as GahHost;
  }

  public getGahModuleType(inFolder?: string): GahModuleType {
    const searchFolderModule = inFolder ? this._fileSystemService.join(inFolder, gahModuleConfigFileName) : gahModuleConfigFileName;
    const searchFolderHost = inFolder ? this._fileSystemService.join(inFolder, gahHostConfigFileName) : gahHostConfigFileName;


    const hasModuleCfg = this._fileSystemService.fileExists(searchFolderModule);
    const hasHostCfg = this._fileSystemService.fileExists(searchFolderHost);
    if (hasHostCfg && hasModuleCfg) {
      throw new Error('A workspace cannot have both a host and a module config!');
    }
    if (hasModuleCfg) {
      return GahModuleType.MODULE;
    }
    if (hasHostCfg) {
      return GahModuleType.HOST;
    }
    return GahModuleType.UNKNOWN;
  }

  public getGahAnyType(inFolder: string) {
    const mType = this.getGahModuleType(inFolder);
    if (mType === GahModuleType.UNKNOWN) { throw new Error(`Could not find any module or host config in folder ${inFolder}`); }

    return this.loadAndParseGahAnyType(mType === GahModuleType.HOST, inFolder);
  }

  private loadGahConfig(): void {
    const cfgStr = this._fileSystemService.tryReadFile(gahConfigFileName);
    let cfg: GahConfig;
    if (!cfgStr) {
      cfg = new GahConfig();
    } else {
      cfg = JSON.parse(cfgStr);
    }

    this._cfg = cfg;
  }

  private loadGahModuleConfig(isHost?: boolean): void {
    this.isHost = isHost ?? false;
    const cfg = this.loadAndParseGahAnyType(this.isHost);
    this._moduleCfg = cfg;
  }

  private loadAndParseGahAnyType(isHost: boolean, inFolder?: string) {
    const searchFolderModule = inFolder ? this._fileSystemService.join(inFolder, gahModuleConfigFileName) : gahModuleConfigFileName;
    const searchFolderHost = inFolder ? this._fileSystemService.join(inFolder, gahHostConfigFileName) : gahHostConfigFileName;


    const loadPath = isHost ? searchFolderHost : searchFolderModule;
    const cfgStr = this._fileSystemService.tryReadFile(loadPath);
    let cfg: GahModule | GahHost;
    if (isHost) {
      cfg = new GahHost();
    } else {
      cfg = new GahModule();
    }
    if (cfgStr) {
      Object.assign(cfg, JSON.parse(cfgStr));
    }
    return cfg;
  }

  public saveGahConfig(): void {
    this._fileSystemService.saveObjectToFile(gahConfigFileName, this._cfg);
  }

  public saveGahModuleConfig(): void {
    if (this.isHost) {
      this._fileSystemService.saveObjectToFile(gahHostConfigFileName, this._moduleCfg);
    } else {
      this._fileSystemService.saveObjectToFile(gahModuleConfigFileName, this._moduleCfg);
    }
  }

  public getTsConfig(forceLoad: boolean = false) {
    if (!this._tsCfg || forceLoad) {
      this._tsCfg = this._fileSystemService.parseFile<TsConfig>(tsConfigPath);
    }
    return this._tsCfg;
  }

  public saveTsConfig(): void {
    this._fileSystemService.saveObjectToFile(tsConfigPath, this._tsCfg);
  }

  public readExternalConfig(cfgPath: string): boolean {
    this.externalConfigPath = this._fileSystemService.ensureRelativePath(cfgPath);
    this.externalConfig = this._fileSystemService.parseFile<GahModule>(this.externalConfigPath);
    return true;
  }

  public deleteGahConfig() {
    this._fileSystemService.deleteFile(gahConfigFileName);
  }

}
