import { ModuleReference } from './module-reference';

export class ModuleDefinition {
  /**
   * The name of the module. This has to be unique withing the scope of all modules that are used within the same host.
   */
  public name: string;
  /**
   * The package name of the module. This determins the prefix of the import statement to this module. "import {...} from '@packageName/moduleName'"
   */
  public packageName: string;
  /**
   * The path(s) to the assets folder(s) that should get served by the host. This is optional and relative to this config's directory.
   */
  public assetsPath?: string | string[];
  /**
   * The path to the file containing global styles. This is optional and relative to this config's directory.
   */
  public stylesPath?: string;
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
  /**
   * Configures the parent of this module. Must be the name of a gah module which has a router outlet containing a route with the path 'gah-outlet'.
   */
  public parentGahModule?: string;
  /**
   * Exclude certain packages from the package.json to be added to the host's package.json. Has to be set for all modules that import which package to be effective.
   */
  public excludedPackages?: string[];
}
