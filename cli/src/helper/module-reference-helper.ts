import { IPromptService, IFileSystemService, IConfigurationService, ILoggerService } from '@awdware/gah-shared';

export class ModuleReferenceHelper {

  public static async askForGahModuleJson(
    promptService: IPromptService,
    fileSystemService: IFileSystemService,
    loggerService: ILoggerService,
    msg: string,
    dependencyConfigPath?: string
  ) {
    const dependencyConfigPath_ = await promptService.input({
      msg,
      enabled: () => !dependencyConfigPath,
      validator: (val: string) => {
        if (!val.endsWith('gah-module.json')) { return false; }
        return fileSystemService.fileExists(val);
      }
    });

    if (!(dependencyConfigPath || dependencyConfigPath_)) {
      loggerService.warn('No file provided...');
      return;
    }
    dependencyConfigPath = (dependencyConfigPath ?? dependencyConfigPath_).replace(/"/g, '');

    return dependencyConfigPath;
  }

  public static async askForModulesToAdd(configService: IConfigurationService, promptService: IPromptService, dependencyModuleNames?: string[]) {
    const availableExternalModules = configService.externalConfig.modules.map(x => x.name);
    if (dependencyModuleNames && dependencyModuleNames.length > 0) {
      const invalidModule = dependencyModuleNames.find(x => !availableExternalModules.includes(x));
      if (invalidModule) {
        throw new Error(`Cannot find the module ${invalidModule}`);
      }
    }
    if (availableExternalModules.length === 1) {
      dependencyModuleNames = availableExternalModules;
      return dependencyModuleNames;
    }
    const enabled = !dependencyModuleNames || dependencyModuleNames.length === 0;

    const dependencyModuleNames_ = await promptService.checkbox({
      msg: 'Which of the modules do you want to add?',
      choices: () => [...availableExternalModules],
      enabled: () => enabled,
    });

    if (!dependencyModuleNames || dependencyModuleNames.length === 0) { dependencyModuleNames = dependencyModuleNames_; }

    return dependencyModuleNames;
  }

  public static async askForModule(
    configService: IConfigurationService,
    promptService: IPromptService,
    loggerService: ILoggerService,
    isHost: boolean,
    msg: string,
    moduleName?: string) {
    const availableModules = isHost ? configService.getGahHost().modules.map(x => x.names).reduce((a, b) => a.concat(b)) : configService.getGahModule().modules.map(x => x.name);

    if (moduleName && !availableModules.includes(moduleName)) {
      throw new Error(`Cannot find module ${moduleName}`);
    }

    const moduleName_ = await promptService
      .list({
        msg,
        enabled: () => !moduleName && availableModules.length > 1,
        choices: () => [...availableModules]
      });

    if (availableModules.length === 1) { moduleName = availableModules[0]; }


    moduleName = moduleName ?? moduleName_;

    if (!moduleName) {
      loggerService.warn('No module selected...');
      return;
    }
    return moduleName;
  }

  public static async askForModuleDependencies(
    configService: IConfigurationService,
    promptService: IPromptService,
    loggerService: ILoggerService,
    isHost: boolean,
    moduleName?: string,
    dependencyNames?: string[]) {


    const existingDependencies =
      (
        isHost ?
          configService.getGahHost().modules
          :
          configService.getGahModule().modules.find(x => x.name === moduleName)?.dependencies
      )
        ?.map(x => x.names).reduce((a, b) => a.concat(b));

    if (!existingDependencies || existingDependencies.length === 0) {
      loggerService.warn(`The module "${moduleName}" has no references to other modules`);
    }

    const dependencyNames_ = await promptService
      .checkbox({
        msg: 'Select one or multiple dependencies to remove',
        enabled: () => !dependencyNames || dependencyNames.length === 0,
        choices: () => [...existingDependencies!]
      });

    dependencyNames = (dependencyNames?.length === 0 ? dependencyNames_ : dependencyNames) ?? dependencyNames_;

    if (!dependencyNames || dependencyNames.length === 0) {
      loggerService.warn('No modules selected');
    }

    return dependencyNames;
  }

}
