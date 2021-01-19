import { GahPluginDependencyConfig } from './gah-plugin-dependency-config';

export class GahConfig {
  protected $schema: string = 'https://raw.githubusercontent.com/gahjs/core/master/shared/assets/gah-config-schema.json';

  /**
   * The path to the config file which this config file extends
   */
  public extends?: string;

  /**
   * The array of plugins used in this project. Often only used for the host, but also possible in 'normal' modules.
   */
  public plugins?: GahPluginDependencyConfig[];

  /**
   * List of precompiled modules with a path to the tgz file (output from yarn pack command)
   */
  public precompiled?: {
    name: string;
    path?: string;
  }[];

  constructor() {}
}
