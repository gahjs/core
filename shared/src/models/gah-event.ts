import { GahFileData } from './install-helper/gah-file-data';
import { GahModuleData } from './install-helper/gah-module-data';

export type GahEvent =
  { type: 'INSTALL_FINISHED', gahFile?: GahFileData } |
  { type: 'INSTALL_STARTED', gahFile?: GahFileData } |
  { type: 'HOST_COPIED', gahFile?: GahFileData } |
  { type: 'STARTING_MODULE_INSTALL', module?: GahModuleData } |
  { type: 'FINISHED_MODULE_INSTALL', module?: GahModuleData } |
  { type: 'TS_CONFIG_CLEANED', module?: GahModuleData } |
  { type: 'GAH_FOLDER_CLEANED', module?: GahModuleData } |
  { type: 'STYLES_FILE_GENERATED', module?: GahModuleData } |
  { type: 'SYMLINKS_CREATED', module?: GahModuleData } |
  { type: 'TS_CONFIG_ADJUSTED', module?: GahModuleData } |
  { type: 'TEMPLATE_GENERATED', module?: GahModuleData } |
  { type: 'ASSETS_BASE_STYLES_COPIED', module?: GahModuleData } |
  { type: 'DEPENDENCIES_MERGED', module?: GahModuleData } |
  { type: 'STYLE_IMPORTS_GENERATED', module?: GahModuleData } |
  { type: 'GITIGNORE_ADJUSTED', module?: GahModuleData } |
  { type: 'ANGULAR_JSON_ADJUSTED', module?: GahModuleData } |
  { type: 'INDEX_HTML_ADJUSTED', module?: GahModuleData } |
  { type: 'WEB_CONFIG_ADJUSTED', module?: GahModuleData } |
  { type: 'PACKAGES_INSTALLED', module?: GahModuleData }

export type GahEventType = GahEvent['type'];
export type ExtractEventPayload<A, T> = A extends { type: T } ? A : never
