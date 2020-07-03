import { GahModuleData } from './gah-module-base';

export interface GahFileData {
  readonly isHost: boolean;
  readonly isInstalled: boolean;
  readonly modules: GahModuleData[];
}
