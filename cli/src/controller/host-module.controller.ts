import { injectable } from 'inversify';

import { ModuleReference, GahHost } from '@awdware/gah-shared';

import { Controller } from './controller';
import { ModuleReferenceHelper } from '../helper/module-reference-helper';

@injectable()
export class HostModuleController extends Controller {

  public async remove(args: string[]): Promise<void> {
    throw new Error('Not yet implemented\n' + args);
  }

  public async add(dependencyConfigPath?: string, dependencyModuleNames?: string[]): Promise<void> {
    let cancelled = false;
    const cfg = this._configService.getGahHost();

    this._loggerService.log('Adding new dependency to host');

    const dependencyConfigPath_ = await ModuleReferenceHelper.askForGahModuleJson(this._promptService, this._fileSystemService, cancelled, dependencyConfigPath);

    cancelled = cancelled || !(dependencyConfigPath || dependencyConfigPath_);
    dependencyConfigPath = (dependencyConfigPath ?? dependencyConfigPath_).replace(/"/g, '');

    this._configService.readExternalConfig(dependencyConfigPath);

    const dependencyModuleNames_ = await ModuleReferenceHelper.askForModulesToAdd(this._configService, this._promptService, cancelled, dependencyModuleNames);

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
