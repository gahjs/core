import { IFileSystemService } from '@awdware/gah-shared';
import { GahModuleDef } from './gah-module-def';
import { GahHostDef } from './gah-host-def';
import { TsConfigFile } from './ts-config-file';
import { GahFolder } from './gah-folder';

export abstract class GahModuleBase {
  protected fileSystemService: IFileSystemService;

  protected basePath: string;
  protected srcBasePath: string;
  protected facadePathRelativeToBasePath?: string;
  protected publicApiPathRelativeToBasePath: string;
  protected baseNgModuleName?: string;
  protected isHost: boolean;
  protected installed: boolean;
  protected isEntry: boolean;

  protected tsConfigFile: TsConfigFile;
  protected gahFolder: GahFolder;

  public dependencies: GahModuleBase[];
  public moduleName: string | null;

  constructor(gahCfgPath: string, moduleName: string | null, fileSystemService: IFileSystemService) {
    this.basePath = this.fileSystemService.getDirectoryPathFromFilePath(gahCfgPath);
    this.installed = false;
    this.fileSystemService = fileSystemService;
    this.moduleName = moduleName;
    this.dependencies = new Array<GahModuleBase>();

    this.tsConfigFile = new TsConfigFile(this.fileSystemService.join(this.basePath, 'ts-config.json'), this.fileSystemService);
  }

  public static getInstance(gahCfgPath: string, moduleName: string | null, fileSystemService: IFileSystemService) {
    if (moduleName) {
      return new GahModuleDef(gahCfgPath, moduleName, fileSystemService);
    } else {
      return new GahHostDef(gahCfgPath, fileSystemService);
    }
  }

  public abstract async install(): Promise<void>;

  protected createSymlinksToDependencies() {
    for (const dep of this.dependencies) {
      const from = this.fileSystemService.join(this.basePath, this.gahFolder.dependencyPath, dep.moduleName!);
      const to = dep.srcBasePath;
      this.fileSystemService.createDirLink(to, from);
    }
  }

  protected addDependenciesToTsConfigFile() {
    for (const dep of this.dependencies) {
      const path = this.fileSystemService.join(this.gahFolder.dependencyPath, dep.moduleName!, 'public-api');
      const aliasName = '@gah/' + dep.moduleName! + '/*';

      this.tsConfigFile.addPathAlias(aliasName, path);
    }
    this.tsConfigFile.save();
  }

  protected generateFromTemplate() {
    for (const dep of this.dependencies) {
      this.gahFolder.addGeneratedFileTemplateData(dep.moduleName!, dep.isEntry, dep.baseNgModuleName)
    }
    this.gahFolder.
  }
}
