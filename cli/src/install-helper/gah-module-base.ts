import { IFileSystemService, ITemplateService, IWorkspaceService, IExecutionService, ILoggerService, IPluginService } from '@awdware/gah-shared';

import { FileSystemService } from '../services/file-system.service';
import { WorkspaceService } from '../services/workspace.service';
import { TemplateService } from '../services/template.service';

import { TsConfigFile } from './ts-config-file';
import { GahFolder } from './gah-folder';
import DIContainer from '../di-container';
import { LoggerService } from '../services/logger.service';
import { ExecutionService } from '../services/execution.service';
import { GahModuleDef } from './gah-module-def';
import { PluginService } from '../services/plugin.service';

export abstract class GahModuleBase {
  protected fileSystemService: IFileSystemService;
  protected templateService: ITemplateService;
  protected workspaceService: IWorkspaceService;
  protected executionService: IExecutionService;
  protected loggerService: ILoggerService;
  protected pluginService: IPluginService;

  public basePath: string;
  public srcBasePath: string;
  public facadePathRelativeToBasePath?: string;
  public publicApiPathRelativeToBasePath: string;
  public baseNgModuleName?: string;
  protected isHost: boolean;
  protected installed: boolean;
  public isEntry: boolean;

  public tsConfigFile: TsConfigFile;
  public gahFolder: GahFolder;

  public dependencies: GahModuleBase[];
  public moduleName: string | null;
  public packageName: string | null;

  constructor(gahCfgPath: string, moduleName: string | null) {
    this.fileSystemService = DIContainer.get(FileSystemService);
    this.workspaceService = DIContainer.get(WorkspaceService);
    this.templateService = DIContainer.get(TemplateService);
    this.executionService = DIContainer.get(ExecutionService);
    this.loggerService = DIContainer.get(LoggerService);
    this.pluginService = DIContainer.get(PluginService);

    this.installed = false;
    this.moduleName = moduleName;
    this.dependencies = new Array<GahModuleBase>();
  }

  protected initTsConfigObject() {
    this.tsConfigFile = new TsConfigFile(this.fileSystemService.join(this.basePath, 'tsconfig.json'), this.fileSystemService);
  }

  public abstract async install(): Promise<void>;

  public get allRecursiveDependencies(): GahModuleDef[] {
    const allModules = new Array<GahModuleBase>();
    this.dependencies.forEach(dep => {
      this.collectAllReferencedModules(dep, allModules);
    });
    return allModules;
  }

  private collectAllReferencedModules(module: GahModuleBase, allModules: GahModuleBase[]) {
    if (allModules.indexOf(module) === -1) {
      allModules.push(module);
    }
    module.dependencies.forEach(dep => {
      this.collectAllReferencedModules(dep, allModules);
    });
  }

  protected createSymlinksToDependencies() {
    for (const dep of this.allRecursiveDependencies) {
      const from = this.fileSystemService.join(this.basePath, this.gahFolder.dependencyPath, dep.moduleName!);
      const to = this.fileSystemService.join(dep.basePath, dep.srcBasePath);
      this.fileSystemService.createDirLink(from, to);
    }
  }

  protected addDependenciesToTsConfigFile() {
    for (const dep of this.allRecursiveDependencies) {
      const path = this.fileSystemService.join(this.gahFolder.dependencyPath, dep.moduleName!, 'public-api');
      const aliasName = '@' + dep.packageName + '/' + dep.moduleName!;

      this.tsConfigFile.addPathAlias(aliasName, path);
    }
    this.tsConfigFile.save();
  }

  protected generateStyleImports() {
    for (const dep of this.allRecursiveDependencies) {

      // Generate scss style files
      // Find all scss files in a folder called styles in the external module
      const styles = this.fileSystemService.getFilesFromGlob(dep.basePath + '/**/styles/**/*.scss', ['**/dist/**']);
      if (styles.length > 0) {
        // Get the path without the path to the module itself (starting at the same point as .gap-dependencies links)
        const shortPaths = styles.map((x) => this.fileSystemService.ensureRelativePath(x, this.fileSystemService.join(dep.basePath, dep.srcBasePath), true));
        // Get the path from the perspective of the .gah/styles folder
        const relativePaths = shortPaths.map((x) => this.fileSystemService.join('../dependencies', dep.moduleName!, x));

        // Generate all the imports to the found style files (pointing to .gah/dependencies)
        const fileContent = relativePaths.map((s) => `@import "${s}";`).join('\n');
        this.fileSystemService.saveFile(this.fileSystemService.join(this.basePath, this.gahFolder.stylesPath, dep.moduleName! + '.scss'), fileContent);
      }
    }
  }

  protected adjustGitignore() {
    this.workspaceService.ensureGitIgnoreLine('**/.gah', 'Ignoring gah generated files', this.basePath);
  }
}
