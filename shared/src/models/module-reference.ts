/**
 * Contains information about a external referenced module
 */
export class ModuleReference {
  /**
   * The path to the gah-config.json of the external module. Relative to the folder containing this config file.
   */
  public path: string;
  /**
   * The names of the referenced modules within the project
   */
  public names: string[];
  /**
   * The module will be imported with an alias name instead of the real module name
   */
  public aliasName?: string;
}
