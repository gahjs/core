import { GahModuleBase } from './gah-module-base';
import { GahConfig, GahHost, GahModuleData, GahAngularCompilerOptions } from '@gah/shared';
import { GahModuleDef } from './gah-module-def';
import { GahFolder } from './gah-folder';
import compareVersions from 'compare-versions';
import { InstallUnit } from './install-unit';

export class GahHostDef extends GahModuleBase {
  private readonly _ngOptions: { aot: boolean } = {} as any;
  private readonly _gahCfgFolder: string;
  private _indexHtmlLines: string[];
  private _title: string;
  private _ngCompilerOptions: GahAngularCompilerOptions;
  private _angularJson: any;
  private _ngJsonPath: string;
  private _browsersList?: string;

  constructor(gahCfgPath: string, initializedModules: GahModuleBase[], gahConfigs: { moduleName: string; cfg: GahConfig }[]) {
    super(undefined, gahCfgPath);
    this.isHost = true;
    this._gahCfgFolder = this.fileSystemService.ensureAbsolutePath(
      this.fileSystemService.getDirectoryPathFromFilePath(gahCfgPath)
    );
    this.basePath = this.fileSystemService.join(this._gahCfgFolder, '.gah');
    this.srcBasePath = './src';

    this.initializedModules = initializedModules;
    this.gahConfigs = gahConfigs;

    this.installStepCount = 13;
    this._installDescriptionText = 'Installing host';
  }

  public async init() {
    const hostCfg = await this.fileSystemService.parseFile<GahHost>(this.gahCfgPath!);
    if (!hostCfg) {
      throw new Error(`Cannot find host in file "${this.gahCfgPath}"`);
    }

    for (const moduleDependency of hostCfg.modules) {
      for (const depModuleName of moduleDependency.names) {
        const moduleAbsoluteBasepath = this.fileSystemService.join(this.basePath, moduleDependency.path);
        const alreadyInitialized = this.initializedModules.find(x => x.moduleName === depModuleName);
        if (alreadyInitialized) {
          this.dependencies.push(alreadyInitialized);
        } else {
          if (await this.fileSystemService.fileExists(moduleAbsoluteBasepath)) {
            const newModuleDef = new GahModuleDef(
              moduleAbsoluteBasepath,
              depModuleName,
              this.initializedModules,
              this.gahConfigs
            );
            await newModuleDef.init();
            this.dependencies.push(newModuleDef);
          } else {
            throw new Error(
              `Module '${depModuleName}' could not be found at '${moduleAbsoluteBasepath}' referenced by '${this
                .moduleName!}' in '${this.basePath}'`
            );
          }
        }
      }
    }
    this._ngOptions.aot = hostCfg.aot ?? true; // If not set the default value is true
    this._ngCompilerOptions = hostCfg.angularCompilerOptions ?? ({} as GahAngularCompilerOptions);
    this._indexHtmlLines = hostCfg.htmlHeadContent
      ? Array.isArray(hostCfg.htmlHeadContent)
        ? hostCfg.htmlHeadContent
        : [hostCfg.htmlHeadContent]
      : [];

    this._browsersList = Array.isArray(hostCfg.browsersList) ? hostCfg.browsersList.join('\n') : hostCfg.browsersList;
    this._title = hostCfg.title ?? '';
    this.gahFolder = new GahFolder(this.basePath, `${this.srcBasePath}/app`, this._gahCfgFolder);
    await this.initBase();
  }

  private async initAngularConfigObject() {
    this._ngJsonPath = this.fileSystemService.join(this.basePath, 'angular.json');
    this._angularJson = await this.fileSystemService.parseFile<any>(this._ngJsonPath);
  }

  public specificData(): Partial<GahModuleData> {
    return {
      ngOptions: this._ngOptions
    };
  }

