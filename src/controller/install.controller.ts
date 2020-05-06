import { injectable } from 'inversify';

import { GahConfig, GahEvent, InstallFinishedEvent, ModuleDefinition, ModuleReference, ModulesTemplateData, ModuleTemplateData, PackageJson, TsConfig, TsConfigCompilerOptionsPaths } from '@awdware/gah-shared';

import { Controller } from './controller';

const hostDependencyPath = './src/app/.gah/dependencies';
const hostGeneratedPath = './src/app/.gah/generated';
const hostStylesPath = './src/app/.gah/styles';
const hostAssetsFolder = './src/assets';

@injectable()
export class InstallController extends Controller {

  private modulesTemplateData: ModulesTemplateData;
  private didCleanup = false;
  private foundEntry = false;
  private installedModules: string[];
  private isHost: boolean;

  public async install() {
    const cfg = this._configService.getGahConfig();
    const paths = new Array<string>();
    paths.push('gah-config.json');
    this.findAllInstallPaths('gah-config.json', cfg, paths);
    for (let i = 0; i < paths.length; i++) {
      const mPath = paths[i];
      const baseDir = this._fileSystemService.getDirectoryPathFromFilePath(mPath);
      await this.doInstall(baseDir, i, paths.length);
    }
  }

  private findAllInstallPaths(gahCfgPath: string, cfg: GahConfig, paths: string[]) {
    for (const m of cfg.modules) {
      if (!m.dependencies)
        return;
      for (const md of m.dependencies) {
        const mPath = this._fileSystemService.join(this._fileSystemService.getDirectoryPathFromFilePath(gahCfgPath), md.path);
        if (!paths.includes(mPath)) {
          paths.push(mPath);
          const nCfg = this._fileSystemService.parseFile<GahConfig>(mPath);
          this.findAllInstallPaths(mPath, nCfg, paths);
        }
      }
    }
  }

  private async doInstall(baseDir: string, index: number, moduleCount: number): Promise<void> {
    const cfg = this._fileSystemService.parseFile<GahConfig>(this._fileSystemService.join(baseDir, 'gah-config.json'));


    this.isHost = cfg.isHost || false;
    this.didCleanup = false;
    this.foundEntry = false;
    this.installedModules = new Array<string>();
    this.cleanTsCfgFile(baseDir);

    const dirName = this._fileSystemService.directoryName(baseDir);
    if (this.isHost) {
      this.modulesTemplateData = new ModulesTemplateData();
      this._fileSystemService.deleteFilesInDirectory(this._fileSystemService.join(baseDir, hostGeneratedPath));
      this._fileSystemService.ensureDirectory(this._fileSystemService.join(baseDir, hostGeneratedPath));
      this._loggerService.log(`[${index + 1}/${moduleCount}] Installing gah host '${dirName}'`);
    } else {
      this._loggerService.log(`[${index + 1}/${moduleCount}] Installing gah module '${dirName}'`);
    }

    const allModGroupRefs = this.getAllReferencedModulesForModule(cfg);

    allModGroupRefs.forEach((moduleGroupRef) => {
      this.createReferenceToModuleGroup(moduleGroupRef[0], moduleGroupRef[1], baseDir, baseDir);
    });

    if (this.isHost) {
      this.renderTemplateFiles(baseDir, this.modulesTemplateData);
    }

    this.adjustWorkspace(baseDir);

    // Installing yarn packages in case they changed
    if (this.isHost) {
      this._loggerService.startLoadingAnimation('Installing yarn packages');
      const success = await this._executionService.execute('yarn', false);
      if (success) {
        this._loggerService.stopLoadingAnimation(false, true, 'Packages installed successfully');
      } else {
        this._loggerService.stopLoadingAnimation(false, false, 'Installing packages failed');
        this._loggerService.error(this._executionService.executionErrorResult);
      }
    }

    this._pluginService.triggerEvent(GahEvent.INSTALL_FINISHED, { baseDir } as InstallFinishedEvent);

    if (this.isHost) {

      if (this.foundEntry) {
        this._loggerService.success('Host installed');
      } else {
        this._loggerService.error('Exactly one of the used modules has to be declared as entry module');
      }
    } else {
      this._loggerService.success('Module installed');
    }
  }

