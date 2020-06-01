import { injectable } from 'inversify';

import { ModuleReference } from '@awdware/gah-shared';

import { Controller } from './controller';

@injectable()
export class HostModuleController extends Controller {

  public async remove(args: string[]): Promise<void> {
    throw new Error('Not yet implemented\n' + args);
  }

  public async add(dependencyConfigPath?: string, dependencyModuleNames?: string[]): Promise<void> {
    let cancelled = false;
    const cfg = this._configService.getGahHost();

    this._loggerService.log('Adding new dependency to host');

    const dependencyConfigPath_ = await this._promptService.input({
      msg: 'Path to the gah-module.json of the new dependency',
      enabled: () => !dependencyConfigPath,
      cancelled: cancelled,
      validator: (val: string) => {
        if (!val.endsWith('gah-module.json'))
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

    const newDep = new ModuleReference();
    newDep.path = this._configService.externalConfigPath;
    const selectedModules = this._configService.externalConfig.modules.filter(x => dependencyModuleNames!.includes(x.name));

    if (!selectedModules || selectedModules.length !== dependencyModuleNames.length)
      throw new Error('Some dependencies could not be found');

    newDep.names = selectedModules.map(x => x.name);


    if (!cfg.modules)
      cfg.modules = new Array<ModuleReference>();

    cfg.modules.push(newDep);

    this._configService.saveGahModuleConfig();
    this._loggerService.success('Dependency added successfully.');
  }
}
