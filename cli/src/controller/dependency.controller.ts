import { injectable } from 'inversify';

import { ModuleReference, GahModuleType } from '@awdware/gah-shared';

import { Controller } from './controller';
import { ModuleReferenceHelper } from '../helper/module-reference-helper';

@injectable()
export class DependencyController extends Controller {

  public async remove(dependencyNames?: string[], moduleName?: string): Promise<void> {

    if (this._configService.getGahModuleType() === GahModuleType.HOST) {
      this._loggerService.error('This command is unavailable for hosts');
      this._loggerService.error('Please use the "reference" command instead');
      return;
    }

    const msgModule = 'Select a module you want to remove a dependency from';
    moduleName = await ModuleReferenceHelper.askForModule(this._configService, this._promptService, this._loggerService, false, msgModule, moduleName);
    if (!moduleName) {
      return;
    }

    dependencyNames = await ModuleReferenceHelper.askForModuleDependencies(this._configService, this._promptService, this._loggerService, false, moduleName, dependencyNames);

    if (!dependencyNames || dependencyNames.length === 0) {
      return;
    }

    for (const depName of dependencyNames) {
      const mod = this._configService.getGahModule().modules.find(x => x.name === moduleName);
      const idx = mod?.dependencies?.findIndex(x => x.names.some(y => y === depName))!;
      const dep = mod?.dependencies?.[idx]!;
      if (dep.names.length > 1) {
        const depIdx = dep?.names.findIndex(x => x === depName)!;
        dep?.names.splice(depIdx, 1);
      } else {
        mod?.dependencies?.splice(idx, 1);
      }
    }

    this._configService.saveGahModuleConfig();
  }

  public async add(moduleName?: string, dependencyConfigPath?: string, dependencyModuleNames?: string[]): Promise<void> {
    if (this._configService.getGahModuleType() === GahModuleType.HOST) {
      this._loggerService.error('This command is unavailable for hosts');
      this._loggerService.error('Please use the "reference" command instead');
      return;
    }

    this._loggerService.log('Adding new dependency to module');

    const msgFilePath = 'Path to the gah-module.json of the new dependency';
    const dependencyConfigPath_ = await ModuleReferenceHelper.askForGahModuleJson(this._promptService, this._fileSystemService, msgFilePath, dependencyConfigPath);

    if (!(dependencyConfigPath || dependencyConfigPath_)) {
      this._loggerService.warn('No file provided...');
      return;
    }
    dependencyConfigPath = (dependencyConfigPath ?? dependencyConfigPath_).replace(/"/g, '');

    this._configService.readExternalConfig(dependencyConfigPath);

    dependencyModuleNames = await ModuleReferenceHelper.askForModulesToAdd(this._configService, this._promptService, dependencyModuleNames);

    const module = this._configService.getGahModule().modules.find(x => x.name === moduleName);
    if (!module) { throw new Error('Module \'' + moduleName + '\' could not be found'); }

    const newDep = new ModuleReference();

    newDep.path = this._configService.externalConfigPath;

    const selectedModules = this._configService.externalConfig.modules.filter(x => dependencyModuleNames!.includes(x.name));

    if (!selectedModules || selectedModules.length !== dependencyModuleNames.length) {
      throw new Error('Some dependencies could not be found');
    }

    newDep.names = selectedModules.map(x => x.name);

    if (!module.dependencies) {
      module.dependencies = new Array<ModuleReference>();
    }

    module.dependencies.push(newDep);

    this._configService.saveGahModuleConfig();
    this._loggerService.success('Dependency added successfully.');
  }
}
