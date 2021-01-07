import { injectable } from 'inversify';

import { GahConfig, GahHost, GahModule, GahModuleType, IConfigurationService, IContextService, IFileSystemService, ILoggerService, TsConfig } from '@gah/shared';
import DIContainer from '../di-container';
import { LoggerService } from './logger.service';
import { FileSystemService } from './file-system.service';
import { ContextService } from './context-service';
import { GahFile } from '../install-helper/gah-file';


const gahModuleConfigFileName = 'gah-module.json';
const gahHostConfigFileName = 'gah-host.json';
const tsConfigPath = 'tsconfig.json';

@injectable()
export class ConfigService implements IConfigurationService {
  private readonly _fileSystemService: IFileSystemService;
  private readonly _contextService: IContextService;
  private readonly _loggerService: ILoggerService;
  private _isHost: boolean;
  private _moduleCfg: GahModule | GahHost;
  private _currentConfig: GahConfig;
  private _fullCfg: GahConfig;
  private _tsCfg: TsConfig;
  public externalConfigPath: string;
  public externalConfig: GahModule;
  private _configs: { moduleName: string; cfg: GahConfig; }[];
  private _globalCfg: GahConfig;

  constructor() {
    this._fileSystemService = DIContainer.get(FileSystemService);
    this._loggerService = DIContainer.get(LoggerService);
    this._contextService = DIContainer.get(ContextService);
  }

  private get gahConfigFileName() {
    const cfgName = this._contextService.getContext().configName;
    return cfgName ? `gah-config.${cfgName}.json` : 'gah-config.json';
  }

