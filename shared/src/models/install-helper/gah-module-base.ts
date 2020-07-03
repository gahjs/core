import { GahConfig } from '../gah-config';
import { TsConfigFileData } from './ts-config-file';
import { GahFolderData } from './gah-folder';

export interface GahModuleData {
  readonly basePath: string;
  readonly srcBasePath: string;
  readonly facadePathRelativeToBasePath?: string;
  readonly publicApiPathRelativeToBasePath: string;
  readonly baseNgModuleName?: string;
  readonly isHost: boolean;
  readonly installed: boolean;
  readonly gahConfig: GahConfig;
  readonly isEntry: boolean;

  readonly tsConfigFile: TsConfigFileData;
  readonly gahFolder: GahFolderData;

  readonly dependencies: GahModuleData[];
  readonly moduleName?: string;
  readonly packageName?: string;
  readonly ngOptions?: { aot: boolean };
}
