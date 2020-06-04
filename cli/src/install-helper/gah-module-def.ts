import { GahModuleBase } from './gah-module-base';
import { GahModule } from '@awdware/gah-shared';
import { GahFolder } from './gah-folder';

export class GahModuleDef extends GahModuleBase {

  constructor(gahCfgPath: string, moduleName: string | null) {
    super(gahCfgPath, moduleName);

    const moduleCfg = this.fileSystemService.parseFile<GahModule>(gahCfgPath).modules.find(x => x.name === moduleName);
    if (!moduleCfg) {
      throw new Error('Cannot find module with name "' + moduleName + '" in file "' + gahCfgPath + '"');
    }
    this.srcBasePath = this.fileSystemService.getDirectoryPathFromFilePath(moduleCfg.publicApiPath);

    this.moduleName = moduleName;
    this.dependencies = new Array<GahModuleBase>();
    this.facadePathRelativeToBasePath = moduleCfg.facadePath;
    this.publicApiPathRelativeToBasePath = moduleCfg.publicApiPath;
    this.baseNgModuleName = moduleCfg.baseNgModuleName;
    this.isEntry = moduleCfg.isEntry || false;
    moduleCfg.dependencies?.forEach(moduleDependency => {
      moduleDependency.names.forEach(moduleName => {
        this.dependencies.push(new GahModuleDef(moduleDependency.path, moduleName));
      });
    });

    this.gahFolder = new GahFolder(this.basePath, this.srcBasePath);
  }

  public async install() {
    if (this.installed) {
      return;
    }
    this.installed = true;

    this.gahFolder.cleanDependencyDirectory();
    this.gahFolder.cleanStylesDirectory();

    this.createSymlinksToDependencies();
    this.addDependenciesToTsConfigFile();
    this.mergePackageDependencies();
    this.generateStyleImports();
    this.adjustGitignore();
  }

}
