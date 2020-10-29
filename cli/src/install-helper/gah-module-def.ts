import { GahModuleBase } from './gah-module-base';
import { GahModule, GahModuleData } from '@awdware/gah-shared';
import { GahFolder } from './gah-folder';

export class GahModuleDef extends GahModuleBase {
  constructor(gahCfgPath: string, moduleName: string, initializedModules: GahModuleBase[]) {
    super(gahCfgPath, moduleName);
    this.isHost = false;
    initializedModules.push(this);

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
            const newModuleDef = new GahModuleDef(depAbsoluteBasepath, depModuleName, initializedModules);
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

  public async install() {
    if (this.installed) {
      return;
    }
    this.installed = true;
    await this.executePreinstallScripts();
    this.tsConfigFile.clean();
    this.gahFolder.cleanDependencyDirectory();
    this.gahFolder.cleanStylesDirectory();
    this.gahFolder.cleanPrecompiledFolder();
    this.gahFolder.tryHideGahFolder();
    await this.createSymlinksToDependencies();
    await this.addDependenciesToTsConfigFile();
    this.generateStyleImports();
    this.adjustGitignore();
    await this.executePostinstallScripts();
  }

}
