import { GahPluginConfig } from './gah-plugin-config';

/**
 * Describes a plugin dependency
 */
export class GahPluginDependencyConfig {
  /**
   * The name of the plugin that should be used. This has to be the name of a npm package.
   */
  public name: string;
  /**
   * The configuration for the plugin. Plugins add their own properties, please look at the documentation for the used plugin to see which settings are available.
   */
  public settings: GahPluginConfig;
}
