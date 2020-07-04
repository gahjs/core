import { TsConfig } from '../ts-config';

export interface TsConfigFileData {
  readonly path: string;
  readonly tsConfig: TsConfig;
}
