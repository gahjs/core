import DIContainer from '../di-container';
import {
  IFileSystemService, ITemplateService, IWorkspaceService, IExecutionService, ILoggerService,
  IPluginService, GahConfig, GahModuleData, PackageJson, IContextService, IPackageService, ICleanupService
} from '@awdware/gah-shared';

import { FileSystemService } from '../services/file-system.service';
import { WorkspaceService } from '../services/workspace.service';
import { TemplateService } from '../services/template.service';

import { TsConfigFile } from './ts-config-file';
import { GahFolder } from './gah-folder';
import { LoggerService } from '../services/logger.service';
import { ExecutionService } from '../services/execution.service';
import { GahModuleDef } from './gah-module-def';
import { PluginService } from '../services/plugin.service';
import { ContextService } from '../services/context-service';
import { ConfigService } from '../services/config.service';
import { PackageService } from '../services/package.service';
import { CleanupSevice } from '../services/cleanup.service';

export abstract class GahModuleBase {
  protected cleanupService: ICleanupService;
  protected fileSystemService: IFileSystemService;
  protected templateService: ITemplateService;
  protected workspaceService: IWorkspaceService;
  protected executionService: IExecutionService;
  protected loggerService: ILoggerService;
  protected packageService: IPackageService;
  protected pluginService: IPluginService;
  protected contextService: IContextService;
  protected cfgService: ConfigService;

  public basePath: string;
  public srcBasePath: string;
  public assetsFolderRelativeToBasePaths?: string | string[];
  public stylesFilePathRelativeToBasePath?: string;
  public publicApiPathRelativeToBasePath: string;
  public baseNgModuleName?: string;
  public isHost: boolean;
  protected installed: boolean;
  protected gahConfig: GahConfig;
  public isEntry: boolean;
  public parentGahModule?: string;
  public excludedPackages: string[];
  public aliasNames: { forModule: string, alias: string }[];
  public preCompiled: boolean;

  public tsConfigFile: TsConfigFile;
  public gahFolder: GahFolder;

  public dependencies: GahModuleBase[];
  public moduleName: string | null;
  public packageName: string | null;
  private _packageJson: PackageJson;

  constructor(gahModulePath: string, moduleName: string | null) {
    this.cleanupService = DIContainer.get(CleanupSevice);
    this.fileSystemService = DIContainer.get(FileSystemService);
    this.workspaceService = DIContainer.get(WorkspaceService);
    this.templateService = DIContainer.get(TemplateService);
    this.executionService = DIContainer.get(ExecutionService);
    this.loggerService = DIContainer.get(LoggerService);
    this.packageService = DIContainer.get(PackageService);
    this.pluginService = DIContainer.get(PluginService);
    this.contextService = DIContainer.get(ContextService);
    this.cfgService = DIContainer.get(ConfigService);

    this.installed = false;
    this.moduleName = moduleName;
    this.dependencies = new Array<GahModuleBase>();

    this.preCompiled = this.cfgService.localConfig()?.precompiled?.some(x => x.name === moduleName) ?? false;

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
      assetsGlobbingPath: this.assetsFolderRelativeToBasePaths,
      stylesPathRelativeToBasePath: this.stylesFilePathRelativeToBasePath,
      moduleName: this.moduleName ?? undefined,
      packageName: this.packageName ?? undefined,
      packageJson: this.packageJson
    };

    const specificData = this.specificData();

