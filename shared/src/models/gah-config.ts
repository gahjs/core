import { ModuleDefinition } from './module-definition';
import { GahPluginDependencyConfig } from './gah-plugin-dependency-config';

export class GahConfig {
  protected $schema: string = 'https://raw.githubusercontent.com/awdware/gah/master/assets/gah-config-schema.json';
  /**
   * Defines whether this project is a host module or not
   */
  public isHost?: boolean;
  /**
   * The array of the modules defined in this project.
   */
  public modules: ModuleDefinition[];
  /**
   * The array of plugins used in this project. Often only used for the host, but also possible in 'normal' modules.
   */
  public plugins?: GahPluginDependencyConfig[];

  constructor(isHost: boolean) {
    this.isHost = isHost;
    this.modules = new Array<ModuleDefinition>();
  }
}
