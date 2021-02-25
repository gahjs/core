import { GahModuleBase } from './gah-module-base';
import { GahConfig, GahModule, GahModuleData } from '@gah/shared';
import { GahFolder } from './gah-folder';
import chalk from 'chalk';
import { InstallUnit } from './install-unit';

export class GahModuleDef extends GahModuleBase {
  constructor(
    gahCfgPath: string,
    moduleName: string,
    initializedModules: GahModuleBase[],
    gahConfigs: { moduleName: string; cfg: GahConfig }[]
  ) {
    super(moduleName, gahCfgPath);
    this.isHost = false;
    initializedModules.push(this);
    this.initializedModules = initializedModules;
    this.gahConfigs = gahConfigs;
    this.moduleName = moduleName;

    this.installStepCount = 8;
    this._installDescriptionText = `Installing ${chalk.green(this.moduleName)}`;
  }

  public async init() {
    let moduleCfgData: GahModule;
    try {
      moduleCfgData = await this.fileSystemService.parseFile<GahModule>(this.gahCfgPath!);
    } catch (error) {
      this.loggerService.error(`could not parse module file at ${this.gahCfgPath}`);
      throw error;
    }

    const moduleCfg = moduleCfgData.modules.find(x => x.name === this.moduleName);
    if (!moduleCfg) {
      throw new Error(`Cannot find module with name "${this.moduleName}" in file "${this.gahCfgPath}"`);
    }
    this.basePath = this.fileSystemService.ensureAbsolutePath(
      this.fileSystemService.getDirectoryPathFromFilePath(this.gahCfgPath!)
    );
    this.srcBasePath = this.fileSystemService.getDirectoryPathFromFilePath(moduleCfg.publicApiPath);
    await this.initTsConfigObject();
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
      this.gahConfigs.push({
        cfg: moduleCfg.config,
        moduleName: this.moduleName!
      });
    }

    if (moduleCfg.dependencies) {
      for (const moduleDependency of moduleCfg.dependencies) {
        for (const depModuleName of moduleDependency.names) {
          const depAbsoluteBasepath = this.fileSystemService.join(this.basePath, moduleDependency.path);
          const alreadyInitialized = this.initializedModules.find(x => x.moduleName === depModuleName);
          if (alreadyInitialized) {
            if (moduleDependency.aliasName) {
              alreadyInitialized.addAlias(this.moduleName!, moduleDependency.aliasName);
            }
            this.dependencies.push(alreadyInitialized);
          } else {
            if (await this.fileSystemService.fileExists(depAbsoluteBasepath)) {
              const newModuleDef = new GahModuleDef(depAbsoluteBasepath, depModuleName, this.initializedModules, this.gahConfigs);
              await newModuleDef.init();
              if (moduleDependency.aliasName) {
                newModuleDef.addAlias(this.moduleName!, moduleDependency.aliasName);
              }
              this.dependencies.push(newModuleDef);
            } else {
              throw new Error(
                `Module '${depModuleName}' could not be found at '${depAbsoluteBasepath}' referenced by '${this
                  .moduleName!}' in '${this.basePath}'`
              );
            }
          }
        }
      }
    }

    this.gahFolder = new GahFolder(this.basePath, this.srcBasePath);

    await this.initBase();
  }

  public specificData(): Partial<GahModuleData> {
    return {};
  }

  public async install(skipPackageInstall: boolean) {
    if (this.installed) {
      return;
    }

    this.installed = true;

    this.addInstallUnit(
      new InstallUnit('CLEAN_TS_CONFIG', { module: await this.data() }, undefined, 'Cleaning Ts Config', () => {
        return this.tsConfigFile.clean();
      })
    );

    this.addInstallUnit(
      new InstallUnit('CLEAN_GAH_FOLDER', { module: await this.data() }, undefined, 'Cleaning gah folder', () => {
        return Promise.all([
          this.gahFolder.cleanDependencyDirectory(),
          this.gahFolder.cleanStylesDirectory(),
          this.gahFolder.cleanPrecompiledFolder(),
          this.gahFolder.tryHideGahFolder()
        ]);
      })
    );

    this.addInstallUnit(
      new InstallUnit(
        'GENERATE_SYMLINKS',
        { module: await this.data() },
        ['CLEAN_GAH_FOLDER'],
        'Cleaning and generating styles file',
        () => {
          return this.createSymlinksToDependencies();
        }
      )
    );

    this.addInstallUnit(
      new InstallUnit(
        'ADJUST_TS_CONFIG',
        {
          module: await this.data(),
          tsConfig: this.tsConfigFile.getFileContents()
        },
        ['CLEAN_TS_CONFIG'],
        'Adjusting tsconfig.json',
        () => {
          return this.addDependenciesToTsConfigFile();
        }
      )
    );

    this.addInstallUnit(
      new InstallUnit('ADJUST_GITIGNORE', { module: await this.data() }, undefined, 'Adjusting .gitignore', () => {
        return this.adjustGitignore();
      })
    );

    this.addInstallUnit(
      new InstallUnit('PRE_INSTALL_SCRIPTS', { module: await this.data() }, undefined, 'Executing preinstall scripts', () => {
        return this.executePreinstallScripts();
      })
    );

    this.addInstallUnit(
      new InstallUnit(
        'INSTALL_PACKAGES',
        { module: await this.data() },
        ['GENERATE_SYMLINKS'],
        'Installing packages',
        async () => {
          return this.installPackages(skipPackageInstall);
        }
      )
    );

    this.addInstallUnit(
      new InstallUnit(
        'GENERATE_STYLE_IMPORTS',
        { module: await this.data() },
        ['INSTALL_PACKAGES'],
        'Importing styles',
        async () => {
          return this.generateStyleImports();
        }
      )
    );

    this.addInstallUnit(
      new InstallUnit(
        'POST_INSTALL_SCRIPTS',
        { module: await this.data() },
        ['GENERATE_STYLE_IMPORTS'],
        'Executing postinstall scripts',
        async () => {
          return this.executePostinstallScripts();
        }
      )
    );

    this.addInstallUnit(
      new InstallUnit(
        'CLEAN_TEMPORARY_CHANGES',
        { module: await this.data() },
        ['POST_INSTALL_SCRIPTS'],
        'Cleaning temporary changes',
        async () => {
          return this.cleanupService.cleanJsonFileTemporaryChanges();
        }
      )
    );

    await this.doInstall();
  }
}
