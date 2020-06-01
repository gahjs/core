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
}