  public async install(skipPackageInstall: boolean) {
    if (this.installed) {
      return;
    }

    await this.oneTimeCleanUp();

    await this.initTsConfigObject();
    await this.initAngularConfigObject();
    this.installed = true;

    this.addInstallUnit(
      new InstallUnit('CLEAN_TS_CONFIG', { module: await this.data() }, undefined, 'Cleaning tsconfig.json', () => {
        return this.tsConfigFile.clean();
      })
    );

    this.addInstallUnit(
      new InstallUnit('CLEAN_GAH_FOLDER', { module: await this.data() }, undefined, 'Cleaning gah folder', () => {
        return Promise.all([
          this.gahFolder.cleanGeneratedDirectory(),
          this.gahFolder.cleanDependencyDirectory(),
          this.gahFolder.cleanStylesDirectory(),
          this.gahFolder.cleanPrecompiledFolder(),
          this.cleanAssetsDirectory(),
          this.generateEnvFolderIfNeeded()
        ]);
      })
    );

    this.addInstallUnit(
      new InstallUnit(
        'GENERATE_STYLES_FILE',
        { module: await this.data() },
        ['CLEAN_GAH_FOLDER'],
        'Cleaning and generating styles file',
        () => {
          return this.cleanAndGenerateStylesScssFile();
        }
      )
    );

    this.addInstallUnit(
      new InstallUnit('GENERATE_SYMLINKS', { module: await this.data() }, ['CLEAN_GAH_FOLDER'], 'Linking modules', () => {
        return this.createSymlinksToDependencies();
      })
    );

    this.addInstallUnit(
      new InstallUnit(
        'ADJUST_TS_CONFIG',
        {
          module: await this.data(),
          tsConfig: this.tsConfigFile.getFileContents()
        },
        ['CLEAN_TS_CONFIG'],
        'Adjusting tsconfig.json',
        () => {
          return Promise.all([this.addDependenciesToTsConfigFile(), this.setAngularCompilerOptionsInTsConfig()]);
        }
      )
    );

    this.addInstallUnit(
      new InstallUnit('GENERATE_TEMPLATE', { module: await this.data() }, ['CLEAN_GAH_FOLDER'], 'Generating module file', () => {
        return this.generateFromTemplate();
      })
    );

    this.addInstallUnit(
      new InstallUnit(
        'COPY_ASSETS',
        { module: await this.data() },
        ['CLEAN_GAH_FOLDER', 'MERGE_DEPENDENCIES'],
        'Linking assets',
        () => {
          return this.linkAssets();
        }
      )
    );

    this.addInstallUnit(
      new InstallUnit('REFERENCE_STYLES', { module: await this.data() }, ['GENERATE_STYLES_FILE'], 'Referencing styles', () => {
        return this.referenceGlobalStyles();
      })
    );

    this.addInstallUnit(
      new InstallUnit(
        'MERGE_DEPENDENCIES',
        { module: await this.data(), pkgJson: await this.getPackageJson() },
        undefined,
        'Merging dependencies',
        () => {
          return this.mergePackageDependencies();
        }
      )
    );

    this.addInstallUnit(
      new InstallUnit('ADJUST_GITIGNORE', { module: await this.data() }, undefined, 'Adjusting .gitignore', () => {
        return Promise.all([this.adjustGitignore(), this.adjustGitignoreForHost()]);
      })
    );

    this.addInstallUnit(
      new InstallUnit(
        'ADJUST_ANGULAR_JSON',
        { module: await this.data(), ngJson: this._angularJson },
        undefined,
        'Adjusting angular.json',
        () => {
          return this.adjustAngularJsonConfig();
        }
      )
    );

    this.addInstallUnit(
      new InstallUnit('ADJUST_INDEX_HTML', { module: await this.data() }, undefined, 'Adjusting host files', () => {
        return this.adjustHostFiles();
      })
    );

    this.addInstallUnit(
      new InstallUnit(
        'PRE_INSTALL_SCRIPTS',
        { module: await this.data() },
        ['MERGE_DEPENDENCIES'],
        'Executing preinstall scripts',
        async () => {
          await this.collectModuleScripts();
          return this.executePreinstallScripts();
        }
      )
    );

    this.addInstallUnit(
      new InstallUnit(
        'INSTALL_PACKAGES',
        { module: await this.data() },
        ['PRE_INSTALL_SCRIPTS', 'GENERATE_SYMLINKS'],
        'Installing packages',
        async () => {
          return this.installPackages(skipPackageInstall);
        }
      )
    );

    this.addInstallUnit(
      new InstallUnit(
        'GENERATE_STYLE_IMPORTS',
        { module: await this.data() },
        ['INSTALL_PACKAGES'],
        'Importing styles',
        async () => {
          return this.generateStyleImports();
        }
      )
    );

    this.addInstallUnit(
      new InstallUnit(
        'POST_INSTALL_SCRIPTS',
        { module: await this.data() },
        ['GENERATE_STYLE_IMPORTS'],
        'Executing postinstall scripts',
        async () => {
          return this.executePostinstallScripts();
        }
      )
    );

    await this.doInstall();
  }

