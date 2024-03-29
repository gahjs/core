import chalk from 'chalk';
import { DIContainer } from '../di-container';
import {
  AwesomeChecklistLoggerControl,
  AwesomeChecklistLoggerItem,
  AwesomeChecklistLoggerState,
  AwesomeLogger
} from 'awesome-logging';
import {
  IFileSystemService,
  ITemplateService,
  IWorkspaceService,
  IExecutionService,
  ILoggerService,
  GahEventType,
  IPluginService,
  GahModuleData,
  PackageJson,
  IContextService,
  IPackageService,
  ICleanupService,
  IConfigurationService,
  GahConfig,
  GahEventName
} from '@gah/shared';

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
import { InstallUnit, InstallUnitResult, InstallUnitReturn } from './install-unit';

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
  protected cfgService: IConfigurationService;

  public basePath: string;
  public srcBasePath: string;
  public assetsFolderRelativeToBasePaths?: string | string[];
  public stylesFilePathRelativeToBasePath?: string;
  public publicApiPathRelativeToBasePath: string;
  public additionalPublicApiPathRelativeToBasePath?: { path: string; suffix: string }[];
  public baseNgModuleName?: string;
  public isHost: boolean;
  protected installed: boolean;
  protected gahCfgPath?: string;
  protected gahConfigs: { moduleName: string; cfg: GahConfig }[];
  protected initializedModules: GahModuleBase[];

  public isEntry: boolean;
  public parentGahModule?: string;
  public excludedPackages: string[];
  public aliasNames: { forModule: string; alias: string }[];

  public tsConfigFile: TsConfigFile;
  public gahFolder: GahFolder;

  public dependencies: GahModuleBase[];
  public moduleName?: string;
  public packageName: string | null;
  private _packageJson?: PackageJson;
  private readonly _globalPackageStorePath: string;
  private readonly _globalPackageStoreJsonPath: string;
  private readonly _globalPackageStoreArchivePath: string;

  public installStepCount: number;
  protected _installDescriptionText: string;
  private readonly _installUnits: InstallUnit<any>[] = [];
  private _progressLogger: AwesomeChecklistLoggerControl;
  private _installDone: (_: void) => void;

  constructor(moduleName?: string, gahCfgPath?: string) {
    this.cleanupService = DIContainer.resolve<CleanupSevice>('cleanupSevice');
    this.fileSystemService = DIContainer.resolve<FileSystemService>('fileSystemService');
    this.workspaceService = DIContainer.resolve<WorkspaceService>('workspaceService');
    this.templateService = DIContainer.resolve<TemplateService>('templateService');
    this.executionService = DIContainer.resolve<ExecutionService>('executionService');
    this.loggerService = DIContainer.resolve<LoggerService>('loggerService');
    this.packageService = DIContainer.resolve<PackageService>('packageService');
    this.pluginService = DIContainer.resolve<PluginService>('pluginService');
    this.contextService = DIContainer.resolve<ContextService>('contextService');
    this.cfgService = DIContainer.resolve<ConfigService>('configService');

    this.installed = false;
    this.moduleName = moduleName;
    this.gahCfgPath = gahCfgPath;
    this.dependencies = new Array<GahModuleBase>();

    this._globalPackageStorePath = this.fileSystemService.join(this.workspaceService.getWorkspaceFolder(), 'precompiled');
    this._globalPackageStoreArchivePath = this.fileSystemService.join(this._globalPackageStorePath, 'targz');
    this._globalPackageStoreJsonPath = this.fileSystemService.join(this._globalPackageStorePath, 'package.json');
  }

  protected async initBase(): Promise<void> {}

  protected async oneTimeCleanUp() {
    if (!this.contextService.getContext().oneTimeClearDone) {
      this.contextService.setContext({ oneTimeClearDone: true });
      if (await this.fileSystemService.directoryExists(this._globalPackageStorePath)) {
        await this.fileSystemService.deleteFilesInDirectory(this._globalPackageStorePath);
      }

      await this.fileSystemService.ensureDirectory(this._globalPackageStorePath);
      await this.fileSystemService.ensureDirectory(this._globalPackageStoreArchivePath);

      if (!(await this.fileSystemService.fileExists(this._globalPackageStoreJsonPath))) {
        const packageJsonTemplatePath = this.fileSystemService.join(
          __dirname,
          '..',
          '..',
          'assets',
          'package-store',
          'package.json'
        );
        await this.fileSystemService.copyFile(packageJsonTemplatePath, this._globalPackageStorePath);
      }
    }
  }

  public abstract init(): Promise<void>;

  public addInstallUnit<T extends GahEventName>(unit: InstallUnit<T>) {
    this._installUnits.push(unit);
  }

  public async preCompiled() {
    return (await this.cfgService.getGahConfig()).precompiled?.some(x => x.name === this.moduleName) ?? false;
  }

  public abstract specificData(): Partial<GahModuleData>;

  public async data(): Promise<GahModuleData> {
    const currentPluginCfg = await this.cfgService.getPluginConfig(this.moduleName);
    const pluginCfg: { [key: string]: any[] } = {};

    currentPluginCfg?.forEach(x => {
      if (pluginCfg[x.name]) {
        pluginCfg[x.name].push(x.settings);
      } else {
        pluginCfg[x.name] = [x.settings];
      }
    });

    const myData: GahModuleData = {
      basePath: this.basePath,
      dependencies: await Promise.all(this.dependencies.map(x => x.data())),
      gahConfig: await this.cfgService.getGahConfig(),
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
      packageJson: await this.getPackageJson(),
      pluginCfg
    };

    const specificData = this.specificData();

    return Object.assign(myData, specificData);
  }

  public addAlias(forModule: string, alias: string) {
    if (!this.aliasNames.some(x => x.forModule === forModule && x.alias === alias)) {
      this.aliasNames.push({ forModule, alias });
    }
  }

  protected async initTsConfigObject() {
    const op1 = this.fileSystemService.join(this.basePath, 'tsconfig.base.json');
    const op2 = this.fileSystemService.join(this.basePath, 'tsconfig.json');

    if (await this.fileSystemService.fileExists(op1)) {
      this.tsConfigFile = new TsConfigFile(op1, this.fileSystemService, this.cleanupService);
    } else if (await this.fileSystemService.fileExists(op2)) {
      this.tsConfigFile = new TsConfigFile(op2, this.fileSystemService, this.cleanupService);
    } else {
      throw new Error('Cannot find a tsconfig.base.json or tsconfig.json');
    }
    await this.tsConfigFile.init();
  }

  public abstract install(skipPackageInstall: boolean): Promise<void>;

  protected async doInstall() {
    this._progressLogger = AwesomeLogger.log('checklist', {
      items: this._installUnits.map(x => {
        return { text: x.text, state: 'pending' } as AwesomeChecklistLoggerItem;
      })
    });
    this.checkUnitDependencies();
    return new Promise(resolve => {
      this._installDone = resolve;
    });
  }

  private loggerStateFromRes(res: InstallUnitReturn): AwesomeChecklistLoggerState {
    switch (res) {
      case InstallUnitResult.failed:
        return 'failed';
      case InstallUnitResult.skipped:
        return 'skipped';
      case InstallUnitResult.warnings:
        return 'partiallySucceeded';
      default:
        return 'succeeded';
    }
  }

  private async listenForFinishedUnit(unit: InstallUnit<any>, result: () => Promise<InstallUnitReturn>) {
    const res = await result().catch(error => {
      this.loggerService.error(`Install failed during step: ${unit.id}`);
      this.loggerService.error(error);
      this.loggerService.debug('This is the last execution error: (This did not necessarily create this error)');
      this.loggerService.debug(this.executionService.executionErrorResult);
      process.exit(1);
    });
    const index = this._installUnits.findIndex(x => x.id === unit.id);
    unit.finished = true;
    await this.pluginService.triggerEvent(`AFTER_${unit.id}` as GahEventType, unit.eventPayload);
    await this.checkUnitDependencies();
    this._progressLogger.changeState(index, this.loggerStateFromRes(res));
    if (!this._installUnits.some(x_1 => !x_1.finished)) {
      this._installDone();
    }
  }

  private async checkUnitDependencies() {
    const unstarted = this._installUnits.filter(x => !x.started);
    for (const unit of unstarted) {
      if (!unit.parents || !unit.parents.some(parent => !this._installUnits.find(x => x.id === parent)?.finished)) {
        unit.started = true;
        const index = this._installUnits.findIndex(x => x.id === unit.id);
        this._progressLogger.changeState(index, 'inProgress');
        await this.pluginService.triggerEvent(`BEFORE_${unit.id}` as GahEventType, unit.eventPayload);
        this.listenForFinishedUnit(unit, () => unit.action());
      }
    }
  }

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
    if (await this.preCompiled()) {
      return;
    }
    const linkPromises: Promise<void>[] = [];
    for (const dep of this.allRecursiveDependencies) {
      if (await dep.preCompiled()) {
        if (dep.installed) {
          return;
        }
        const preCompiled = (await this.cfgService.getGahConfig()).precompiled?.find(x => x.name === dep.moduleName);
        if (!preCompiled) {
          throw new Error('Could not find matching precompiled module');
        }
        if (preCompiled.path) {
          const destPathTmp = this.fileSystemService.join(this._globalPackageStoreArchivePath, 'tmp', dep.fullName);
          const destPath = this.fileSystemService.join(this._globalPackageStoreArchivePath, dep.fullName);
          if (await this.fileSystemService.directoryExists(destPathTmp)) {
            await this.fileSystemService.deleteFilesInDirectory(destPathTmp);
          }
          if (await this.fileSystemService.directoryExists(destPath)) {
            await this.fileSystemService.deleteFilesInDirectory(destPath);
          }
          const success = await this.fileSystemService.decompressTargz(preCompiled.path, destPathTmp);
          if (!success) {
            throw new Error(`Could not unpack package '${chalk.green(preCompiled.name)}'`);
          }

          const parentDestPath = this.fileSystemService.getDirectoryPathFromFilePath(destPath);
          await this.fileSystemService.ensureDirectory(parentDestPath);
          await this.fileSystemService.rename(this.fileSystemService.join(destPathTmp, 'package'), destPath);

          // Fixing path in precompiled packages to new workspace:
          const destPathPackageJson = this.fileSystemService.join(destPath, 'package.json');
          const destPkgJson = await this.fileSystemService.parseFile<PackageJson>(destPathPackageJson);
          const destDepKeys = Object.keys(destPkgJson.dependencies!);
          let didAdjustPath: boolean = false;
          const allGahModuleNames = this.allRecursiveDependencies.map(x =>
            x.packageName ? `@${x.packageName}/${x.moduleName}` : x.moduleName!
          );
          const allGahModuleAliasNames = this.allRecursiveDependencies
            .map(x => {
              return {
                alias: x.aliasNames?.[0],
                moduleName: x.packageName ? `@${x.packageName}/${x.moduleName}` : x.moduleName!
              };
            })
            .filter(x => !!x.alias);
          destDepKeys.forEach(destDepKey => {
            let adjustedPath: string = '';
            if (allGahModuleNames.includes(destDepKey)) {
              adjustedPath = `file:${this.fileSystemService.join(this._globalPackageStoreArchivePath, destDepKey)}`;
            }
            if (allGahModuleAliasNames.map(x => x.alias.alias).includes(destDepKey)) {
              adjustedPath = `file:${this.fileSystemService.join(
                this._globalPackageStoreArchivePath,
                allGahModuleAliasNames.find(x => x.alias.alias === destDepKey)!.moduleName
              )}`;
            }
            if (adjustedPath) {
              destPkgJson.dependencies![destDepKey] = adjustedPath;
              const destDep = destPkgJson.dependencies![destDepKey];
              const prevPath = destDep;
              this.loggerService.debug(
                `Adjusted precompiled dependency path: '${chalk.red(prevPath)}' --> '${chalk.green(
                  adjustedPath
                )}' in '${chalk.gray(destPathPackageJson)}'`
              );
              didAdjustPath = true;
            }
          });
          if (didAdjustPath) {
            await this.fileSystemService.saveObjectToFile(destPathPackageJson, destPkgJson);
          }
        } else {
          // todo: allow real npm packages from a registry
        }
      } else {
        const mockPath = this.fileSystemService.join(this.gahFolder.precompiledPath, dep.fullName);
        const from = this.fileSystemService.join(this.basePath, this.gahFolder.dependencyPath, dep.moduleName!);
        const to = this.fileSystemService.join(dep.basePath, dep.srcBasePath);
        const linkPromise = this.fileSystemService
          .ensureDirectory(mockPath)
          .then(() => this.fileSystemService.createDirLink(from, to));
        linkPromises.push(linkPromise);
      }
    }
    if (linkPromises.length) {
      await Promise.all(linkPromises);
    }
  }

  protected async addDependenciesToTsConfigFile() {
    const packageJson = await this.getPackageJson();
    if (await this.preCompiled()) {
      return;
    }

    for (const dep of this.allRecursiveDependencies) {
      if (await dep.preCompiled()) {
        const precompiledModulePath = this.fileSystemService.join(this._globalPackageStoreArchivePath, dep.fullName);
        this.cleanupService.registerJsonFileTemporaryChange(
          this.packageJsonPath,
          `dependencies.${dep.fullName}`,
          packageJson.dependencies![dep.fullName]
        );
        packageJson.dependencies![dep.fullName] = `file:${precompiledModulePath}`;

        if (dep.aliasNames) {
          // This is a workaround that assumes that all alias names are equal for one module.
          const aliasForThisModule = dep.aliasNames[0];
          if (aliasForThisModule) {
            this.cleanupService.registerJsonFileTemporaryChange(
              this.packageJsonPath,
              `dependencies.${aliasForThisModule.alias}`,
              packageJson.dependencies![aliasForThisModule.alias]
            );

            packageJson.dependencies![aliasForThisModule.alias] = `file:${precompiledModulePath}`;
          }
        }

        await this.fileSystemService.saveObjectToFile(this.packageJsonPath, packageJson);
      } else {
        // /public-api.ts or / Index.ts or similar. Usually without sub-folders
        const publicApiPathRelativeToBaseSrcPath = await this.fileSystemService.ensureRelativePath(
          dep.publicApiPathRelativeToBasePath,
          dep.srcBasePath,
          true
        );

        const alternativePublicApiPathRelativeToBaseSrcPath = dep.additionalPublicApiPathRelativeToBasePath?.map(
          additionalPublicApiCfg =>
            this.fileSystemService
              .ensureRelativePath(additionalPublicApiCfg.path, dep.srcBasePath, true)
              .then(additionalRelativePublicApiCfg =>
                this.fileSystemService.join(
                  this.gahFolder.dependencyPath,
                  dep.moduleName!,
                  additionalRelativePublicApiCfg.substr(0, additionalRelativePublicApiCfg.length - 3)
                )
              )
              .then(additionalPublicApiCfgFinishedPath => {
                const pathName = `@${dep.packageName}/${dep.moduleName!}/${additionalPublicApiCfg.suffix}`;
                this.tsConfigFile.addPathAlias(pathName, additionalPublicApiCfgFinishedPath);
              })
        );
        if (alternativePublicApiPathRelativeToBaseSrcPath) {
          await Promise.all(alternativePublicApiPathRelativeToBaseSrcPath);
        }

        const publicApiRelativePathWithoutExtention = publicApiPathRelativeToBaseSrcPath.substr(
          0,
          publicApiPathRelativeToBaseSrcPath.length - 3
        );

        const absoluteDepPath = this.fileSystemService.join(this.basePath, this.gahFolder.dependencyPath);
        const relativeDepPathToSrcFolder = await this.fileSystemService.ensureRelativePath(
          absoluteDepPath,
          this.fileSystemService.join(this.basePath, this.tsConfigFile.getFileContents().compilerOptions.baseUrl ?? './'),
          true
        );

        const path = this.fileSystemService.join(
          relativeDepPathToSrcFolder,
          dep.moduleName!,
          publicApiRelativePathWithoutExtention
        );
        const pathName = `@${dep.packageName}/${dep.moduleName!}`;

        this.tsConfigFile.addPathAlias(pathName, path);

        if (dep.aliasNames) {
          const aliasForThisModule = dep.aliasNames.find(x => x.forModule === this.moduleName || this.isHost);
          if (aliasForThisModule) {
            this.tsConfigFile.addPathAlias(aliasForThisModule.alias, path);
          }
        }
      }
    }
    await this.fileSystemService.saveObjectToFile(this.packageJsonPath, packageJson);
    await this.tsConfigFile.save();
  }

  protected async generateStyleImports() {
    if (await this.preCompiled()) {
      return;
    }
    for (const dep of this.allRecursiveDependencies) {
      // Reference scss style files

      const node_modulesPath = this.fileSystemService.join(this.contextService.getContext().currentBaseFolder!, 'node_modules');
      const node_modulePackagePath = this.fileSystemService.join(
        node_modulesPath,
        dep.packageName ? `@${dep.packageName}` : '',
        dep.moduleName!
      );

      // In case the module is not precompiled a fake node_module with the styles will be created
      if (!(await dep.preCompiled())) {
        // Find all styles in the source folder
        const sourceStyles = await this.fileSystemService.getFilesFromGlob(`${dep.basePath}/**/styles/**/*.scss`, ['**/dist/**']);

        // Getting the parent directory of the source path, because we want the name of the source path to be included later in the relative paths
        const absoluteSrcParentPath = this.fileSystemService.getDirectoryPathFromFilePath(
          this.fileSystemService.join(dep.basePath, dep.srcBasePath)
        );
        // getting the relative paths to the style files including the source directoy itself
        const relativeSourcePaths = await Promise.all(
          sourceStyles.map(x => this.fileSystemService.ensureRelativePath(x, absoluteSrcParentPath, true))
        );
        // Getting the path in the node_modules folder where the files are linked to later
        const targetPaths = await Promise.all(
          relativeSourcePaths.map(async p => {
            const moduleStylePath = this.fileSystemService.join(node_modulePackagePath, p);
            await this.fileSystemService.ensureDirectory(this.fileSystemService.getDirectoryPathFromFilePath(moduleStylePath));
            return moduleStylePath;
          })
        );
        for (let i = 0; i < relativeSourcePaths.length; i++) {
          const src = relativeSourcePaths[i];
          const target = targetPaths[i];
          // link the file to the fake node_module
          if (await this.fileSystemService.fileExists(target)) {
            await this.fileSystemService.deleteFile(target);
          }
          await this.fileSystemService.createFileLink(target, this.fileSystemService.join(absoluteSrcParentPath, src));
        }
      }

      // Find all scss files in a folder called styles in the precompiled node_modules module folder
      const styles = await this.fileSystemService.getFilesFromGlob(
        `${node_modulePackagePath}/**/styles/**/*.scss`,
        ['**/dist/**'],
        true
      );
      // Get the path without the path to the module itself (starting at the same point as .gah-dependencies links)
      const relativePaths = await Promise.all(
        styles.map(x => this.fileSystemService.ensureRelativePath(x, node_modulesPath, true))
      );

      if (relativePaths.length > 0) {
        // Generate all the imports to the found style files (pointing to .gah/dependencies)
        const fileContent = relativePaths.map(s => `@import "${s}";`).join('\n');
        await this.fileSystemService.saveFile(
          this.fileSystemService.join(this.basePath, this.gahFolder.stylesPath, `${dep.moduleName!}.scss`),
          fileContent
        );
      }
    }
  }

  protected async adjustGitignore() {
    await this.workspaceService.ensureGitIgnoreLine('**/.gah', 'Ignoring gah generated files', this.gahFolder.path);
  }

  public async getPackageJson(): Promise<PackageJson> {
    this._packageJson ??= (await this.fileSystemService.tryParseFile<PackageJson>(this.packageJsonPath)) ?? undefined;
    return this._packageJson ?? {};
  }

  public get packageJsonPath(): string {
    return this.fileSystemService.join(this.basePath, 'package.json');
  }

  private async executeScripts(preinstall: boolean): Promise<void> {
    if ((await this.preCompiled()) || this.contextService.getContext().skipScripts) {
      return;
    }
    const scriptName = preinstall ? 'gah-preinstall' : 'gah-postinstall';
    if ((await this.getPackageJson()).scripts?.[scriptName]) {
      this.loggerService.log(
        `Executing ${preinstall ? 'pre' : 'post'}-install script for ${chalk.gray(this.moduleName ?? 'host')}`
      );

      const success = await this.executionService.execute(`yarn run ${scriptName}`, false, undefined, this.basePath);

      if (success) {
        return;
      } else {
        this.loggerService.error(this.executionService.executionErrorResult);
        throw new Error(
          `Error during ${preinstall ? 'pre' : 'post'}-install script for ${chalk.gray(this.moduleName ?? 'host')}`
        );
      }
    }
  }

  protected async installPackages(skip: boolean = false) {
    if (skip) {
      return InstallUnitResult.skipped;
    }

    const yarnLockDirectory = this.fileSystemService.join(this.basePath, '..');
    const yarnLockPath = this.fileSystemService.join(yarnLockDirectory, 'yarn.lock');
    if (this.contextService.getContext().calledFromHostFolder && (await this.fileSystemService.fileExists(yarnLockPath))) {
      this.loggerService.log('Copying lockfile');
      await this.fileSystemService.copyFile(yarnLockPath, this.basePath);
    }

    this.loggerService.log('Installing yarn packages');

    const yarnTimeout = this.contextService.getContext().yarnTimeout;
    const networkTimeout = yarnTimeout ? ` --network-timeout ${yarnTimeout}` : '';
    const success = await this.executionService.execute(
      `yarn${networkTimeout}`,
      true,
      () => {
        return '';
      },
      this.isHost ? '.gah' : undefined
    );

    if (success) {
      this.loggerService.success('Packages installed successfully');
      if (this.contextService.getContext().calledFromHostFolder) {
        this.loggerService.log('Saving lockfile');
        await this.fileSystemService.copyFile(this.fileSystemService.join(this.basePath, 'yarn.lock'), yarnLockDirectory);
      }
    } else {
      this.loggerService.error(this.executionService.executionErrorResult);
      throw new Error('Installing packages failed');
    }
  }

  public async executePreinstallScripts() {
    return this.executeScripts(true);
  }

  public async executePostinstallScripts() {
    return this.executeScripts(false);
  }
}