  private cleanTsCfgFile(baseDir: string) {
    const tsConfigPath = this._fileSystemService.join(baseDir, 'tsconfig.json');
    const tsConfig = this._fileSystemService.parseFile<TsConfig>(tsConfigPath);
    const tsConfigCompilerOpts = tsConfig.compilerOptions;

    if (!tsConfigCompilerOpts.paths) {
      tsConfigCompilerOpts.paths = new TsConfigCompilerOptionsPaths();
    }

    const allPaths = Object.keys(tsConfigCompilerOpts.paths);
    allPaths.forEach((x) => {
      if (x.startsWith('@gah-deps')) {
        delete tsConfigCompilerOpts.paths[x];
      }
    });

    if (!tsConfigCompilerOpts.baseUrl) {
      tsConfigCompilerOpts.baseUrl = './';
    }

    this._fileSystemService.saveObjectToFile(tsConfigPath, tsConfig);
  }

  private getAllReferencedModulesForModule(cfg: GahConfig): Array<[ModuleDefinition, ModuleReference]> {
    const allModGroupRefs = new Array<[ModuleDefinition, ModuleReference]>();

    cfg.modules.forEach((m) => {
      m.dependencies?.forEach((md) => {
        const samePath = allModGroupRefs.find((x) => x[1].path === md.path);
        if (!samePath) {
          allModGroupRefs.push([m, md]);
        } else {
          md.names.forEach((mdn) => {
            if (!samePath[1].names.includes(mdn)) {
              samePath[1].names.push(mdn);
            }
          });
        }
      });
    });
    return allModGroupRefs;
  }

  private createReferenceToModuleGroup(ownModule: ModuleDefinition, moduleGroup: ModuleReference, baseDir: string, workingDir: string): void {
    for (const moduleName of moduleGroup.names) {
      const externalModuleCfg = this._fileSystemService.parseFile<GahConfig>(this._fileSystemService.join(baseDir, moduleGroup.path));
      const moduleGroupBaseDir = this._fileSystemService.getDirectoryPathFromFilePath(this._fileSystemService.join(baseDir, moduleGroup.path));
      const hasToBeInstalled = this.checkIfModuleHasToBeInstalled(moduleName);
      if (!hasToBeInstalled) {
        continue;
      }

      const externalModuleDef = this.getExternalModuleDef(externalModuleCfg, moduleName, moduleGroupBaseDir);

      // Getting public-api path and facade path from module
      const externalPublicApiPath = this._fileSystemService.join(moduleGroupBaseDir, externalModuleDef.publicApiPath);
      const externalFacadePath = externalModuleDef.facadePath ? this._fileSystemService.join(moduleGroupBaseDir, externalModuleDef.facadePath) : null;

      // getting the base folder (containing the public-api.ts file) path relative to the baseDir
      const relativeExternalBasePath = this._fileSystemService.ensureRelativePath(this._fileSystemService.getDirectoryPathFromFilePath(externalPublicApiPath), baseDir);
      // getting public-api path relative to the .gah/generated path of the host/module
      const relativeToGeneratedExternalBasePath = this._fileSystemService.ensureRelativePath(this._fileSystemService.join(baseDir, hostDependencyPath, moduleName), this._fileSystemService.join(baseDir, hostGeneratedPath), true);

      // Get the destonation for the symlinks depending on module-type
      const dependencyFolder = this.getDependencyFolder(workingDir, ownModule);
      // Get the destonation for the style references depending on module-type
      const stylesFolder = this.getStylesFolder(workingDir, ownModule);

      this.cleanUpFolders(baseDir, dependencyFolder, stylesFolder);
      this.createDependencySymlinkAndEditTsConfig(baseDir, workingDir, dependencyFolder, moduleName, relativeExternalBasePath);
      this.isHost && this.generateDataForEjsTemplate(moduleName, externalModuleDef, relativeToGeneratedExternalBasePath);
      this.isHost && this.copyAssetsAndBaseStyles(baseDir, externalFacadePath, moduleName, relativeExternalBasePath, moduleGroupBaseDir);
      this.generateStyleImports(workingDir, moduleGroupBaseDir, moduleName, relativeExternalBasePath, stylesFolder);

      // Do everything again for child dependencies
      if (externalModuleDef.dependencies) {
        externalModuleDef.dependencies.forEach((dep) => {
          this.createReferenceToModuleGroup(ownModule, dep, moduleGroupBaseDir, workingDir);
        });
      }
    }
  }

  private checkIfModuleHasToBeInstalled(moduleName: string): boolean {
    if (this.installedModules.includes(moduleName)) {
      return false;
    }
    this.installedModules.push(moduleName);
    return true;
  }