  private async cleanAssetsDirectory() {
    await this.fileSystemService.deleteFilesInDirectory(this.fileSystemService.join(this.basePath, this.srcBasePath, 'assets'));
    await this.fileSystemService.ensureDirectory(this.fileSystemService.join(this.basePath, this.srcBasePath, 'assets'));
  }
  private async cleanAndGenerateStylesScssFile() {
    await this.fileSystemService.deleteFile(this.fileSystemService.join(this.basePath, this.srcBasePath, 'styles.scss'));
    await this.fileSystemService.saveFile(
      this.fileSystemService.join(this.basePath, this.srcBasePath, 'styles.scss'),
      '' +
        '/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *\n' +
        ' *   Please do not edit this file. Any changes to this file will be overwriten by gah.   *\n' +
        ' *              Check the documentation for how to edit your global styles:              *\n' +
        ' *                          https://github.com/gahjs/core/wiki                           *\n' +
        ' * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */\n'
    );
  }

  private adjustGitignoreForHost() {
    this.workspaceService.ensureGitIgnoreLine('src/assets/**', 'Ignoring gah generated assets', this.basePath);
  }

  private async generateFromTemplate() {
    for (const dep of this.allRecursiveDependencies) {
      await this.pluginService.triggerEvent('BEFORE_GENERATE_TEMPLATE_DATA', { module: await this.data() });
      this.gahFolder.addGeneratedFileTemplateData(
        dep.moduleName!,
        dep.packageName!,
        dep.isEntry,
        dep.baseNgModuleName,
        dep.parentGahModule
      );
    }
    await this.pluginService.triggerEvent('AFTER_GENERATE_TEMPLATE_DATA', { module: await this.data() });

    return this.gahFolder.generateFileFromTemplate();
  }

  private async linkAssets() {
    // Bug: Symlinks are not copied to dist folder https://github.com/angular/angular-cli/issues/19086
    // workaround: include symlinked folder directly in assets config in angular json
    const ngJsonPath = this.fileSystemService.join(this.basePath, 'angular.json');
    const ngJson = await this.fileSystemService.parseFile<any>(ngJsonPath);
    const assetsArray = ngJson.projects['gah-host'].architect.build.options.assets as string[];

    for (const dep of this.allRecursiveDependencies) {
      if (
        !dep.assetsFolderRelativeToBasePaths ||
        (Array.isArray(dep.assetsFolderRelativeToBasePaths) && dep.assetsFolderRelativeToBasePaths.length === 0)
      ) {
        continue;
      }
      const assetsFolderRelativeTobasePaths = Array.isArray(dep.assetsFolderRelativeToBasePaths)
        ? dep.assetsFolderRelativeToBasePaths
        : [dep.assetsFolderRelativeToBasePaths];

      for (const p of assetsFolderRelativeTobasePaths) {
        const assetsDirectoryPath = this.fileSystemService.join(dep.basePath, p);

        // Linking assets
        if (await this.fileSystemService.directoryExists(assetsDirectoryPath)) {
          const hostAssetsFolder = this.fileSystemService.join(this.basePath, this.srcBasePath, 'assets', dep.moduleName!);
          await this.fileSystemService.createDirLink(hostAssetsFolder, assetsDirectoryPath);
        }
      }

      // workaround
      assetsArray.push(`src/assets/${dep.moduleName}`);
    }

    // workaround
    await this.fileSystemService.saveObjectToFile(ngJsonPath, ngJson);
  }

