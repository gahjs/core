import { GahConfig } from '../gah-config';
import { TsConfigFileData } from './ts-config-file-data';
import { GahFolderData } from './gah-folder-data';
import { PackageJson } from '../package-json';

export interface GahModuleData {
  readonly basePath: string;
  readonly srcBasePath: string;
  readonly assetsGlobbingPath?: string | string[];
  readonly stylesPathRelativeToBasePath?: string;
  readonly publicApiPathRelativeToBasePath: string;
  readonly baseNgModuleName?: string;
  readonly isHost: boolean;
  readonly installed: boolean;
  readonly gahConfig: GahConfig;
  readonly isEntry: boolean;
  readonly packageJson?: PackageJson;

  readonly tsConfigFile: TsConfigFileData;
  readonly gahFolder: GahFolderData;

  readonly dependencies: GahModuleData[];
  readonly moduleName?: string;
  readonly packageName?: string;
  readonly ngOptions?: { aot: boolean };
}