  private getExternalModuleDef(externalModuleCfg: GahConfig, moduleName: string, moduleGroupBaseDir: string) {
    const externalModuleDef = externalModuleCfg.modules.find((x) => x.name === moduleName);
    if (!externalModuleDef) {
      throw new Error('could not find module \'' + moduleName + '\' in \'' + moduleGroupBaseDir + '\'');
    }

    if (externalModuleDef.isEntry) {
      if (this.foundEntry) {
        throw new Error('Found multiple referenced modules that are configured as entry modules. You have to specify exactly one entry module. Second found module: ' + moduleName);
      }
      this.foundEntry = true;
    }
    return externalModuleDef;
  }

  private cleanUpFolders(workingDir: string, dependencyFolder: string, stylesFolder: string) {
    // Delete links to modules for module or host and ensure the folders exist
    if (!this.didCleanup) {
      this._fileSystemService.deleteFilesInDirectory(dependencyFolder);
      this._fileSystemService.ensureDirectory(dependencyFolder);
      this.didCleanup = true;
      if (this.isHost) {
        this._fileSystemService.deleteFilesInDirectory(this._fileSystemService.join(workingDir, hostAssetsFolder));
        this._fileSystemService.ensureDirectory(this._fileSystemService.join(workingDir, hostAssetsFolder));
        this._fileSystemService.deleteFile(this._fileSystemService.join(workingDir, 'src/styles.scss'));
        this._fileSystemService.saveFile(this._fileSystemService.join(workingDir, 'src/styles.scss'), '/*\n  * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *\n  *   Please do not edit this file. Any changes to this file will be overwriten by gah.   *\n  *              Check the documentation for how to edit your global styles:              *\n  *                        https://github.com/awdware/gah-cli/wiki                        *\n  * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *\n*/');
      }
      this._fileSystemService.ensureDirectory(stylesFolder);
      this._fileSystemService.deleteFilesInDirectory(stylesFolder);
    }
  }

  private createDependencySymlinkAndEditTsConfig(baseDir: string, workingDir: string, dependencyFolder: string, moduleName: string, relativeExternalBasePath: string) {
    // Creating the actual link to the module inside of the .gah/dependencies folder
    const linkPath = this._fileSystemService.join(dependencyFolder, moduleName);
    const realPath = this._fileSystemService.join(baseDir, relativeExternalBasePath);
    this._fileSystemService.createDirLink(linkPath, realPath);

    // Getting the relative path that is written to TS Config paths section
    const gahDependencyPathForModule = this._fileSystemService.ensureRelativePath(linkPath, workingDir, true);

    // Adding entries to the tsconfig paths section
    const tsConfigPath = this._fileSystemService.join(workingDir, 'tsconfig.json');
    const tsConfig = this._fileSystemService.parseFile<TsConfig>(tsConfigPath);
    tsConfig.compilerOptions.paths['@gah/' + moduleName + '/*'] = [gahDependencyPathForModule + '/*'];

    this._fileSystemService.saveObjectToFile(tsConfigPath, tsConfig);
  }

  private generateDataForEjsTemplate(moduleName: string, externalModuleDef: ModuleDefinition, relativeToGeneratedExternalBasePath: string) {
    // Get a save name of a module removing some special chars. Mainly dots are probably used in names and have to be replaced.
    const saveModuleName = moduleName.replace(/[.*:$]/g, '_');
    // Generationg data for the ejs template generation generating the gah-modules.ts
    const newTemplateData = new ModuleTemplateData();
    newTemplateData.name = moduleName;
    newTemplateData.isEntry = externalModuleDef.isEntry || false;
    newTemplateData.isLibraryOnly = !externalModuleDef.baseNgModuleName;
    newTemplateData.baseModuleName = externalModuleDef.baseNgModuleName;
    newTemplateData.saveName = saveModuleName;
    newTemplateData.publicApiImportPath = relativeToGeneratedExternalBasePath;
    this.modulesTemplateData.modules.push(newTemplateData);
  }

