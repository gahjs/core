import { IPromptService, IFileSystemService, IConfigurationService } from '@awdware/gah-shared';

export class ModuleReferenceHelper {

  public static async askForGahModuleJson(promptService: IPromptService, fileSystemService: IFileSystemService, cancelled: boolean, dependencyConfigPath?: string) {
    return promptService.input({
      msg: 'Path to the gah-module.json of the new dependency',
      enabled: () => !dependencyConfigPath,
      cancelled: cancelled,
      validator: (val: string) => {
        if (!val.endsWith('gah-module.json')) { return false; }
        return fileSystemService.fileExists(val);
      }
    });
  }

  public static async askForModulesToAdd(configService: IConfigurationService, promptService: IPromptService, cancelled: boolean, dependencyModuleNames?: string[]) {
    const availableExternalModules = configService.externalConfig.modules.map(x => x.name);
    if (dependencyModuleNames && dependencyModuleNames.length > 0) {
      const invalidModule = dependencyModuleNames.find(x => !availableExternalModules.includes(x));
      if (invalidModule) {
        throw new Error('Cannot find the module ' + invalidModule);
      }
    }
    if (availableExternalModules.length === 1) {
      dependencyModuleNames = availableExternalModules;
    }

    return await promptService.checkbox({
      msg: 'Which of the modules do you want to add?',
      choices: () => availableExternalModules,
      enabled: () => !dependencyModuleNames || dependencyModuleNames.length === 0,
      cancelled: cancelled
    });
  }

}
