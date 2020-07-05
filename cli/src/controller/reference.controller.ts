import { injectable } from 'inversify';

import { ModuleReference, GahHost, GahModuleType } from '@awdware/gah-shared';

import { Controller } from './controller';
import { ModuleReferenceHelper } from '../helper/module-reference-helper';

@injectable()
export class ReferenceController extends Controller {

  public async remove(moduleNames?: string[]): Promise<void> {
    if (this._configService.getGahModuleType() === GahModuleType.MODULE) {
      this._loggerService.error('This command is only available for hosts');
      this._loggerService.error('Please use the "dependency" command instead');
      return;
    }

    moduleNames = await ModuleReferenceHelper.askForModuleDependencies(this._configService, this._promptService, this._loggerService, true, undefined, moduleNames);

    if (!moduleNames || moduleNames.length === 0) {
      return;
    }

    const host = this._configService.getGahHost();

    for (const modName of moduleNames) {

      const idx = host.modules.findIndex(x => x.names.some(y => y === modName))!;
      const dep = host.modules[idx];
      if (dep!.names.length! > 1) {
        const depIdx = dep?.names.findIndex(x => x === modName)!;
        dep?.names.splice(depIdx, 1);
      } else {
        host.modules.splice(idx, 1);
      }
    }

    this._configService.saveGahModuleConfig();
  }

  public async add(dependencyConfigPath?: string, dependencyModuleNames?: string[]): Promise<void> {
    if (this._configService.getGahModuleType() === GahModuleType.MODULE) {
      this._loggerService.error('This command is only available for hosts');
      this._loggerService.error('Please use the "dependency" command instead');
      return;
    }

    const cfg = this._configService.getGahHost();

    this._loggerService.log('Adding new module to host');

    const msgFilePath = 'Path to the gah-module.json of the module that should be added to the host';
    const dependencyConfigPath_ = await ModuleReferenceHelper.askForGahModuleJson(this._promptService, this._fileSystemService, msgFilePath, dependencyConfigPath);

    if (!(dependencyConfigPath || dependencyConfigPath_)) {
      this._loggerService.warn('No file path provided.');
      return;
    }
    dependencyConfigPath = (dependencyConfigPath ?? dependencyConfigPath_).replace(/"/g, '');

    this._configService.readExternalConfig(dependencyConfigPath);

    const dependencyModuleNames_ = await ModuleReferenceHelper.askForModulesToAdd(this._configService, this._promptService, dependencyModuleNames);

    if (!dependencyModuleNames || dependencyModuleNames.length === 0) { dependencyModuleNames = dependencyModuleNames_; }

    this.doAdd(dependencyModuleNames, cfg);
  }

  private doAdd(dependencyModuleNames: string[], cfg: GahHost) {
    const newDep = new ModuleReference();
    newDep.path = this._configService.externalConfigPath;
    const selectedModules = this._configService.externalConfig.modules.filter(x => dependencyModuleNames!.includes(x.name));
    if (!selectedModules || selectedModules.length !== dependencyModuleNames.length) {
      throw new Error('Some dependencies could not be found');
    }
    newDep.names = selectedModules.map(x => x.name);
    if (!cfg.modules) {
      cfg.modules = new Array<ModuleReference>();
    }
    cfg.modules.push(newDep);
    this._configService.saveGahModuleConfig();
    this._loggerService.success('Dependency added successfully.');
  }
}
