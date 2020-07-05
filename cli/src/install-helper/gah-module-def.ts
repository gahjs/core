import { GahModuleBase } from './gah-module-base';
import { GahModule, GahModuleData } from '@awdware/gah-shared';
import { GahFolder } from './gah-folder';

export class GahModuleDef extends GahModuleBase {

  constructor(gahCfgPath: string, moduleName: string, initializedModules: GahModuleBase[]) {
    super(gahCfgPath, moduleName);
    this.isHost = false;
    initializedModules.push(this);

    const moduleCfg = this.fileSystemService.parseFile<GahModule>(gahCfgPath).modules.find(x => x.name === moduleName);
    if (!moduleCfg) {
      throw new Error(`Cannot find module with name "${moduleName}" in file "${gahCfgPath}"`);
    }
    this.basePath = this.fileSystemService.ensureAbsolutePath(this.fileSystemService.getDirectoryPathFromFilePath(gahCfgPath));
    this.srcBasePath = this.fileSystemService.getDirectoryPathFromFilePath(moduleCfg.publicApiPath);
    this.initTsConfigObject();
    this.moduleName = moduleName;
    this.dependencies = new Array<GahModuleBase>();
    this.packageName = moduleCfg.packageName;
    this.facadePathRelativeToBasePath = moduleCfg.facadePath;
    this.publicApiPathRelativeToBasePath = moduleCfg.publicApiPath;
    this.baseNgModuleName = moduleCfg.baseNgModuleName;
    this.isEntry = moduleCfg.isEntry || false;
    moduleCfg.dependencies?.forEach(moduleDependency => {
      moduleDependency.names.forEach(depModuleName => {
        const depAbsoluteBasepath = this.fileSystemService.join(this.basePath, moduleDependency.path);
        const alreadyInitialized = initializedModules.find(x => x.moduleName === depModuleName);
        if (alreadyInitialized) {
          this.dependencies.push(alreadyInitialized);
        } else {
          this.dependencies.push(new GahModuleDef(depAbsoluteBasepath, depModuleName, initializedModules));
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
    this.tsConfigFile.clean();
    this.gahFolder.cleanDependencyDirectory();
    this.gahFolder.cleanStylesDirectory();
    this.gahFolder.tryHideGahFolder();
    this.createSymlinksToDependencies();
    this.addDependenciesToTsConfigFile();
    this.generateStyleImports();
    this.adjustGitignore();
  }

}
