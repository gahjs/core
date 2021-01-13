import { GahFileData } from './install-helper/gah-file-data';
import { GahModuleData } from './install-helper/gah-module-data';

export type GahEventDefinitions =
  { name: 'INSTALL', gahFile?: GahFileData } |
  { name: 'PRE_INSTALL_SCRIPTS', module?: GahModuleData } |
  { name: 'POST_INSTALL_SCRIPTS', module?: GahModuleData } |
  { name: 'COPY_HOST', gahFile?: GahFileData } |
  { name: 'INSTALL_MODULE', module?: GahModuleData } |
  { name: 'CLEAN_TS_CONFIG', module?: GahModuleData } |
  { name: 'CLEAN_GAH_FOLDER', module?: GahModuleData } |
  { name: 'GENERATE_STYLES_FILE', module?: GahModuleData } |
  { name: 'GENERATE_SYMLINKS', module?: GahModuleData } |
  { name: 'ADJUST_TS_CONFIG', module?: GahModuleData } |
  { name: 'GENERATE_TEMPLATE_DATA', module?: GahModuleData } |
  { name: 'GENERATE_TEMPLATE', module?: GahModuleData } |
  { name: 'COPY_ASSETS', module?: GahModuleData } |
  { name: 'REFERENCE_STYLES', module?: GahModuleData } |
  { name: 'MERGE_DEPENDENCIES', module?: GahModuleData } |
  { name: 'GENERATE_STYLE_IMPORTS', module?: GahModuleData } |
  { name: 'ADJUST_GITIGNORE', module?: GahModuleData } |
  { name: 'ADJUST_ANGULAR_JSON', module?: GahModuleData } |
  { name: 'ADJUST_INDEX_HTML', module?: GahModuleData } |
  { name: 'ADJUST_WEB_CONFIG', module?: GahModuleData } |
  { name: 'CLEAN_TEMPORARY_CHANGES', module?: GahModuleData } |
  { name: 'INSTALL_PACKAGES', module?: GahModuleData };

// Converts the 'GahEventDefinitions' type above to double the amount of events with a new property 'type' that either is prefixed with AFTER_ or BEFORE_
// Also still contains all other properties. Important: The new | (or) concatination is required because of how 'extends' is evaluated. Only if all possible values
// match, extends is evaluated as true. Example:

// type A = {type: VAL1 | VAL2}
// type B = VAL1;
// type C = VAL2;
// type D = VAL1 | VAL2;

// A extends { type:B } -> false
// A extends { type:C } -> false
// A extends { type:D } -> true
export type GahEventFull<A extends GahEventDefinitions, T> =
  A extends { name: T } ?
  (({ type: `BEFORE_${A['name']}` } & Omit<A, 'name'>) | ({ type: `AFTER_${A['name']}` } & Omit<A, 'name'>))
  : never

// This uses said type to actually create the new type
export type GahEvent = GahEventFull<GahEventDefinitions, any>;

// This extracts all the new genereated types into an own type
export type GahEventType = GahEvent['type'];
export type GahEventName = GahEventDefinitions['name'];

// This resolves into one of the GahEvents but without the name and type property, based on which type is passed in T.
export type ExtractEventPayload<A, T> = A extends { type: T } ? Omit<A, 'type'> : never;

export type ExtractEventPayloadFromName<A, T> = A extends { name: T } ? Omit<A, 'name'> : never;