  private copyAssetsAndBaseStyles(baseDir: string, externalFacadePath: string | null, moduleName: string, relativeExternalBasePath: string, moduleGroupPath: string) {
    if (!externalFacadePath)
      return;
    // Copying assets
    if (this._fileSystemService.directoryExists(this._fileSystemService.join(externalFacadePath, 'assets'))) {
      this._fileSystemService.copyFilesInDirectory(this._fileSystemService.join(externalFacadePath, 'assets'), this._fileSystemService.join(baseDir, hostAssetsFolder, moduleName));
    }

    // Copying base styles if they exist
    if (this._fileSystemService.fileExists(this._fileSystemService.join(externalFacadePath, 'styles.scss'))) {
      const stylesScss = this._fileSystemService.readFileLineByLine(this._fileSystemService.join(baseDir, 'src/styles.scss'));
      const moduleFacadePathRelativeToLinkedFolder = this._fileSystemService.ensureRelativePath(externalFacadePath, this._fileSystemService.join(baseDir, relativeExternalBasePath), true);
      const moduleFacadePath = this._fileSystemService.join('./app/.gah/dependencies', moduleName, moduleFacadePathRelativeToLinkedFolder, 'styles.scss');
      stylesScss.push(`@import "${moduleFacadePath}";`);
      this._fileSystemService.saveFile(this._fileSystemService.join(baseDir, 'src/styles.scss'), stylesScss.join('\n'));
    }

    this.mergePackageDependenciesIntoHost(baseDir, moduleGroupPath);
  }

  private generateStyleImports(baseDir: string, moduleGroupBaseDir: string, moduleName: string, relativeExternalBasePath: string, stylesFolder: string) {
    // Generate scss style files
    // Find all scss files in a folder called styles in the external module
    const abs = this._fileSystemService.ensureAbsolutePath(moduleGroupBaseDir);
    const styles = this._fileSystemService.getFilesFromGlob(abs + '/**/styles/**/*.scss', ['**/dist/**']);
    if (styles.length > 0) {
      // Get the path without the path to the module itself (starting at the same point as .gap-dependencies links)
      const shortPaths = styles.map((x) => this._fileSystemService.ensureRelativePath(x, this._fileSystemService.join(baseDir, relativeExternalBasePath)));
      // Get the path from the perspective of the .gah/styles folder
      const relativePaths = shortPaths.map((x) => this._fileSystemService.join('../dependencies', moduleName, x));

      // Generate all the imports to the found style files (pointing to .gah/dependencies)
      const fileContent = relativePaths.map((s) => `@import "${s}";`).join('\n');
      this._fileSystemService.saveFile(this._fileSystemService.join(stylesFolder, moduleName + '.scss'), fileContent);
    }
  }

  private renderTemplateFiles(baseDir: string, modulesTemplateData: ModulesTemplateData) {
    // Rendering the gah-modules.ts file for importing and initializing modules on the host
    this._templateService.renderFile(this._fileSystemService.join(__dirname, '../templates/modules.ejs.t'), modulesTemplateData, this._fileSystemService.join(baseDir, hostGeneratedPath, 'gah-modules.ts'));
  }

  private adjustWorkspace(baseDir: string) {
    // Adding important gitignore files, so git doesn't detect generated or linked files
    this._workspaceService.ensureGitIgnoreLine('**/.gah/**', 'Ignoring gah generated files', baseDir);
    if (this.isHost) {
      this._workspaceService.ensureGitIgnoreLine('src/assets', 'Ignoring asset files copied by gah install command', baseDir);
    }
  }

  private mergePackageDependenciesIntoHost(baseDir: string, moduleGroupPath: string) {
    const packageJsonPath = this._fileSystemService.join(baseDir, 'package.json');
    // Get package.json from host
    const packageJson = this._fileSystemService.parseFile<PackageJson>(packageJsonPath);
    // Get package.json from module to installed into host
    const externalPackageJson = this._fileSystemService.parseFile<PackageJson>(this._fileSystemService.join(moduleGroupPath, 'package.json'));

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
    this._fileSystemService.saveObjectToFile(packageJsonPath, packageJson);
  }

  private getDependencyFolder(baseDir: string, ownModule: ModuleDefinition): string {
    if (this.isHost) {
      return this._fileSystemService.join(baseDir, hostDependencyPath);
    } else {
      return this._fileSystemService.join(baseDir, this._fileSystemService.getDirectoryPathFromFilePath(ownModule.publicApiPath), '.gah/dependencies');
    }
  }

  private getStylesFolder(baseDir: string, ownModule: ModuleDefinition): string {
    if (this.isHost) {
      return this._fileSystemService.join(baseDir, hostStylesPath);
    } else {
      return this._fileSystemService.join(baseDir, this._fileSystemService.getDirectoryPathFromFilePath(ownModule.publicApiPath), '.gah/styles');
    }
  }
}
