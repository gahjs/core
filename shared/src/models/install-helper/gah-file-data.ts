import { GahModuleData } from './gah-module-data';

export interface GahFileData {
  readonly isHost: boolean;
  readonly isInstalled: boolean;
  readonly modules: GahModuleData[];
}
