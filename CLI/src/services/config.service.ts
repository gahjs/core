import { injectable, inject } from 'inversify';
import path_ from 'path';

import { GahConfig, TsConfig, IConfigurationService, IFileSystemService } from '@awdware/gah-shared';

import { FileSystemService } from './file-system.service';

const gahConfigFileName = 'gah-config.json';
const gahConfigFilePath = path_.join(process.cwd(), gahConfigFileName);

const tsConfigPath = 'tsconfig.json';

@injectable()
export class ConfigService implements IConfigurationService {

  @inject(FileSystemService)
  private _fileSystemService: IFileSystemService;
  private _cfg: GahConfig;
  private _tsCfg: TsConfig;

  public externalConfigPath: string;
  public externalConfig: GahConfig;

  public gahConfigExists() {
    return this._fileSystemService.fileExists(gahConfigFilePath);
  }

  public getGahConfig(forceLoad: boolean = false, host: boolean = false) {
    if (!this._cfg || forceLoad) {
      this.loadGahConfig(host);
    }
    return this._cfg as GahConfig;
  }

  private loadGahConfig(host: boolean = false): void {
    const cfgStr = this._fileSystemService.tryReadFile(gahConfigFilePath);
    let cfg: GahConfig;
    if (!cfgStr) {
      cfg = new GahConfig(host);
    } else {
      cfg = JSON.parse(cfgStr);
    }

    this._cfg = cfg;
  }

  public saveGahConfig(): void {
    this._fileSystemService.saveObjectToFile(gahConfigFilePath, this._cfg);
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
    this.externalConfig = this._fileSystemService.parseFile<GahConfig>(this.externalConfigPath);
    return true;
  }

  public deleteGahConfig() {
    this._fileSystemService.deleteFile(gahConfigFilePath);
  }

}
