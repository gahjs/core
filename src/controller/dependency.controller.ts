import { injectable } from 'inversify';

import { ModuleReference } from '@awdware/gah-shared';

import { Controller } from './controller';

@injectable()
export class DependencyController extends Controller {

  public async remove(args: string[]): Promise<void> {
    throw new Error('Not yet implemented\n' + args);
  }

  public async add(moduleName?: string, dependencyConfigPath?: string, dependencyModuleNames?: string[]): Promise<void> {
    let cancelled = false;
    const cfg = this._configService.getGahConfig();
    if (cfg.isHost) {
      moduleName = cfg.modules[0].name;
      this._loggerService.log('Adding new dependency to host');
    } else {
      this._loggerService.log('Adding new dependency to module');
    }

    const availableModules = this._configService.getGahConfig().modules.map(x => x.name);
    if (moduleName && !availableModules.includes(moduleName)) {
      throw new Error('Cannot find module ' + moduleName);
    }

    const moduleName_ = await this._promptService
      .list({
        msg: 'Select a module to add a dependency to',
        cancelled: cancelled,
        enabled: () => !moduleName && availableModules.length > 1,
        choices: () => availableModules
      });

    if (availableModules.length === 1)
      moduleName = availableModules[0];

    cancelled = cancelled || !(moduleName || moduleName_);
    moduleName = moduleName ?? moduleName_;
    const dependencyConfigPath_ = await this._promptService.input({
      msg: 'Path to the gah-config.json of the new dependency',
      enabled: () => !dependencyConfigPath,
      cancelled: cancelled,
      validator: (val: string) => {
        if (!val.endsWith('gah-config.json'))
          return false;
        return this._fileSystemService.fileExists(val);
      }
    });

    cancelled = cancelled || !(dependencyConfigPath || dependencyConfigPath_);
    dependencyConfigPath = (dependencyConfigPath ?? dependencyConfigPath_).replace(/"/g, '');

    this._configService.readExternalConfig(dependencyConfigPath);

    const availableExternalModules = this._configService.externalConfig.modules.map(x => x.name);
    if (dependencyModuleNames && dependencyModuleNames.length > 0) {
      const invalidModule = dependencyModuleNames.find(x => !availableExternalModules.includes(x));
      if (invalidModule)
        throw new Error('Cannot find the module ' + invalidModule);
    }
    if (availableExternalModules.length === 1)
      dependencyModuleNames = availableExternalModules;

    const dependencyModuleNames_ = await this._promptService.checkbox({
      msg: 'Which of the modules do you want to add as a reference',
      choices: () => availableExternalModules,
      enabled: () => !dependencyModuleNames || dependencyModuleNames.length === 0,
      cancelled: cancelled
    });

    if (!dependencyModuleNames || dependencyModuleNames.length === 0)
      dependencyModuleNames = dependencyModuleNames_;

    const module = this._configService.getGahConfig().modules.find(x => x.name === moduleName);
    if (!module)
      throw new Error('Module \'' + moduleName + '\' could not be found');

    const newDep = new ModuleReference();

    newDep.path = this._configService.externalConfigPath;

    const selectedModules = this._configService.externalConfig.modules.filter(x => dependencyModuleNames!.includes(x.name));

    if (!selectedModules || selectedModules.length !== dependencyModuleNames.length)
      throw new Error('Some dependencies could not be found');

    newDep.names = selectedModules.map(x => x.name);

    if (!module.dependencies)
      module.dependencies = new Array<ModuleReference>();

    module.dependencies.push(newDep);

    this._configService.saveGahConfig();
    this._loggerService.success('Dependency added successfully.');
  }
}
