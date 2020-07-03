import { injectable } from 'inversify';

import { ModuleDefinition, GahHost, GahModule, PackageJson } from '@awdware/gah-shared';
import { Controller } from './controller';
import path from 'path';
import { paramCase } from 'change-case';

@injectable()
export class InitController extends Controller {
  private nameExists: boolean;
  public async init(isHost?: boolean, isEntry?: boolean) {
    this.nameExists = false;

    if (isEntry && isHost) {
      throw new Error('A module cannot be declared as host and entry module');
    }

    const alreadyInitialized = this._configService.gahConfigExists();
    let canceled = false;

    const overwriteHost = await this._promptService
      .confirm({
        msg: 'This folder already contains a GAH configuration. A host has to be in its own workspace. Do you want to overwrite the existing configuration for this workspace?',
        cancelled: canceled,
        enabled: () => {
          return (isHost ?? false) && alreadyInitialized;
        }
      });
    canceled = canceled || (isHost ?? false) && alreadyInitialized && !overwriteHost;

    let guessedModuleName: string = '';
    const packageJson = this._fileSystemService.tryReadFile('package.json');
    if (packageJson) {
      const pkgJson = JSON.parse(packageJson) as PackageJson;
      if (pkgJson.name) {
        const pkgName = pkgJson.name.match(/(@[\w-]+\/)?([\w/\-.]+)/)?.[2]?.replace(/\//, '-').toLocaleLowerCase();
        if (pkgName) {
          guessedModuleName = pkgName;
        }
      }
    }
    const newModuleName = await this._promptService
      .input({
        msg: 'Enter a unique name for this ' + (isHost ? 'host' : 'module'),
        cancelled: canceled,
        enabled: () => !isHost,
        default: guessedModuleName
      });
    canceled = canceled || !newModuleName && !isHost;

    let guessedPackageName: string = '';
    if (packageJson) {
      const pkgJson = JSON.parse(packageJson) as PackageJson;
      if (pkgJson.name) {
        const pkgName = pkgJson.name.match(/@([\w-]+)\//)?.[1].toLocaleLowerCase();
        if (pkgName) {
          guessedPackageName = pkgName;
        }
      }
    }

    const packageName = await this._promptService
      .input({
        msg: 'Enter the name of the package prefix of this module',
        cancelled: canceled,
        enabled: () => !isHost,
        default: guessedPackageName || null
      });
    canceled = canceled || !packageName && !isHost;

    const overwrite = await this._promptService
      .confirm({
        msg: 'A module with this name has already been added to this workspace, do you want to overwrite it?',
        cancelled: canceled,
        enabled: () => {
          this.doesNameExist(this._configService.getGahModule(), newModuleName!);
          return this.nameExists;
        }
      });
    canceled = canceled || (this.nameExists && !overwrite);


    const hasFacadeFolderPath = await this._promptService
      .confirm({
        msg: 'Does this module contain a folder for facade files?',
        cancelled: canceled,
        enabled: () => !isHost,
      });

    let defaultFacadePath: string | null = null;
    if (hasFacadeFolderPath) {
      defaultFacadePath = this._fileSystemService.getFilesFromGlob('**/facade', ['.gah', 'dist'])?.[0];

      if (process.platform === 'win32') {
        defaultFacadePath = defaultFacadePath?.replace(/\//g, '\\');
      }
    }

    const facadeFolderPath = await this._promptService
      .fuzzyPath({
        msg: 'Enter the path to the folder containing the facade files',
        cancelled: canceled,
        enabled: () => !isHost && hasFacadeFolderPath,
        itemType: 'directory',
        excludePattern: ['.gah', 'dist'],
        default: defaultFacadePath
      });

    let defaultPublicApiPath = this._fileSystemService.getFilesFromGlob('**/public-api.ts', ['.gah', 'dist'])?.[0]
      ?? this._fileSystemService.getFilesFromGlob('**/index.ts', ['.gah', 'dist'])?.[0];

    if (process.platform === 'win32') {
      defaultPublicApiPath = defaultPublicApiPath.replace(/\//g, '\\');
    }

    const publicApiPath = await this._promptService
      .fuzzyPath({
        msg: 'Enter the path to the public-api.ts file',
        cancelled: canceled,
        enabled: () => !isHost,
        itemType: 'file',
        exclude: (val) => !val.endsWith('.ts') || val.endsWith('.d.ts'),
        excludePattern: ['.gah'],
        default: defaultPublicApiPath
      });

    canceled = canceled || (!publicApiPath && !isHost);

    const baseModuleName = await this._promptService
      .input({
        msg: 'Enter the class name of the base NgModule for this GahModule (empty if there is none)',
        cancelled: canceled,
        enabled: () => !isHost,
        default: this.tryGuessbaseModuleName()
      });

    if (canceled) {
      return;
    }

    const newModule = new ModuleDefinition();

    newModule.name = newModuleName;

    let gahCfg: GahModule | GahHost;

    if (isHost) {
      const success = this.tryCopyHostToCwd(newModule.name);
      if (!success) { return; }
      if (this._configService.gahConfigExists()) {
        this._configService.deleteGahConfig();
      }
      gahCfg = this._configService.getGahHost(true);
    } else {
      gahCfg = this._configService.getGahModule();
      if (facadeFolderPath) {
        newModule.facadePath = this._fileSystemService.ensureRelativePath(facadeFolderPath);
      }
      newModule.packageName = packageName;
      newModule.publicApiPath = this._fileSystemService.ensureRelativePath(publicApiPath);
      newModule.baseNgModuleName = baseModuleName;
      newModule.isEntry = isEntry;
      if (overwrite) {
        const idx = (gahCfg as GahModule).modules.findIndex(x => x.name === newModule.name);
        (gahCfg as GahModule).modules[idx] = newModule;
      } else {
        (gahCfg as GahModule).modules.push(newModule);
      }
    }

    this._configService.saveGahModuleConfig();
  }

  private doesNameExist(cfg: GahModule, newName: string) {
    this.nameExists = cfg.modules.some(x => x.name === newName);
    return this.nameExists;
  }

  private tryGuessbaseModuleName(): string | undefined {
    const possibleModuleFiles = this._fileSystemService.getFilesFromGlob('projects/**/src/lib/!(*routing*).module.ts');
    if (!possibleModuleFiles || possibleModuleFiles.length === 0) { return undefined; }

    const firtsPossibleModuleContent = this._fileSystemService.readFile(possibleModuleFiles[0]);
    const match = firtsPossibleModuleContent.match(/export class (\S+) {/);
    if (!match) { return undefined; }
    return match[1];
  }

  private tryCopyHostToCwd(hostName: string): boolean {
    let allFilesToCopy: string[];
    allFilesToCopy = this._fileSystemService.getFilesFromGlob(this._fileSystemService.join(__dirname, '../../assets/host-template') + '/**', undefined, true);
    const conflictingFiles = allFilesToCopy.filter(x => {
      const relativePathToAssetsFolder = this._fileSystemService.ensureRelativePath(x, this._fileSystemService.join(__dirname, '../../assets/host-template'));
      return this._fileSystemService.fileExists(relativePathToAssetsFolder);
    });
    if (conflictingFiles.length > 0) {
      this._loggerService.warn('The following paths already exist in the current working directory:');
      for (let i = 0; i < Math.min(conflictingFiles.length, 5); i++) {
        const conflictingFilePath = conflictingFiles[i];
        this._loggerService.warn(`'${path.basename(conflictingFilePath)}'`);
      }
      if (conflictingFiles.length > 5) { this._loggerService.warn(` ... And ${conflictingFiles.length - 5} more.`); }
      this._loggerService.warn('Cancelling host creation to prevent loss of data / changes.'
        + ' Either start the host initialization in a different directory or use --force to enforce overwriting the generated files.');
      return false;
    }


    this._fileSystemService.copyFilesInDirectory(this._fileSystemService.join(__dirname, '../../assets/host-template'), '.');

    // Manipulating the project-name placeholder
    const originalAngularJson = this._fileSystemService.readFile('angular.json');
    const originalPackageJson = this._fileSystemService.readFile('package.json');
    const originalIndexHtml = this._fileSystemService.readFile('src/index.html');

    const adjustedAngularJson = originalAngularJson.replace(/gah-host/g, paramCase(hostName));
    const adjustedPackageJson = originalPackageJson.replace(/gah-host/g, paramCase(hostName));
    const adjustedIndexHtml = originalIndexHtml.replace(/Generic Angular Host/g, hostName);

    this._fileSystemService.saveFile('angular.json', adjustedAngularJson);
    this._fileSystemService.saveFile('package.json', adjustedPackageJson);
    this._fileSystemService.saveFile('src/index.html', adjustedIndexHtml);

    return true;
  }
}
