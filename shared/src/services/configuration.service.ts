import { GahConfig } from '../models/gah-config';
import { GahHost } from '../models/gah-host';
import { GahModule } from '../models/gah-module';
import { TsConfig } from '../models/ts-config';
import { GahModuleType } from '../models/gah-module-type';
import { GahPluginDependencyConfig } from '../models/gah-plugin-dependency-config';

export interface IConfigurationService {
  gahConfigExists(): Promise<boolean>;
  getGahConfig(): Promise<GahConfig>;
  getPluginConfig(moduleName?: string): Promise<GahPluginDependencyConfig[] | undefined>;
  getCurrentConfig(): Promise<GahConfig>;
  getGahModule(forceLoad?: boolean): Promise<GahModule>;
  getGahHost(forceLoad?: boolean): Promise<GahHost>;
  getGahModuleType(inFolder?: string, optional?: boolean): Promise<GahModuleType>;
  getGahAnyType(inFolder: string): Promise<GahModule | GahHost>;
  saveCurrentConfig(): Promise<void>;
  saveGahModuleConfig(): Promise<void>;
  getTsConfig(): Promise<TsConfig>;
  saveTsConfig(): Promise<void>;
  readExternalConfig(cfgPath: string): Promise<boolean>;
  deleteGahConfig(): Promise<void>;
  externalConfigPath: string;
  externalConfig: GahModule;
}
