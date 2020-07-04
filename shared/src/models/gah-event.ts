import { GahFileData } from './install-helper/gah-file';
import { GahModuleData } from './install-helper/gah-module-base';

export enum GahEvent {
  UNKNOWN,
  INSTALL_FINISHED,
  INSTALL_STARTED,
  HOST_COPIED,
  STARTING_MODULE_INSTALL,
  FINISHED_MODULE_INSTALL,
  TS_CONFIG_CLEANED,
  GAH_FOLDER_CLEANED,
  STYLES_FILE_GENERATED,
  SYMLINKS_CREATED,
  TS_CONFIG_ADJUSTED,
  TEMPLATE_GENERATED,
  ASSETS_BASE_STYLES_COPIED,
  DEPENDENCIES_MERGED,
  STYLE_IMPORTS_GENERATED,
  GITIGNORE_ADJUSTED,
  ANGULAR_JSON_ADJUSTED,
  INDEX_HTML_ADJUSTED,
  PACKAGES_INSTALLED,
}
export interface GahEventPayload {
}

export interface GahFileDataPayload extends GahEventPayload {
  readonly gahFile?: GahFileData;
}
export interface GahModuleDataPayload extends GahEventPayload {
  readonly module?: GahModuleData;
}

export type InstallFinishedEvent = GahFileDataPayload;
export type InstallStartedEvent = GahFileDataPayload;
export type HostCopiedEvent = GahFileDataPayload;
export type StartingModuleInstallEvent = GahModuleDataPayload;
export type FinishedgModuleInstallEvent = GahModuleDataPayload;
export type TsConfigCleanedEvent = GahModuleDataPayload;
export type GahFolderCleanedEvent = GahModuleDataPayload;
export type StylesFileGeneratedEvent = GahModuleDataPayload;
export type SymlinksCreatedEvent = GahModuleDataPayload;
export type TsConfigAdjustedEvent = GahModuleDataPayload;
export type TemplateGeneratedEvent = GahModuleDataPayload;
export type AssetsBaseStylesCopiedEvent = GahModuleDataPayload;
export type DependenciesMergedEvent = GahModuleDataPayload;
export type StyleImportsGeneratedEvent = GahModuleDataPayload;
export type GitignoreAdjustedEvent = GahModuleDataPayload;
export type AngularJsonAdjustedEvent = GahModuleDataPayload;
export type IndexHtmlAdjustedEvent = GahModuleDataPayload;
export type PackagesInstalledEvent = GahModuleDataPayload;
