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

  public async getGahModule(forceLoad?: boolean): Promise<GahModule> {
    if (!this._moduleCfg || forceLoad) {
      await this.loadGahModuleConfig(false);
    }
    if (this._moduleCfg.isHost) {
      throw new Error('Expected module config but found host config file');
    }
    return this._moduleCfg as GahModule;
  }

  public async getGahHost(forceLoad?: boolean): Promise<GahHost> {
    if (!this._moduleCfg || forceLoad) {
      await this.loadGahModuleConfig(true);
    }
    if (!this._moduleCfg.isHost) {
      throw new Error('Expected host config but found module config file');
    }
    return this._moduleCfg as GahHost;
  }

  public async getGahAnyType(inFolder: string) {
    const mType = await this.getGahModuleType(inFolder);
    if (mType === GahModuleType.UNKNOWN) { throw new Error(`Could not find any module or host config in folder ${inFolder}`); }

    return this.loadAndParseGahAnyType(mType === GahModuleType.HOST, inFolder);
  }

  public async getGahModuleType(inFolder?: string, optional = false): Promise<GahModuleType> {
    const searchFolderModule = inFolder ? this._fileSystemService.join(inFolder, gahModuleConfigFileName) : gahModuleConfigFileName;
    const searchFolderHost = inFolder ? this._fileSystemService.join(inFolder, gahHostConfigFileName) : gahHostConfigFileName;


    const hasModuleCfg = await this._fileSystemService.fileExists(searchFolderModule);
    const hasHostCfg = await this._fileSystemService.fileExists(searchFolderHost);
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

  private async loadGahModuleConfig(isHost?: boolean): Promise<void> {
    this._isHost = isHost ?? false;
    const cfg = await this.loadAndParseGahAnyType(this._isHost);
    this._moduleCfg = cfg;
  }

  private async loadAndParseGahAnyType(isHost: boolean, inFolder?: string) {
    const searchFolderModule = inFolder ? this._fileSystemService.join(inFolder, gahModuleConfigFileName) : gahModuleConfigFileName;
    const searchFolderHost = inFolder ? this._fileSystemService.join(inFolder, gahHostConfigFileName) : gahHostConfigFileName;

    const loadPath = isHost ? searchFolderHost : searchFolderModule;
    const cfgStr = await this._fileSystemService.tryReadFile(loadPath);
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

  public async gahConfigExists(): Promise<boolean> {
    return await this._fileSystemService.fileExists(this.gahConfigFileName);
  }

  public async getGahConfig(): Promise<GahConfig> {
    await this.loadGahConfig();
    return this._fullCfg;
  }

  public async getPluginConfig(moduleName?: string) {
    if (!this._configs) {
      await this.loadGahConfig();
    }
    return GahFile.mergeConfigs([await this.getGlobalConfig(), ...this._configs.filter(x => x.moduleName === moduleName).map(x => x.cfg)]).plugins;
  }

  private async getGlobalConfig(): Promise<GahConfig> {
    if (!this._globalCfg) {
      const cfgPath = this._fileSystemService.ensureAbsolutePath(this.gahConfigFileName);
      const cfgs = new Array<GahConfig>();

      await this.loadConfigs(cfgPath, cfgs);
      this._globalCfg = GahFile.mergeConfigs(cfgs);
    }
    return this._globalCfg;
  }

  private async loadGahConfig(): Promise<void> {
    const modType = await this.getGahModuleType(undefined, true);
    const isHost = modType === GahModuleType.HOST;

    let cfg = await this.getGlobalConfig();
    if (modType !== GahModuleType.UNKNOWN) {
      const fileName = isHost ? 'gah-host.json' : 'gah-module.json';
      const gahFile = new GahFile(fileName);
      await gahFile.init();
      cfg = gahFile.getConfig(cfg);
      this._configs = gahFile.getConfigs();
    }
    this._fullCfg = cfg;
  }

  private async loadConfigs(path: string, cfgs: GahConfig[]) {
    const cfg = await this._fileSystemService.tryParseFile<GahConfig>(path);
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

  public async getCurrentConfig() {
    if (this._isHost) {
      this._currentConfig = await this.gahConfigExists() ? await this._fileSystemService.parseFile<GahConfig>(this.gahConfigFileName) : {} as GahConfig;
    } else {
      this._currentConfig = {} as GahConfig;
      if (await this.gahConfigExists()) {
        this._currentConfig = await this._fileSystemService.parseFile<GahConfig>(this.gahConfigFileName);
      } else {
        if (!this._moduleCfg) {
          this.loadGahModuleConfig(await this.getGahModuleType() === GahModuleType.HOST);
        }
        (this._moduleCfg as GahModule).modules[0].config ??= {} as GahConfig;
        this._currentConfig = (this._moduleCfg as GahModule).modules[0].config!;
      }
    }
    return this._currentConfig;
  }

  public async saveCurrentConfig() {
    if (this._isHost || await this.gahConfigExists()) {
      await this._fileSystemService.saveObjectToFile(this.gahConfigFileName, this._currentConfig);
    } else {
      await this._fileSystemService.saveObjectToFile(gahModuleConfigFileName, this._moduleCfg);
    }
  }

  public async saveGahModuleConfig(): Promise<void> {
    if (this._isHost) {
      await this._fileSystemService.saveObjectToFile(gahHostConfigFileName, this._moduleCfg);
    } else {
      await this._fileSystemService.saveObjectToFile(gahModuleConfigFileName, this._moduleCfg);
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

  public async getTsConfig(forceLoad: boolean = false) {
    if (!this._tsCfg || forceLoad) {
      this._tsCfg = await this._fileSystemService.parseFile<TsConfig>(tsConfigPath);
    }
    return this._tsCfg;
  }

  public async saveTsConfig(): Promise<void> {
    await this._fileSystemService.saveObjectToFile(tsConfigPath, this._tsCfg);
  }

  public async readExternalConfig(cfgPath: string): Promise<boolean> {
    this.externalConfigPath = await this._fileSystemService.ensureRelativePath(cfgPath);
    this.externalConfig = await this._fileSystemService.parseFile<GahModule>(this.externalConfigPath);
    return true;
  }

  public async deleteGahConfig() {
    await this._fileSystemService.deleteFile(this.gahConfigFileName);
  }

}
