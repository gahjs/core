import { injectable } from 'inversify';

import { ModuleDefinition, GahConfig } from '@awdware/gah-shared';
import { Controller } from './controller';


@injectable()
export class InitController extends Controller {
  private nameExists: boolean;
  public async init(isHost: boolean, isEntry: boolean) {
    this.nameExists = false;

    if (isEntry && isHost) {
      throw new Error('A module cannot be declared as host and entry module');
    }

    const alreadyInitialized = this._configService.gahConfigExists();
    let canceled = false;
    let newModuleName: string;
    let facadeFolderPath: string;
    let publicApiPath: string;
    let baseModuleName: string | undefined = undefined;

    const overwriteHost = await this._promptService
      .confirm({
        msg: 'This folder already contains a GAH configuration. A host has to be in its own workspace. Do you want to overwrite the existing configuration for this workspace?',
        cancelled: canceled,
        enabled: () => {
          return isHost && alreadyInitialized;
        }
      });
    canceled = canceled || isHost && alreadyInitialized && !overwriteHost;

    const moduleName = await this._promptService
      .input({
        msg: 'Enter a unique name for this ' + (isHost ? 'host' : 'module'),
        cancelled: canceled,
        enabled: () => !newModuleName,
        default: this._fileSystemService.getCwdName()
      });
    canceled = canceled || !moduleName;
    newModuleName = moduleName;

    const overwrite = await this._promptService
      .confirm({
        msg: 'A module with this name has already been added to this workspace, do you want to overwrite it?',
        cancelled: canceled,
        enabled: () => {
          this.doesNameExist(this._configService.getGahConfig(), newModuleName);
          return this.nameExists;
        }
      });
    canceled = canceled || (this.nameExists && !overwrite);

    const facadeFolderPath_ = await this._promptService
      .fuzzyPath({
        msg: 'Enter the path to the folder containing the public facade files',
        cancelled: canceled,
        enabled: () => !isHost,
        itemType: 'directory',
        excludePath: (val) => val.includes('.gah'),
      });

    canceled = canceled || (!facadeFolderPath_ && !isHost);
    facadeFolderPath = facadeFolderPath_;

    const publicApiPath_ = await this._promptService
      .fuzzyPath({
        msg: 'Enter the path to the public-api.ts file',
        cancelled: canceled,
        enabled: () => !isHost && !publicApiPath,
        itemType: 'file',
        excludePath: (val) => !val.endsWith('public-api.ts') || val.includes('.gah'),
      });

    canceled = canceled || (!publicApiPath_ && !isHost);
    publicApiPath = publicApiPath_;

    const baseModuleName_ = await this._promptService
      .input({
        msg: 'Enter the class name of the base NgModule for this GahModule (empty if there is none)',
        cancelled: canceled,
        enabled: () => !isHost && !baseModuleName,
        default: this.tryGuessbaseModuleName()
      });

    baseModuleName = baseModuleName_;

    if (canceled) {
      return;
    }

    const newModule = new ModuleDefinition();

    newModule.name = newModuleName;

    let gahCfg: GahConfig;

    if (isHost) {
      if (this._configService.gahConfigExists()) {
        this._configService.deleteGahConfig();
      }
      gahCfg = this._configService.getGahConfig(true, true);
    } else {
      gahCfg = this._configService.getGahConfig();
      newModule.facadePath = this._fileSystemService.ensureRelativePath(facadeFolderPath);
      newModule.publicApiPath = this._fileSystemService.ensureRelativePath(publicApiPath);
      newModule.baseNgModuleName = baseModuleName;
      newModule.isEntry = isEntry;
    }

    gahCfg.modules.push(newModule);

    this._configService.saveGahConfig();
  }

  private doesNameExist(cfg: GahConfig, newName: string) {
    this.nameExists = cfg.modules.some(x => x.name === newName);
    return this.nameExists;
  }

  private tryGuessbaseModuleName(): string | undefined {
    const possibleModuleFiles = this._fileSystemService.getFilesFromGlob('projects/**/src/lib/!(*routing*).module.ts');
    if (!possibleModuleFiles || possibleModuleFiles.length === 0)
      return undefined;

    const firtsPossibleModuleContent = this._fileSystemService.readFile(possibleModuleFiles[0]);
    const match = firtsPossibleModuleContent.match(/export class (\S+) {/);
    if (!match)
      return undefined;
    return match[1];
  }
}
