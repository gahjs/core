import { GahModuleBase } from './gah-module-base';
import { GahConfig, GahModule, GahModuleData } from '@gah/shared';
import { GahFolder } from './gah-folder';
import chalk from 'chalk';

export class GahModuleDef extends GahModuleBase {
  constructor(gahCfgPath: string, moduleName: string, initializedModules: GahModuleBase[], gahConfigs: GahConfig[]) {
    super(gahCfgPath, moduleName);
    this.isHost = false;
    initializedModules.push(this);

    this.installStepCount = 8;
    this._installDescriptionText = `Installing ${chalk.green(this.moduleName)}`;

    let moduleCfgData: GahModule;
    try {
      moduleCfgData = this.fileSystemService.parseFile<GahModule>(gahCfgPath);
    } catch (error) {
      this.loggerService.error(`could not parse module file at ${gahCfgPath}`);
      throw error;
    }

    const moduleCfg = moduleCfgData.modules.find(x => x.name === moduleName);
    if (!moduleCfg) {
      throw new Error(`Cannot find module with name "${moduleName}" in file "${gahCfgPath}"`);
    }
    this.basePath = this.fileSystemService.ensureAbsolutePath(this.fileSystemService.getDirectoryPathFromFilePath(gahCfgPath));
    this.srcBasePath = this.fileSystemService.getDirectoryPathFromFilePath(moduleCfg.publicApiPath);
    this.initTsConfigObject();
    this.moduleName = moduleName;
    this.dependencies = new Array<GahModuleBase>();
    this.packageName = moduleCfg.packageName;
    this.assetsFolderRelativeToBasePaths = moduleCfg.assetsPath;
    this.stylesFilePathRelativeToBasePath = moduleCfg.stylesPath;
    this.publicApiPathRelativeToBasePath = moduleCfg.publicApiPath;
    this.baseNgModuleName = moduleCfg.baseNgModuleName;
    this.isEntry = moduleCfg.isEntry || false;
    this.parentGahModule = moduleCfg.parentGahModule;
    this.excludedPackages = moduleCfg.excludedPackages || [];
    this.aliasNames = [];

    if (moduleCfg.config) {
      gahConfigs.push(moduleCfg.config);
    }

    moduleCfg.dependencies?.forEach(moduleDependency => {
      moduleDependency.names.forEach(depModuleName => {
        const depAbsoluteBasepath = this.fileSystemService.join(this.basePath, moduleDependency.path);
        const alreadyInitialized = initializedModules.find(x => x.moduleName === depModuleName);
        if (alreadyInitialized) {
          if (moduleDependency.aliasName) {
            alreadyInitialized.addAlias(this.moduleName!, moduleDependency.aliasName);
          }
          this.dependencies.push(alreadyInitialized);
        } else {
          if (this.fileSystemService.fileExists(depAbsoluteBasepath)) {
            const newModuleDef = new GahModuleDef(depAbsoluteBasepath, depModuleName, initializedModules, gahConfigs);
            if (moduleDependency.aliasName) {
              newModuleDef.addAlias(this.moduleName!, moduleDependency.aliasName);
            }
            this.dependencies.push(newModuleDef);
          } else {
            this.loggerService.error(`Module '${depModuleName}' could not be found at '${depAbsoluteBasepath}' referenced by '${this.moduleName!}' in '${this.basePath}'`);
            process.exit(1);
          }
        }
      });
    });

    this.gahFolder = new GahFolder(this.basePath, this.srcBasePath);
  }

  public specificData(): Partial<GahModuleData> {
    return {};
  }

  public async install(skipPackageInstall: boolean) {
    if (this.installed) {
      return;
    }
    this.installed = true;
    this.prog('preinstall scripts');
    await this.executePreinstallScripts();
    this.prog('cleanup');
    this.tsConfigFile.clean();
    this.gahFolder.cleanDependencyDirectory();
    this.gahFolder.cleanStylesDirectory();
    this.gahFolder.cleanPrecompiledFolder();
    this.gahFolder.tryHideGahFolder();
    this.prog('linking dependencies');
    await this.createSymlinksToDependencies();
    this.prog('referencing dependencies');
    await this.addDependenciesToTsConfigFile();
    this.prog('adjusting configurations');
    this.adjustGitignore();
    this.prog('installing packages');
    if (!skipPackageInstall) {
      await this.installPackages();
    }
    this.prog('importing styles');
    this.generateStyleImports();
    this.prog('postinstall scripts');
    await this.executePostinstallScripts();
  }

}
