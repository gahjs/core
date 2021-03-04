import { ModuleDefinition, GahModule, PackageJson } from '@gah/shared';
import { Controller } from './controller';

export class InitController extends Controller {
  private nameExists: boolean;
  public async init(isHost?: boolean, isEntry?: boolean) {
    this.nameExists = false;

    if (isEntry && isHost) {
      throw new Error('A module cannot be declared as host and entry module');
    }

    const { alreadyInitialized, overwriteHost } = await this.askForOverwrite(isHost);
    if ((isHost ?? false) && alreadyInitialized && !overwriteHost) {
      return;
    }

    if (!isHost) {
      const packageJson = await this.getPackageJson();

      const newModuleName = await this.askModuleName(isHost, packageJson);
      if (!newModuleName && !isHost) {
        this._loggerService.warn('No module name provided...');
        return;
      }

      const packageName = await this.askPackageName(packageJson, isHost);
      if (!packageName && !isHost) {
        this._loggerService.warn('No package name provided...');
        return;
      }

      const overwrite = await this.askForModuleOverwrite(newModuleName, packageName);
      if (this.nameExists && !overwrite) {
        return;
      }

      const assetsFolderPath = await this.askForAssetsFolderPath(isHost);
      const stylesFolderPath = await this.askForGlobalStylesPath(isHost);

      const publicApiPath = await this.askForPublicApiPath(isHost);

      if (!publicApiPath) {
        this._loggerService.warn('No public-api path provided...');
        return;
      }

      const baseModuleName = await this.askBaseModuleName();

      this.doInitModule(
        newModuleName,
        assetsFolderPath,
        stylesFolderPath,
        packageName,
        publicApiPath,
        baseModuleName,
        isEntry ?? false,
        overwrite
      );
    } else {
      this.doInitHost();
    }
  }

  private async doInitModule(
    newModuleName: string,
    assetsFolderPath: string,
    stylesFilePath: string,
    packageName: string,
    publicApiPath: string,
    baseModuleName: string,
    isEntry: boolean,
    overwrite: boolean
  ) {
    const newModule = new ModuleDefinition();

    newModule.name = newModuleName;

    const gahCfg = await this._configService.getGahModule();
    if (assetsFolderPath) {
      newModule.assetsPath = await this._fileSystemService.ensureRelativePath(assetsFolderPath);
    }
    if (stylesFilePath) {
      newModule.stylesPath = await this._fileSystemService.ensureRelativePath(stylesFilePath);
    }
    newModule.packageName = packageName;
    newModule.publicApiPath = await this._fileSystemService.ensureRelativePath(publicApiPath);
    newModule.baseNgModuleName = baseModuleName;
    newModule.isEntry = isEntry;
    if (overwrite) {
      const idx = gahCfg.modules.findIndex(x => x.name === newModule.name);
      gahCfg.modules[idx] = newModule;
    } else {
      gahCfg.modules.push(newModule);
    }

    await this._configService.saveGahModuleConfig();
  }

  private async doInitHost() {
    if (await this._configService.gahConfigExists()) {
      await this._configService.deleteGahConfig();
    }
    await this._configService.getGahHost(true);

    await this._configService.saveGahModuleConfig();
  }

  private async askBaseModuleName() {
    const guessedName = await this.tryGuessbaseModuleName();
    return this._promptService.input({
      msg: 'Enter the class name of the base NgModule for this GahModule (empty if there is none)',
      enabled: () => true,
      default: guessedName
    });
  }

  private async getPackageJson() {
    const packageJson = await this._fileSystemService.tryReadFile('package.json');
    if (packageJson) {
      return JSON.parse(packageJson) as PackageJson;
    }
    return undefined;
  }

