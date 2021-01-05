import { GahConfig } from '../models/gah-config';
import { GahHost } from '../models/gah-host';
import { GahModule } from '../models/gah-module';
import { TsConfig } from '../models/ts-config';
import { GahModuleType } from '../models/gah-module-type';
import { GahPluginDependencyConfig } from '../models/gah-plugin-dependency-config';

export interface IConfigurationService {
  gahConfigExists(): boolean;
  getGahConfig(): GahConfig;
  getPluginConfig(moduleName?: string): GahPluginDependencyConfig[] | undefined;
  getPartialGahConfig(): GahConfig;
  getGahModule(forceLoad?: boolean): GahModule;
  getGahHost(forceLoad?: boolean): GahHost;
  getGahModuleType(inFolder?: string): GahModuleType;
  getGahAnyType(inFolder: string): GahModule | GahHost;
  saveGahConfig(): void;
  saveGahModuleConfig(): void;
  getTsConfig(): TsConfig
  saveTsConfig(): void;
  readExternalConfig(cfgPath: string): boolean;
  deleteGahConfig(): void;
  externalConfigPath: string;
  externalConfig: GahModule;
}