  public get gahConfigFileExists(): boolean {
    return this._fileSystemService.fileExists(this.gahConfigFileName);
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

  public getGahAnyType(inFolder: string) {
    const mType = this.getGahModuleType(inFolder);
    if (mType === GahModuleType.UNKNOWN) { throw new Error(`Could not find any module or host config in folder ${inFolder}`); }

    return this.loadAndParseGahAnyType(mType === GahModuleType.HOST, inFolder);
  }

  public getGahModuleType(inFolder?: string, optional = false): GahModuleType {
    const searchFolderModule = inFolder ? this._fileSystemService.join(inFolder, gahModuleConfigFileName) : gahModuleConfigFileName;
    const searchFolderHost = inFolder ? this._fileSystemService.join(inFolder, gahHostConfigFileName) : gahHostConfigFileName;


    const hasModuleCfg = this._fileSystemService.fileExists(searchFolderModule);
    const hasHostCfg = this._fileSystemService.fileExists(searchFolderHost);
    if (hasHostCfg && hasModuleCfg && !optional) {
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

  private loadGahModuleConfig(isHost?: boolean): void {
    this._isHost = isHost ?? false;
    const cfg = this.loadAndParseGahAnyType(this._isHost);
    this._moduleCfg = cfg;
  }

  private loadAndParseGahAnyType(isHost: boolean, inFolder?: string) {
    const searchFolderModule = inFolder ? this._fileSystemService.join(inFolder, gahModuleConfigFileName) : gahModuleConfigFileName;
    const searchFolderHost = inFolder ? this._fileSystemService.join(inFolder, gahHostConfigFileName) : gahHostConfigFileName;

    const loadPath = isHost ? searchFolderHost : searchFolderModule;
    const cfgStr = this._fileSystemService.tryReadFile(loadPath);
    let moduleOrHost: GahModule | GahHost;
    if (isHost) {
      moduleOrHost = new GahHost();
    } else {
      moduleOrHost = new GahModule();
    }
    if (cfgStr) {
      Object.assign(moduleOrHost, JSON.parse(cfgStr));
    }
    return moduleOrHost;
  }

  public gahConfigExists(): boolean {
    return this.gahConfigFileExists;
  }

  public getGahConfig(): GahConfig {
    this.loadGahConfig();
    return this._fullCfg;
  }

  public getPluginConfig(moduleName?: string) {
    if (!this._configs) {
      this.loadGahConfig();
    }
    return GahFile.mergeConfigs([this.getGlobalConfig(), ...this._configs.filter(x => x.moduleName === moduleName).map(x => x.cfg)]).plugins;
  }

  private getGlobalConfig(): GahConfig {
    if (!this._globalCfg) {
      const cfgPath = this._fileSystemService.ensureAbsolutePath(this.gahConfigFileName);
      const cfgs = new Array<GahConfig>();

      this.loadConfigs(cfgPath, cfgs);
      this._globalCfg = GahFile.mergeConfigs(cfgs);
    }
    return this._globalCfg;
  }

  private loadGahConfig(): void {
    const modType = this.getGahModuleType(undefined, true);
    const isHost = this.getGahModuleType() === GahModuleType.HOST;

    let cfg = this.getGlobalConfig();
    if (modType !== GahModuleType.UNKNOWN) {
      const fileName = isHost ? 'gah-host.json' : 'gah-module.json';
      const gahFile = new GahFile(fileName);
      cfg = gahFile.getConfig(cfg);
      this._configs = gahFile.getConfigs();
    }
    this._fullCfg = cfg;
  }

  private loadConfigs(path: string, cfgs: GahConfig[]) {
    const cfg = this._fileSystemService.tryParseFile<GahConfig>(path);
    if (!cfg) {
      return false;
    }
    if (cfg.extends) {
      const parentPath = this._fileSystemService.getDirectoryPathFromFilePath(path);
      const extendsPath = this._fileSystemService.join(parentPath, cfg.extends);
      const extendCfg = this.loadConfigs(extendsPath, cfgs);
      if (!extendCfg) {
        throw new Error(`Cannot find config file '${cfg.extends}' referenced from '${path}'`);
      }
    }
    cfgs.push(cfg);
    return true;
  }

  public getCurrentConfig() {
    if (!this._currentConfig) {
      if (this._isHost) {
        this._currentConfig = this.gahConfigFileExists ? this._fileSystemService.parseFile<GahConfig>(this.gahConfigFileName) : {} as GahConfig;
      } else {
        this._currentConfig = {} as GahConfig;
        if (this.gahConfigFileExists) {
          this._currentConfig = this._fileSystemService.parseFile<GahConfig>(this.gahConfigFileName);
        } else {
          if (!this._moduleCfg) {
            this.loadGahModuleConfig(this.getGahModuleType() === GahModuleType.HOST);
          }
          this._currentConfig = (this._moduleCfg as GahModule).modules[0].config ?? {} as GahConfig;
        }
      }
    }
    return this._currentConfig;
  }

  public saveCurrentConfig() {
    if (this._isHost || this.gahConfigFileExists) {
      this._fileSystemService.saveObjectToFile(this.gahConfigFileName, this._currentConfig);
    } else {
      this._fileSystemService.saveObjectToFile(gahModuleConfigFileName, this._moduleCfg);
    }
  }

  public saveGahModuleConfig(): void {
    if (this._isHost) {
      this._fileSystemService.saveObjectToFile(gahHostConfigFileName, this._moduleCfg);
    } else {
      this._fileSystemService.saveObjectToFile(gahModuleConfigFileName, this._moduleCfg);
    }
  }

  public mergeConfigs(cfgs: GahConfig[]): GahConfig {
    const cfgRes = new GahConfig();

    cfgs.forEach(cfg => this.mergeGahConfig(cfg, cfgRes));

    return cfgRes;
  }

  private mergeGahConfig(source: GahConfig, target: GahConfig) {
    if (source.plugins) {
      target.plugins ??= [];
      target.plugins.push(...source.plugins);
    }
    if (source.precompiled) {
      target.precompiled ??= [];
      target.precompiled.push(...source.precompiled);
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
    this._fileSystemService.deleteFile(this.gahConfigFileName);
  }

}
