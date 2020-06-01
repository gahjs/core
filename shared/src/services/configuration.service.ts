import { GahConfig } from '../models/gah-config';
import { TsConfig } from '../models/ts-config';

export interface IConfigurationService {
  gahConfigExists(): boolean;
  getGahConfig(forceLoad?: boolean, host?: boolean): GahConfig;
  saveGahConfig(): void;
  getTsConfig(): TsConfig
  saveTsConfig(): void;
  readExternalConfig(cfgPath: string): boolean;
  deleteGahConfig(): void;
  externalConfigPath: string;
  externalConfig: GahConfig;
}
