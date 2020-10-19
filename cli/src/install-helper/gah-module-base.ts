import {
  IFileSystemService, ITemplateService, IWorkspaceService, IExecutionService, ILoggerService,
  IPluginService, GahConfig, GahModuleData, PackageJson
} from '@awdware/gah-shared';

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
  public assetsFolderRelativeTobasePaths?: string | string[];
  public stylesFilePathRelativeToBasePath?: string;
  public publicApiPathRelativeToBasePath: string;
  public baseNgModuleName?: string;
  protected isHost: boolean;
  protected installed: boolean;
  protected gahConfig: GahConfig;
  public isEntry: boolean;
  public parentGahModule?: string;
  public excludedPackages: string[];

  public tsConfigFile: TsConfigFile;
  public gahFolder: GahFolder;

  public dependencies: GahModuleBase[];
  public moduleName: string | null;
  public packageName: string | null;

  constructor(gahModulePath: string, moduleName: string | null) {
    this.fileSystemService = DIContainer.get(FileSystemService);
    this.workspaceService = DIContainer.get(WorkspaceService);
    this.templateService = DIContainer.get(TemplateService);
    this.executionService = DIContainer.get(ExecutionService);
    this.loggerService = DIContainer.get(LoggerService);
    this.pluginService = DIContainer.get(PluginService);

    this.installed = false;
    this.moduleName = moduleName;
    this.dependencies = new Array<GahModuleBase>();

    const gahCfgPath = this.fileSystemService.join(this.fileSystemService.getDirectoryPathFromFilePath(gahModulePath), 'gah-config.json');
    if (this.fileSystemService.fileExists(gahCfgPath)) {
      this.gahConfig = this.fileSystemService.parseFile<GahConfig>(gahCfgPath);
    }
  }

  public abstract specificData(): Partial<GahModuleData>;

  public data(): GahModuleData {
    const myData: GahModuleData = {
      basePath: this.basePath,
      dependencies: this.dependencies.map(x => x.data()),
      gahConfig: this.gahConfig,
      gahFolder: this.gahFolder.data(),
      installed: this.installed,
      isEntry: this.isEntry,
      isHost: this.isHost,
      publicApiPathRelativeToBasePath: this.publicApiPathRelativeToBasePath,
      srcBasePath: this.srcBasePath,
      tsConfigFile: this.tsConfigFile?.data(),
      baseNgModuleName: this.baseNgModuleName,
      assetsGlobbingPath: this.assetsFolderRelativeTobasePaths,
      stylesPathRelativeToBasePath: this.stylesFilePathRelativeToBasePath,
      moduleName: this.moduleName ?? undefined,
      packageName: this.packageName ?? undefined
    };

    const specificData = this.specificData();

    return Object.assign(myData, specificData);
  }

  protected initTsConfigObject() {
    const op1 = this.fileSystemService.join(this.basePath, 'tsconfig.base.json');
    const op2 = this.fileSystemService.join(this.basePath, 'tsconfig.json');

    if (this.fileSystemService.fileExists(op1)) {
      this.tsConfigFile = new TsConfigFile(op1, this.fileSystemService);
    } else if (this.fileSystemService.fileExists(op2)) {
      this.tsConfigFile = new TsConfigFile(op2, this.fileSystemService);
    } else {
      throw new Error('Cannot find a tsconfig.base.json or tsconfig.json');
    }
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

  protected async createSymlinksToDependencies() {
    for (const dep of this.allRecursiveDependencies) {
      const from = this.fileSystemService.join(this.basePath, this.gahFolder.dependencyPath, dep.moduleName!);
      const to = this.fileSystemService.join(dep.basePath, dep.srcBasePath);
      await this.fileSystemService.createDirLink(from, to);
    }
  }

  protected addDependenciesToTsConfigFile() {
    if (this.gahConfig?.skipTsConfigPathsAdjustments) {
      return;
    }

    for (const dep of this.allRecursiveDependencies) {

      // /public-api.ts or / Index.ts or similar. Usually without sub-folders
      const publicApiPathRelativeToBaseSrcPath = this.fileSystemService.ensureRelativePath(dep.publicApiPathRelativeToBasePath, dep.srcBasePath, true);
      const publicApiRelativePathWithoutExtention = publicApiPathRelativeToBaseSrcPath.substr(0, publicApiPathRelativeToBaseSrcPath.length - 3);

      const path = this.fileSystemService.join(this.gahFolder.dependencyPath, dep.moduleName!, publicApiRelativePathWithoutExtention);
      const aliasName = `@${dep.packageName}/${dep.moduleName!}`;

      this.tsConfigFile.addPathAlias(aliasName, path);
    }
    this.tsConfigFile.save();
  }

  protected generateStyleImports() {
    for (const dep of this.allRecursiveDependencies) {

      // Generate scss style files
      // Find all scss files in a folder called styles in the external module
      const styles = this.fileSystemService.getFilesFromGlob(`${dep.basePath}/**/styles/**/*.scss`, ['**/dist/**']);
      if (styles.length > 0) {
        // Get the path without the path to the module itself (starting at the same point as .gap-dependencies links)
        const shortPaths = styles.map((x) => this.fileSystemService.ensureRelativePath(x, this.fileSystemService.join(dep.basePath, dep.srcBasePath), true));
        // Get the path from the perspective of the .gah/styles folder
        const relativePaths = shortPaths.map((x) => this.fileSystemService.join('../dependencies', dep.moduleName!, x));

        // Generate all the imports to the found style files (pointing to .gah/dependencies)
        const fileContent = relativePaths.map((s) => `@import "${s}";`).join('\n');
        this.fileSystemService.saveFile(this.fileSystemService.join(this.basePath, this.gahFolder.stylesPath, `${dep.moduleName!}.scss`), fileContent);
      }
    }
  }

  protected adjustGitignore() {
    this.workspaceService.ensureGitIgnoreLine('**/.gah', 'Ignoring gah generated files', this.basePath);
  }

  public get packageJson(): PackageJson {
    return this.fileSystemService.parseFile<PackageJson>(this.packageJsonPath);
  }

  public get packageJsonPath(): string {
    return this.fileSystemService.join(this.basePath, 'package.json');
  }

  private async executeScripts(preinstall: boolean) {
    const scriptName = preinstall ? 'gah-preinstall' : 'gah-postinstall';
    if (this.packageJson.scripts?.[scriptName]) {

      this.loggerService.log(`Executing ${preinstall ? 'pre' : 'post'}-install script.`);

      const success = await this.executionService.execute(`yarn run ${scriptName}`, false, undefined, this.basePath);

      if (success) {
        this.loggerService.success(`Finnished ${preinstall ? 'pre' : 'post'}-install script.`);
      } else {
        this.loggerService.error(this.executionService.executionErrorResult);

        throw new Error(`Error during ${preinstall ? 'pre' : 'post'}-install script.`);
      }
    }
  }

  public async executePreinstallScripts() {
    return this.executeScripts(true);
  }

  public async executePostinstallScripts() {
    return this.executeScripts(false);
  }
}