  private async referenceGlobalStyles() {
    const stylesScss = await this.fileSystemService.readFileLineByLine(
      this.fileSystemService.join(this.basePath, this.srcBasePath, 'styles.scss')
    );

    for (const dep of this.allRecursiveDependencies) {
      if (!dep.stylesFilePathRelativeToBasePath) {
        continue;
      }
      let finalStyleImportPath: string;
      if (await dep.preCompiled()) {
        const stylePathRelativeToPackageBase = await this.fileSystemService.ensureRelativePath(
          dep.stylesFilePathRelativeToBasePath,
          this.fileSystemService.getDirectoryPathFromFilePath(dep.srcBasePath),
          true
        );

        finalStyleImportPath = this.fileSystemService.join(
          dep.packageName ? `@${dep.packageName}` : '',
          dep.moduleName!,
          stylePathRelativeToPackageBase
        );
      } else {
        const absoluteStylesFilePathOfDep = this.fileSystemService.join(dep.basePath, dep.stylesFilePathRelativeToBasePath);

        // Copying base styles if they exist
        if (await this.fileSystemService.fileExists(absoluteStylesFilePathOfDep)) {
          const depAbsoluteSrcFolder = this.fileSystemService.join(dep.basePath, dep.srcBasePath);

          const depStylesPathRelativeToSrcBase = await this.fileSystemService.ensureRelativePath(
            absoluteStylesFilePathOfDep,
            depAbsoluteSrcFolder,
            true
          );
          const dependencyPathRelativeFromSrcBase = await this.fileSystemService.ensureRelativePath(
            this.gahFolder.dependencyPath,
            this.srcBasePath,
            true
          );

          finalStyleImportPath = this.fileSystemService.join(
            dependencyPathRelativeFromSrcBase,
            dep.moduleName!,
            depStylesPathRelativeToSrcBase
          );
        } else {
          throw new Error(
            `Could not find styles file "${dep.stylesFilePathRelativeToBasePath}" defined by module "${dep.moduleName}"`
          );
        }
      }
      stylesScss.push(`@import "${finalStyleImportPath}";`);
    }
    this.fileSystemService.saveFile(
      this.fileSystemService.join(this.basePath, this.srcBasePath, 'styles.scss'),
      stylesScss.join('\n')
    );
  }

  private async mergePackageDependencies() {
    const packageJsonPath = this.fileSystemService.join(this.basePath, 'package.json');
    // Get package.json from host
    const thisPackageJson = await this.getPackageJson();
    const hostDeps = thisPackageJson.dependencies!;
    const hostDevDeps = thisPackageJson.devDependencies!;

    const blocklistPackages = new Array<string>();

    for (const dep of this.allRecursiveDependencies) {
      blocklistPackages.push(`@${dep.packageName}/${dep.moduleName!}`);
    }

    for (const dep of this.allRecursiveDependencies) {
      // Get package.json from module to installed into host
      const externalPackageJson = await dep.getPackageJson();

      // Getting dependency objects from host and module
      const externalDeps = externalPackageJson!.dependencies!;
      const externalDevDeps = externalPackageJson!.devDependencies;

      // Filtering some unwanted packages
      const deps = Object.keys(externalDeps)
        .filter(x => blocklistPackages.indexOf(x) === -1)
        .filter(x => dep.excludedPackages.indexOf(x) === -1);

      // Merging module dependencies into host
      deps.forEach(d => {
        const isNewer =
          !hostDeps[d] ||
          compareVersions(hostDeps[d].replace('~', '').replace('^', ''), externalDeps[d].replace('~', '').replace('^', '')) ===
            -1;

        if (isNewer) {
          hostDeps[d] = externalDeps[d];
        }
      });

      // check if the module has devDependencies
      if (externalDevDeps) {
        // Filtering some unwanted packages
        const devDeps = Object.keys(externalDevDeps)
          .filter(x => blocklistPackages.indexOf(x) === -1)
          .filter(x => dep.excludedPackages.indexOf(x) === -1);

        // Merging module devDependencies into host
        devDeps.forEach(d => {
          const isEntry = dep.isEntry;
          const isNewer =
            hostDevDeps[d] &&
            compareVersions(
              hostDevDeps[d].replace('~', '').replace('^', ''),
              externalDevDeps[d].replace('~', '').replace('^', '')
            );

          if (!hostDevDeps[d] || isEntry || (!isEntry && isNewer)) {
            hostDevDeps[d] = externalDevDeps[d];
          }
        });
      }
    }

    // Override everything with dependencies from entry module
    const entryModule = this.allRecursiveDependencies.find(x => x.isEntry);
    if (entryModule) {
      const entryModulePackageJson = await entryModule.getPackageJson();
      const entryDependenciess = entryModulePackageJson.dependencies!;
      const entryDevDependenciess = entryModulePackageJson.devDependencies!;

      Object.keys(entryDependenciess).forEach(entryDependency => {
        hostDeps[entryDependency] = entryDependenciess[entryDependency];
      });
      Object.keys(entryDevDependenciess).forEach(entryDevDependency => {
        hostDevDeps[entryDevDependency] = entryDevDependenciess[entryDevDependency];
      });
    }

    // Saving the file back into the host package.json
    await this.fileSystemService.saveObjectToFile(packageJsonPath, thisPackageJson);
  }

