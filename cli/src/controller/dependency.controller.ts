import { ModuleReference, GahModuleType } from '@gah/shared';

import { Controller } from './controller';
import { ModuleReferenceHelper } from '../helper/module-reference-helper';

export class DependencyController extends Controller {

  public async remove(): Promise<void> {

    if (await this._configService.getGahModuleType() === GahModuleType.HOST) {
      this._loggerService.error('This command is unavailable for hosts');
      this._loggerService.error('Please use the "reference" command instead');
      return;
    }

    const msgModule = 'Select a module you want to remove a dependency from';
    const moduleName = await ModuleReferenceHelper.askForModule(this._configService, this._promptService, this._loggerService, false, msgModule);
    if (!moduleName) {
      this._loggerService.warn('No module selected.');
      return;
    }

    const dependencyNames = await ModuleReferenceHelper.askForModuleDependencies(this._configService, this._promptService, this._loggerService, false, moduleName);

    if (!dependencyNames || dependencyNames.length === 0) {
      this._loggerService.warn('No dependency selected.');
      return;
    }

    for (const depName of dependencyNames) {
      const mod = (await this._configService.getGahModule()).modules.find(x => x.name === moduleName);
      const idx = mod?.dependencies?.findIndex(x => x.names.some(y => y === depName))!;
      const dep = mod?.dependencies?.[idx]!;
      if (dep.names.length > 1) {
        const depIdx = dep?.names.findIndex(x => x === depName)!;
        dep?.names.splice(depIdx, 1);
      } else {
        mod?.dependencies?.splice(idx, 1);
      }
    }

    await this._configService.saveGahModuleConfig();

    this._loggerService.success(`${dependencyNames.length === 1 ? 'Depdendency' : 'Dependencies'} ${dependencyNames.join(', ')} removed successfully`);
  }

  public async add(): Promise<void> {
    if (await this._configService.getGahModuleType() === GahModuleType.HOST) {
      this._loggerService.error('This command is unavailable for hosts');
      this._loggerService.error('Please use the "reference" command instead');
      return;
    }
    this._loggerService.log('Adding new dependency to module');

    const msgModule = 'Select a module you want to add a dependency to';
    const moduleName = await ModuleReferenceHelper.askForModule(this._configService, this._promptService, this._loggerService, false, msgModule);
    if (!moduleName) {
      this._loggerService.error('No module selected.');
      return;
    }

    const msgFilePath = 'Path to the gah-module.json of the new dependency';
    const dependencyConfigPath = await ModuleReferenceHelper.askForGahModuleJson(this._promptService, this._fileSystemService, this._loggerService, msgFilePath);
    if (!dependencyConfigPath) {
      this._loggerService.warn('No dependency selected.');
      return;
    }
    await this._configService.readExternalConfig(dependencyConfigPath);

    const dependencyModuleNames = await ModuleReferenceHelper.askForModulesToAdd(this._configService, this._promptService);

    const module = (await this._configService.getGahModule()).modules.find(x => x.name === moduleName);
    if (!module) { throw new Error(`Module '${moduleName}' could not be found`); }

    const newDep = new ModuleReference();

    newDep.path = this._configService.externalConfigPath;

    const selectedModules = this._configService.externalConfig.modules.filter(x => dependencyModuleNames!.includes(x.name));

    if (!selectedModules || selectedModules.length !== dependencyModuleNames.length) {
      throw new Error('Some dependencies could not be found');
    }

    newDep.names = selectedModules.map(x => x.name);

    module.dependencies ??= new Array<ModuleReference>();
    module.dependencies.push(newDep);

    await this._configService.saveGahModuleConfig();
    this._loggerService.success('Dependency added successfully.');
  }
}
