import { ModuleReference } from './module-reference';

export class ModuleDefinition {
  /**
   * The name of the module. This has to be unique withing the scope of all modules that are used within the same host.
   */
  public name: string;
  /**
   * The path to the folder containing facade files. This is optional and the path is relative to the folder this config file is in.
   */
  public facadePath?: string;
  /**
   * The path to the public-api.ts file. The path is relative to the folder this config file is in.
   */
  public publicApiPath: string;
  /**
   * The array of modules that are the dependencies for this module. This is optional.
   */
  public dependencies?: ModuleReference[];
  /**
   * The typescript class name of the base NgModule for this module. This is optional for modules that just act as a library without providing page-like functionality or routing.
   */
  public baseNgModuleName?: string;
  /**
   * Describes whether a module is the entry module for the host. This has to be set to true for exactly one module that is referenced by a host.
   */
  public isEntry?: boolean;
}