  private async adjustAngularJsonConfig() {
    if (!this._ngOptions.aot) {
      this._angularJson.projects['gah-host'].architect.build.options.aot = false;

      const configs = this._angularJson.projects['gah-host'].architect.build.configurations;
      const keys = Object.keys(configs);
      keys.forEach(key => {
        // buildOptimizer is only available when using aot. We have to disable it for all configurations
        if (configs[key].buildOptimizer !== undefined) {
          configs[key].buildOptimizer = false;
        }
      });
    }
    await this.fileSystemService.saveObjectToFile(this._ngJsonPath, this._angularJson, true);
  }

  private async adjustHostFiles() {
    const indexHtmlPath = this.fileSystemService.join(this.basePath, this.srcBasePath, 'index.html');
    let htmlContent = await this.fileSystemService.readFile(indexHtmlPath);

    if (this._indexHtmlLines.length > 0) {
      const content = `<!--[custom]-->\n  ${this._indexHtmlLines.join('\n  ')}\n  <!--[custom]-->`;
      htmlContent = htmlContent.replace('<!--[htmlHeadContent]-->', content);
    }

    htmlContent = htmlContent.replace('<!--[title]-->', `<title>${this._title}</title>`);

    this.fileSystemService.saveFile(indexHtmlPath, htmlContent);

    if (this._browsersList) {
      const browsersListPath = this.fileSystemService.join(this.basePath, '.browserslistrc');
      this.fileSystemService.saveFile(
        browsersListPath,
        `# Generated based on your gah-host.json settings\n\n${this._browsersList}`
      );
    }
    const webCfgPath = this.fileSystemService.join(this._gahCfgFolder, 'web.config');
    if (await this.fileSystemService.fileExists(webCfgPath)) {
      const webCfgDestPath = this.fileSystemService.join(this.basePath, this.srcBasePath);
      await this.fileSystemService.copyFile(webCfgPath, webCfgDestPath);
    }
  }

  private async generateEnvFolderIfNeeded() {
    const envDirPath = this.fileSystemService.join(this._gahCfgFolder, 'env');
    await this.fileSystemService.ensureDirectory(envDirPath);
    const envFilePath = this.fileSystemService.join(envDirPath, 'environment.json');
    if (!(await this.fileSystemService.fileExists(envFilePath))) {
      await this.fileSystemService.saveObjectToFile(envFilePath, { production: false });
      const envProdFilePath = this.fileSystemService.join(envDirPath, 'environment.prod.json');
      if (!(await this.fileSystemService.fileExists(envProdFilePath))) {
        await this.fileSystemService.saveObjectToFile(envProdFilePath, { production: true });
      }
    }
  }

  private async collectModuleScripts() {
    type ScriptDef = { name: string; script: string; moduleName: string };

    const allGahScripts = new Array<ScriptDef>();
    for (const dep of this.allRecursiveDependencies) {
      const packageJson = await dep.getPackageJson();
      if (!packageJson.scripts) {
        return;
      }
      Object.keys(packageJson.scripts).forEach(scriptName => {
        if (scriptName.startsWith('gah-') && scriptName !== 'gah-preinstall' && scriptName !== 'gah-postinstall') {
          const simpleScriptName = scriptName.substring(4);

          const existingScript = allGahScripts.find(x => x.name === simpleScriptName);

          if (existingScript) {
            this.loggerService.warn(
              `The gah-script named "${simpleScriptName}" is declared multiple times. (${
                existingScript.moduleName
              } & ${dep.moduleName!})`
            );
          } else {
            allGahScripts.push({
              name: simpleScriptName,
              script: packageJson.scripts![scriptName]!,
              moduleName: dep.moduleName!
            });
          }
        }
      });
    }

    const pkgJson = await this.getPackageJson();

    if (allGahScripts.length > 0) {
      pkgJson!.scripts ??= {};

      allGahScripts.forEach(script => {
        pkgJson!.scripts![script.name] = script.script;
      });

      this.fileSystemService.saveObjectToFile(this.packageJsonPath, pkgJson);
    }
  }

  private setAngularCompilerOptionsInTsConfig() {
    return this.tsConfigFile.setAngularCompilerOptions(this._ngCompilerOptions);
  }
}
