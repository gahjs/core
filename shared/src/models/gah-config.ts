import { GahPluginDependencyConfig } from './gah-plugin-dependency-config';

export class GahConfig {
  protected $schema: string = 'https://raw.githubusercontent.com/awdware/gah/master/shared/assets/gah-config-schema.json';

  /**
   * The array of plugins used in this project. Often only used for the host, but also possible in 'normal' modules.
   */
  public plugins?: GahPluginDependencyConfig[];

  /**
   * If this property is set to true, gah will not adjust the paths object in the tsconfig json of the module(s) in this folder.
   */
  public skipTsConfigPathsAdjustments: boolean;

  constructor() {
  }
}