  private async askForPublicApiPath(isHost: boolean | undefined) {
    let defaultPublicApiPath =
      (await this._fileSystemService.getFilesFromGlob('**/public-api.ts', ['.gah', 'dist']))?.[0] ??
      (await this._fileSystemService.getFilesFromGlob('**/index.ts', ['.gah', 'dist']))?.[0];

    if (process.platform === 'win32' && defaultPublicApiPath) {
      defaultPublicApiPath = defaultPublicApiPath.replace(/\//g, '\\');
    }

    const publicApiPath = await this._promptService.fuzzyPath({
      msg: 'Enter the path to the public-api file (public-api.ts / index.ts / ...)',
      enabled: () => !isHost,
      itemType: 'file',
      exclude: val => !val.endsWith('.ts') || val.endsWith('.d.ts'),
      excludePattern: ['.gah'],
      default: defaultPublicApiPath
    });
    return publicApiPath;
  }

  private async askForAssetsFolderPath(isHost: boolean | undefined) {
    const defaultAssetsFolder = (await this._fileSystemService.getFilesFromGlob('**/assets', ['.gah', 'dist']))?.[0];

    const assetsFolderPath = await this._promptService.fuzzyPath({
      msg: 'Enter the path to the assets folder. Leave empty for none',
      itemType: 'directory',
      excludePattern: ['.gah', 'dist'],
      default: defaultAssetsFolder,
      enabled: () => !isHost,
      optional: true
    });
    return assetsFolderPath;
  }

  private async askForGlobalStylesPath(isHost: boolean | undefined) {
    let defaultStylesPath: string | null = null;
    defaultStylesPath = (await this._fileSystemService.getFilesFromGlob('**/styles.scss', ['.gah', 'dist']))?.[0];
    defaultStylesPath ??= (await this._fileSystemService.getFilesFromGlob('**/index.scss', ['.gah', 'dist']))?.[0];

    if (process.platform === 'win32') {
      defaultStylesPath = defaultStylesPath?.replace(/\//g, '\\');
    }

    const stylesFilePath = await this._promptService.fuzzyPath({
      msg: 'Enter the path to the global styles file. Leave empty for none',
      enabled: () => !isHost,
      itemType: 'file',
      excludePattern: ['.gah', 'dist'],
      exclude: val => !val.endsWith('.scss'),
      default: defaultStylesPath,
      optional: true
    });
    return stylesFilePath;
  }

  private async askForModuleOverwrite(newModuleName: string, packageName: string) {
    const module = await this._configService.getGahModule();
    return this._promptService.confirm({
      msg: 'A module with this name has already been added to this workspace, do you want to overwrite it?',
      enabled: () => {
        this.doesNameAndPackageExist(module, newModuleName, packageName);
        return this.nameExists;
      }
    });
  }

  private async askPackageName(packageJson?: PackageJson, isHost?: boolean) {
    let guessedPackageName = '';
    if (packageJson?.name) {
      const pkgName = packageJson.name.match(/@([\w-]+)\//)?.[1].toLocaleLowerCase();
      if (pkgName) {
        guessedPackageName = pkgName;
      }
    }

    const packageName = await this._promptService.input({
      msg: 'Enter the name of the package prefix of this module',
      enabled: () => !isHost,
      default: guessedPackageName || null
    });
    return packageName;
  }

  private async askModuleName(isHost?: boolean, packageJson?: PackageJson) {
    let guessedModuleName: string = '';
    if (packageJson?.name) {
      const pkgName = packageJson.name
        .match(/(@[\w-]+\/)?([\w/\-.]+)/)?.[2]
        ?.replace(/\//, '-')
        .toLocaleLowerCase();
      if (pkgName) {
        guessedModuleName = pkgName;
      }
    }

    const newModuleName = await this._promptService.input({
      msg: `Enter a unique name for this ${isHost ? 'host' : 'module'}`,
      enabled: () => !isHost,
      default: guessedModuleName
    });
    return newModuleName;
  }

  private async askForOverwrite(isHost: boolean | undefined) {
    const alreadyInitialized = await this._configService.gahConfigExists();

    const overwriteHost = await this._promptService.confirm({
      msg:
        'This folder already contains a GAH configuration. A host has to be in its own workspace. Do you want to overwrite the existing configuration for this workspace?',
      enabled: () => {
        return (isHost ?? false) && alreadyInitialized;
      }
    });
    return { alreadyInitialized, overwriteHost };
  }

  private doesNameAndPackageExist(cfg: GahModule, newName: string, packageName: string) {
    this.nameExists = cfg.modules.some(x => x.name === newName && x.packageName === packageName);
    return this.nameExists;
  }

  private async tryGuessbaseModuleName(): Promise<string | undefined> {
    const possibleModuleFiles = await this._fileSystemService.getFilesFromGlob('projects/**/src/lib/!(*routing*).module.ts');
    if (!possibleModuleFiles || possibleModuleFiles.length === 0) {
      return undefined;
    }

    const firtsPossibleModuleContent = await this._fileSystemService.readFile(possibleModuleFiles[0]);
    const match = firtsPossibleModuleContent.match(/export class (\S+) {/);
    return match?.[1];
  }
}
