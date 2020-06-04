import { IFileSystemService, ITemplateService, PackageJson, IWorkspaceService, IExecutionService, ILoggerService } from '@awdware/gah-shared';

import { FileSystemService } from '../services/file-system.service';
import { WorkspaceService } from '../services/workspace.service';
import { TemplateService } from '../services/template.service';

import { TsConfigFile } from './ts-config-file';
import { GahFolder } from './gah-folder';
import DIContainer from '../di-container';
import { LoggerService } from '../services/logger.service';
import { ExecutionService } from '../services/execution.service';

export abstract class GahModuleBase {
  protected fileSystemService: IFileSystemService;
  protected templateService: ITemplateService;
  protected workspaceService: IWorkspaceService;
  protected executionService: IExecutionService;
  protected loggerService: ILoggerService;

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

  constructor(gahCfgPath: string, moduleName: string | null) {
    this.fileSystemService = DIContainer.get(FileSystemService);
    this.workspaceService = DIContainer.get(WorkspaceService);
    this.templateService = DIContainer.get(TemplateService);
    this.executionService = DIContainer.get(ExecutionService);
    this.loggerService = DIContainer.get(LoggerService);

    this.basePath = this.fileSystemService.getDirectoryPathFromFilePath(gahCfgPath);
    this.installed = false;
    this.moduleName = moduleName;
    this.dependencies = new Array<GahModuleBase>();

    this.tsConfigFile = new TsConfigFile(this.fileSystemService.join(this.basePath, 'ts-config.json'), this.fileSystemService);
  }

  public abstract async install(): Promise<void>;


  public get allRecursiveDependencies(): GahModuleBase[] {
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
      const to = dep.srcBasePath;
      this.fileSystemService.createDirLink(to, from);
    }
  }

  protected addDependenciesToTsConfigFile() {
    for (const dep of this.allRecursiveDependencies) {
      const path = this.fileSystemService.join(this.gahFolder.dependencyPath, dep.moduleName!, 'public-api');
      const aliasName = '@gah/' + dep.moduleName! + '/*';

      this.tsConfigFile.addPathAlias(aliasName, path);
    }
    this.tsConfigFile.save();
  }

  protected mergePackageDependencies() {
    for (const dep of this.allRecursiveDependencies) {
      const packageJsonPath = this.fileSystemService.join(this.basePath, 'package.json');
      // Get package.json from host
      const packageJson = this.fileSystemService.parseFile<PackageJson>(packageJsonPath);
      // Get package.json from module to installed into host
      const externalPackageJson = this.fileSystemService.parseFile<PackageJson>(this.fileSystemService.join(dep.basePath, 'package.json'));

      // Getting (dev-)dependency objects from host and module
      const hostDeps = packageJson.dependencies!;
      const hostDevDeps = packageJson.devDependencies!;
      const externalDeps = externalPackageJson.dependencies!;
      const externalDevDeps = externalPackageJson.devDependencies!;

      const deps = Object.keys(externalDeps);
      const devDeps = Object.keys(externalDevDeps);

      // Merging module (dev-)dependencies into host
      deps.forEach((dep) => {
        if (!hostDeps[dep]) {
          hostDeps[dep] = externalDeps[dep];
        }
      });
      devDeps.forEach((dep) => {
        if (!hostDevDeps[dep]) {
          hostDevDeps[dep] = externalDevDeps[dep];
        }
      });

      // Saving the file back into the host package.json
      this.fileSystemService.saveObjectToFile(packageJsonPath, packageJson);
    }
  }

  protected generateStyleImports() {
    for (const dep of this.dependencies) {

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
        this.fileSystemService.saveFile(this.fileSystemService.join(this.gahFolder.stylesPath, dep.moduleName! + '.scss'), fileContent);
      }
    }
  }

  protected adjustGitignore() {
    this.workspaceService.ensureGitIgnoreLine('**/.gah/**', 'Ignoring gah generated files', this.basePath);
  }
}