    return Object.assign(myData, specificData);
  }

  public addAlias(forModule: string, alias: string) {
    if (!this.aliasNames.some(x => x.forModule === forModule && x.alias === alias)) {
      this.aliasNames.push({ forModule, alias });
    }
  }

  protected initTsConfigObject() {
    const op1 = this.fileSystemService.join(this.basePath, 'tsconfig.base.json');
    const op2 = this.fileSystemService.join(this.basePath, 'tsconfig.json');

    if (this.fileSystemService.fileExists(op1)) {
      this.tsConfigFile = new TsConfigFile(op1, this.fileSystemService, this.cleanupService);
    } else if (this.fileSystemService.fileExists(op2)) {
      this.tsConfigFile = new TsConfigFile(op2, this.fileSystemService, this.cleanupService);
    } else {
      throw new Error('Cannot find a tsconfig.base.json or tsconfig.json');
    }
  }

  public abstract async install(): Promise<void>;

  public get fullName(): string {
    return this.packageName ? `@${this.packageName}/${this.moduleName}` : this.moduleName!;
  }

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
    if (this.preCompiled) {
      return;
    }
    for (const dep of this.allRecursiveDependencies) {
      if (dep.preCompiled) {
        continue;
      }
      const from = this.fileSystemService.join(this.basePath, this.gahFolder.dependencyPath, dep.moduleName!);
      const to = this.fileSystemService.join(dep.basePath, dep.srcBasePath);
      await this.fileSystemService.createDirLink(from, to);
    }
  }

  protected async addDependenciesToTsConfigFile() {
    if (this.gahConfig?.skipTsConfigPathsAdjustments || this.preCompiled) {
      return;
    }

    for (const dep of this.allRecursiveDependencies) {

      if (dep.preCompiled) {
        const preCompiled = this.cfgService.localConfig()?.precompiled?.find(x => x.name === dep.moduleName);
        if (!preCompiled) {
          throw new Error('Could not find matching precompiled module');
        }
        if (preCompiled.path) {
          this.cleanupService.logPackageJsonDependencyChange(this.packageJsonPath, dep.fullName, this.packageJson.dependencies![dep.fullName], preCompiled.path);
          this.packageJson.dependencies![dep.fullName] = preCompiled.path;
          if (dep.aliasNames) {
            const aliasForThisModule = dep.aliasNames.find(x => x.forModule === this.moduleName || this.isHost);
            if (aliasForThisModule) {
              this.cleanupService.logPackageJsonDependencyChange(
                this.packageJsonPath, aliasForThisModule.alias, this.packageJson.dependencies![aliasForThisModule.alias], preCompiled.path
              );
              this.packageJson.dependencies![aliasForThisModule.alias] = preCompiled.path;
            }
          }
        } else {
          const latest = await this.packageService.findLatestPackageVersion(dep.fullName);
          this.cleanupService.logPackageJsonDependencyChange(this.packageJsonPath, dep.fullName, this.packageJson.dependencies![dep.fullName], latest);
          this.packageJson.dependencies![dep.fullName] = latest;
          if (dep.aliasNames) {
            const aliasForThisModule = dep.aliasNames.find(x => x.forModule === this.moduleName || this.isHost);
            if (aliasForThisModule) {
              const newPackageValue = `npm:${dep.fullName}@${latest}`;
              this.cleanupService.logPackageJsonDependencyChange(
                this.packageJsonPath, aliasForThisModule.alias, this.packageJson.dependencies![aliasForThisModule.alias], newPackageValue
              );
              this.packageJson.dependencies![aliasForThisModule.alias] = newPackageValue;
            }
          }
        }
        continue;
      }

      // /public-api.ts or / Index.ts or similar. Usually without sub-folders
      const publicApiPathRelativeToBaseSrcPath = this.fileSystemService.ensureRelativePath(dep.publicApiPathRelativeToBasePath, dep.srcBasePath, true);
      const publicApiRelativePathWithoutExtention = publicApiPathRelativeToBaseSrcPath.substr(0, publicApiPathRelativeToBaseSrcPath.length - 3);

      const path = this.fileSystemService.join(this.gahFolder.dependencyPath, dep.moduleName!, publicApiRelativePathWithoutExtention);
      const pathName = `@${dep.packageName}/${dep.moduleName!}`;

      this.tsConfigFile.addPathAlias(pathName, path, this.isHost);

      if (dep.aliasNames) {
        const aliasForThisModule = dep.aliasNames.find(x => x.forModule === this.moduleName || this.isHost);
        if (aliasForThisModule) {
          this.tsConfigFile.addPathAlias(aliasForThisModule.alias, path, this.isHost);
        }
      }
    }
    this.fileSystemService.saveObjectToFile(this.packageJsonPath, this.packageJson);
    this.tsConfigFile.save();
  }

  protected generateStyleImports() {
    if (this.preCompiled) {
      return;
    }
    for (const dep of this.allRecursiveDependencies) {
      // Reference scss style files

      const node_modulesPath = this.fileSystemService.join(
        this.contextService.getContext().currentBaseFolder!, 'node_modules'
      );
      const node_modulePackagePath = this.fileSystemService.join(
        node_modulesPath, dep.packageName ? `@${dep.packageName}` : '', dep.moduleName!
      );

      // In case the module is not precompiled a fake node_module with the styles will be created
      if (!dep.preCompiled) {
        // Find all styles in the source folder
        const sourceStyles = this.fileSystemService.getFilesFromGlob(`${dep.basePath}/**/styles/**/*.scss`, ['**/dist/**']);

        // Getting the parent directory of the source path, because we want the name of the source path to be included later in the relative paths
        const absoluteSrcParentPath = this.fileSystemService.getDirectoryPathFromFilePath(this.fileSystemService.join(dep.basePath, dep.srcBasePath));
        // getting the relative paths to the style files including the source directoy itself
        const relativeSourcePaths = sourceStyles.map(x => this.fileSystemService.ensureRelativePath(
          x, absoluteSrcParentPath, true
        ));
        // Getting the path in the node_modules folder where the files are linked to later
        const targetPaths = relativeSourcePaths.map(p => {
          const moduleStylePath = this.fileSystemService.join(node_modulePackagePath, p);
          this.fileSystemService.ensureDirectory(this.fileSystemService.getDirectoryPathFromFilePath(moduleStylePath));
          return moduleStylePath;
        });
        for (let i = 0; i < relativeSourcePaths.length; i++) {
          const src = relativeSourcePaths[i];
          const target = targetPaths[i];
          // link the file to the fake node_module
          if (this.fileSystemService.fileExists(target)) {
            this.fileSystemService.deleteFile(target);
          }
          this.fileSystemService.createFileLink(target, this.fileSystemService.join(absoluteSrcParentPath, src));
        }
      }

      // Find all scss files in a folder called styles in the precompiled node_modules module folder
      const styles = this.fileSystemService.getFilesFromGlob(`${node_modulePackagePath}/**/styles/**/*.scss`, ['**/dist/**'], true);
      // Get the path without the path to the module itself (starting at the same point as .gah-dependencies links)
      const relativePaths = styles.map((x) => this.fileSystemService.ensureRelativePath(x, node_modulesPath, true));

      if (relativePaths.length > 0) {

        // Generate all the imports to the found style files (pointing to .gah/dependencies)
        const fileContent = relativePaths.map((s) => `@import "${s}";`).join('\n');
        this.fileSystemService.saveFile(this.fileSystemService.join(this.basePath, this.gahFolder.stylesPath, `${dep.moduleName!}.scss`), fileContent);
      }
    }
  }

  protected adjustGitignore() {
    this.workspaceService.ensureGitIgnoreLine('**/.gah', 'Ignoring gah generated files', this.gahFolder.path);
    this.workspaceService.ensureGitIgnoreLine('**/gah-local.json', 'Ignoring local gah config', this.gahFolder.path);
  }

  public get packageJson(): PackageJson {
    this._packageJson ??= this.fileSystemService.parseFile<PackageJson>(this.packageJsonPath);
    return this._packageJson;
  }

  public get packageJsonPath(): string {
    return this.fileSystemService.join(this.basePath, 'package.json');
  }

  private async executeScripts(preinstall: boolean) {
    if (this.preCompiled || this.contextService.getContext().skipScripts) {
      return;
    }
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
