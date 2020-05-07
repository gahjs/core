import DIContainer from './di-container';

import { PluginController } from './controller/plugin.controller';
import { DependencyController } from './controller/dependency.controller';
import { ContextService } from './services/context-service';
import { InstallController } from './controller/install.controller';

declare var calledFromCode: boolean;

() => {
  DIContainer.get(ContextService).setContext({ calledFromCli: false });
};

export const gah = {
  /**
   * Adds a plugin to the current gah project.
   * @param pluginName name of the npm package that should be added as plugin
   */
  addPlugin: (pluginName: string) =>
    DIContainer.get(PluginController).add(pluginName),
  /**
   * Removes a plugin from the current gah project.
   * @param pluginName name of the plugin that should be removed
   */
  removePlugin: (pluginName: string) =>
    DIContainer.get(PluginController).remove(pluginName),
  /**
   * Adds a dependency to a gah module or host. Must be executed in the folder of the module to add the dependency to.
   * @param moduleName name of the module to add the new dependency to
   * @param dependencyConfigPath absolute path to the gah-config.json of the new dependency
   * @param dependencyModuleNames the name(s) of the module(s) to add as dependency
   */
  addDependency: (moduleName: string, dependencyConfigPath: string, dependencyModuleNames: string[]) =>
    DIContainer.get(DependencyController).add(moduleName, dependencyConfigPath, dependencyModuleNames),
  // /**
  //  * Removes a plugin from the current gah project.
  //  * @param pluginName name of the plugin that should be removed [optinal]
  //  */
  // removeDependency: DIContainer.get(DependencyController).remove,
  /**
   * Installs the module(s) or host in the current directory. Use this in your build pipeline before building for example with the angular cli.
   */
  install: () => DIContainer.get(InstallController).install()
};
