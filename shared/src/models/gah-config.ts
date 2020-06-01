import { GahPluginDependencyConfig } from './gah-plugin-dependency-config';

export class GahConfig {
  protected $schema: string = 'https://raw.githubusercontent.com/awdware/gah/master/assets/gah-config-schema.json';

  /**
   * The array of plugins used in this project. Often only used for the host, but also possible in 'normal' modules.
   */
  public plugins?: GahPluginDependencyConfig[];

  constructor() {
  }
}
