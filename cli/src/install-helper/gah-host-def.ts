import { GahModuleBase } from './gah-module-base';
import {
  GahHost, PackageJson, GahModuleData
} from '@awdware/gah-shared';
import { GahModuleDef } from './gah-module-def';
import { GahFolder } from './gah-folder';
import readline from 'readline';

export class GahHostDef extends GahModuleBase {
  private readonly _ngOptions: { aot: boolean } = {} as any;
  private readonly _indexHtmlLines: string[];
  private readonly _baseHref: string;
  private readonly _title: string;
  private readonly _gahCfgFolder: string;

  constructor(gahCfgPath: string, initializedModules: GahModuleBase[]) {
    super(gahCfgPath, null);
    this.isHost = true;

    this._gahCfgFolder = this.fileSystemService.ensureAbsolutePath(this.fileSystemService.getDirectoryPathFromFilePath(gahCfgPath));
    this.basePath = this.fileSystemService.join(this._gahCfgFolder, '.gah');
    this.srcBasePath = './src';

    const hostCfg = this.fileSystemService.parseFile<GahHost>(gahCfgPath);
    if (!hostCfg) {
      throw new Error(`Cannot find host in file "${gahCfgPath}"`);
    }
    hostCfg.modules?.forEach(moduleDependency => {
      moduleDependency.names.forEach(depModuleName => {
        const alreadyInitialized = initializedModules.find(x => x.moduleName === depModuleName);
        if (alreadyInitialized) {
          this.dependencies.push(alreadyInitialized);
        } else {
          this.dependencies.push(new GahModuleDef(moduleDependency.path, depModuleName, initializedModules));
        }
      });
    });
    this._ngOptions.aot = hostCfg.aot ?? true; // If not set the default value is true
    this._indexHtmlLines = hostCfg.htmlHeadContent ? (Array.isArray(hostCfg.htmlHeadContent) ? hostCfg.htmlHeadContent : [hostCfg.htmlHeadContent]) : [];
    this._baseHref = hostCfg.baseHref ? hostCfg.baseHref : '/';
    this._title = hostCfg.title ?? '';
    this.gahFolder = new GahFolder(this.basePath, `${this.srcBasePath}/app`);
  }

  public specificData(): Partial<GahModuleData> {
    return {
      ngOptions: this._ngOptions
    };
  }

  public async install() {
    if (this.installed) {
      return;
    }
    this.initTsConfigObject();
    this.installed = true;

    await this.executePreinstallScripts();
    this.tsConfigFile.clean();
    this.pluginService.triggerEvent('TS_CONFIG_CLEANED', { module: this.data() });
    this.gahFolder.cleanGeneratedDirectory();
    this.gahFolder.cleanDependencyDirectory();
    this.gahFolder.cleanStylesDirectory();
    this.pluginService.triggerEvent('GAH_FOLDER_CLEANED', { module: this.data() });

    this.fileSystemService.deleteFilesInDirectory(this.fileSystemService.join(this.basePath, this.srcBasePath, 'assets'));
    this.fileSystemService.ensureDirectory(this.fileSystemService.join(this.basePath, this.srcBasePath, 'assets'));
    this.fileSystemService.deleteFile(this.fileSystemService.join(this.basePath, this.srcBasePath, 'styles.scss'));
    this.fileSystemService.saveFile(this.fileSystemService.join(this.basePath, this.srcBasePath, 'styles.scss'),
      ''
      + '/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *\n'
      + ' *   Please do not edit this file. Any changes to this file will be overwriten by gah.   *\n'
      + ' *              Check the documentation for how to edit your global styles:              *\n'
      + ' *                          https://github.com/awdware/gah/wiki                          *\n'
      + ' * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */\n');
    this.pluginService.triggerEvent('STYLES_FILE_GENERATED', { module: this.data() });

    await this.createSymlinksToDependencies();
    this.pluginService.triggerEvent('SYMLINKS_CREATED', { module: this.data() });

    this.addDependenciesToTsConfigFile();
    this.pluginService.triggerEvent('TS_CONFIG_ADJUSTED', { module: this.data() });
    this.generateFromTemplate();
    this.pluginService.triggerEvent('TEMPLATE_GENERATED', { module: this.data() });
    this.copyAssets();
    this.pluginService.triggerEvent('ASSETS_COPIED', { module: this.data() });
    this.referenceGlobalStyles();
    this.pluginService.triggerEvent('STYLES_REFERENCED', { module: this.data() });
    this.mergePackageDependencies();
    this.pluginService.triggerEvent('DEPENDENCIES_MERGED', { module: this.data() });
    this.generateStyleImports();
    this.pluginService.triggerEvent('STYLE_IMPORTS_GENERATED', { module: this.data() });
    this.adjustGitignore();
    this.adjustGitignoreForHost();
    this.pluginService.triggerEvent('GITIGNORE_ADJUSTED', { module: this.data() });
    this.adjustAngularJsonConfig();
    this.pluginService.triggerEvent('ANGULAR_JSON_ADJUSTED', { module: this.data() });
    this.adjustIndexHtml();
    this.pluginService.triggerEvent('INDEX_HTML_ADJUSTED', { module: this.data() });
    this.adjustWebConfig();
    this.pluginService.triggerEvent('WEB_CONFIG_ADJUSTED', { module: this.data() });

    this.collectModuleScripts();

    await this.installPackages();
    this.pluginService.triggerEvent('PACKAGES_INSTALLED', { module: this.data() });

    this.generateEnvFolderIfNeeded();

    await this.executePostinstallScripts();
  }

  private adjustGitignoreForHost() {
    this.workspaceService.ensureGitIgnoreLine('src/assets/**', 'Ignoring gah generated assets', this.basePath);
  }

  private generateFromTemplate() {
    for (const dep of this.allRecursiveDependencies) {
      this.gahFolder.addGeneratedFileTemplateData(dep.moduleName!, dep.packageName!, dep.isEntry, dep.baseNgModuleName);
    }
    this.pluginService.triggerEvent('TEMPLATE_DATA_GENERATED', { module: this.data() });

    this.gahFolder.generateFileFromTemplate();
  }

  private async installPackages() {
    this.loggerService.log('Installing yarn packages');
    let state = 0;
    let stateString = 'Installing yarn packages';
    const success = await this.executionService.execute('yarn', true, (test) => {

      // This is just for super fancy logging:

      if (test.indexOf('Done in') !== -1) {
        state = 4;
        stateString = 'Done.';
      } else if (test.indexOf('[4/4]') !== -1) {
        state = 4;
        stateString = 'Building fresh packages';
      } else if (test.indexOf('[3/4]') !== -1) {
        state = 3;
        stateString = 'Linking dependencies';
      } else if (test.indexOf('[2/4]') !== -1) {
        state = 2;
        stateString = 'Fetching packages';
      } else if (test.indexOf('[1/4]') !== -1) {
        state = 1;
        stateString = 'Resolving packages';
      }

      this.loggerService.interruptLoading(() => {
        readline.cursorTo(process.stdout, 0, process.stdout.rows - 2);
        readline.clearLine(process.stdout, 0);
      });
      this.loggerService.log(`${this.loggerService.getProgressBarString(4, state)} [${state}/4] ${stateString}`);
      return '';

      // Super fancy logging end.
    }, '.gah');

    this.loggerService.interruptLoading(() => {
      readline.cursorTo(process.stdout, 0, process.stdout.rows - 2);
      readline.clearLine(process.stdout, 0);
    });

    if (success) {
      this.loggerService.success('Packages installed successfully');
    } else {
      this.loggerService.error('Installing packages failed');
      this.loggerService.error(this.executionService.executionErrorResult);
    }
  }

  private copyAssets() {
    for (const dep of this.allRecursiveDependencies) {
      if (!dep.assetsFolderRelativeTobasePaths || (Array.isArray(dep.assetsFolderRelativeTobasePaths) && dep.assetsFolderRelativeTobasePaths.length === 0)) {
        continue;
      }

      const assetsFolderRelativeTobasePaths = Array.isArray(dep.assetsFolderRelativeTobasePaths) ? dep.assetsFolderRelativeTobasePaths : [dep.assetsFolderRelativeTobasePaths];

      assetsFolderRelativeTobasePaths.forEach(p => {
        const assetsDirectoryPath = this.fileSystemService.join(dep.basePath, p);

        // Copying assets
        if (this.fileSystemService.directoryExists(assetsDirectoryPath)) {
          const hostAssetsFolder = this.fileSystemService.join(this.basePath, this.srcBasePath, 'assets', dep.moduleName!);
          this.fileSystemService.copyFilesInDirectory(assetsDirectoryPath, hostAssetsFolder);
          // Symlinks are not copied to dist folder (bug ?)
          // this.fileSystemService.createDirLink(hostAssetsFolder, absoluteAssetsFolderOfDep);
          // Possible fix: Include symlinked folder directly in assets config in angular json
        }
      });
    }
  }

  private referenceGlobalStyles() {
    const stylesScss = this.fileSystemService.readFileLineByLine(this.fileSystemService.join(this.basePath, this.srcBasePath, 'styles.scss'));

    for (const dep of this.allRecursiveDependencies) {
      if (!dep.stylesFilePathRelativeToBasePath) {
        continue;
      }

      const absoluteStylesFilePathOfDep = this.fileSystemService.join(dep.basePath, dep.stylesFilePathRelativeToBasePath);

      // Copying base styles if they exist
      if (this.fileSystemService.fileExists(absoluteStylesFilePathOfDep)) {

        const depAbsoluteSrcFolder = this.fileSystemService.join(dep.basePath, dep.srcBasePath);

        const depStylesPathRelativeToSrcBase = this.fileSystemService.ensureRelativePath(absoluteStylesFilePathOfDep, depAbsoluteSrcFolder, true);
        const dependencyPathRelativeFromSrcBase = this.fileSystemService.ensureRelativePath(this.gahFolder.dependencyPath, this.srcBasePath, true);

        const moduleFacadePath = this.fileSystemService.join(dependencyPathRelativeFromSrcBase, dep.moduleName!, depStylesPathRelativeToSrcBase);
        stylesScss.push(`@import "${moduleFacadePath}";`);
      } else {
        this.loggerService.warn(`Could not find styles file "${dep.stylesFilePathRelativeToBasePath}" defined by module "${dep.moduleName}"`);
      }
    }
    this.fileSystemService.saveFile(this.fileSystemService.join(this.basePath, this.srcBasePath, 'styles.scss'), stylesScss.join('\n'));
  }

  private mergePackageDependencies() {
    const packageJsonPath = this.fileSystemService.join(this.basePath, 'package.json');
    // Get package.json from host
    const packageJson = this.fileSystemService.parseFile<PackageJson>(packageJsonPath);
    const hostDeps = packageJson.dependencies!;
    const hostDevDeps = packageJson.devDependencies!;

    const blocklistPackages = new Array<string>();

    for (const dep of this.allRecursiveDependencies) {
      blocklistPackages.push(`@${dep.packageName}/${dep.moduleName!}`);
    }

    for (const dep of this.allRecursiveDependencies) {
      // Get package.json from module to installed into host
      const externalPackageJson = dep.packageJson;

      // Getting (dev-)dependency objects from host and module
      const externalDeps = externalPackageJson.dependencies!;
      const externalDevDeps = externalPackageJson.devDependencies!;

      const deps = Object.keys(externalDeps).filter(x => blocklistPackages.indexOf(x) === - 1);
      const devDeps = Object.keys(externalDevDeps);

      // Merging module (dev-)dependencies into host
      deps.forEach((d) => {
        if (!hostDeps[d] || dep.isEntry) {
          hostDeps[d] = externalDeps[d];
        }
      });
      devDeps.forEach((d) => {
        if (!hostDevDeps[d] || dep.isEntry) {
          hostDevDeps[d] = externalDevDeps[d];
        }
      });

    }

    // Saving the file back into the host package.json
    this.fileSystemService.saveObjectToFile(packageJsonPath, packageJson);
  }

  private adjustAngularJsonConfig() {
    const ngJsonPath = this.fileSystemService.join(this.basePath, 'angular.json');
    const ngJson = this.fileSystemService.parseFile<any>(ngJsonPath);
    if (!this._ngOptions.aot) {
      ngJson.projects['gah-host'].architect.build.options.aot = false;

      const configs = ngJson.projects['gah-host'].architect.build.configurations;
      const keys = Object.keys(configs);
      keys.forEach(key => {
        // buildOptimizer is only available when using aot. We have to disable it for all configurations
        if (configs[key].buildOptimizer !== undefined) {
          configs[key].buildOptimizer = false;
        }
      });
    }
    this.fileSystemService.saveObjectToFile(ngJsonPath, ngJson, true);
  }

  private adjustIndexHtml() {
    const indexHtmlPath = this.fileSystemService.join(this.basePath, this.srcBasePath, 'index.html');
    let htmlContent = this.fileSystemService.readFile(indexHtmlPath);

    if (this._indexHtmlLines.length > 0) {
      const content = `<!--[custom]-->\n  ${this._indexHtmlLines.join('\n  ')}\n  <!--[custom]-->`;
      htmlContent = htmlContent.replace('<!--[htmlHeadContent]-->', content);
    }

    htmlContent = htmlContent.replace('<!--[title]-->', `<title>${this._title}</title>`);

    this.fileSystemService.saveFile(indexHtmlPath, htmlContent);
  }

  private adjustWebConfig() {
    if (this._baseHref) {
      const webConfigPath = this.fileSystemService.join(this.basePath, this.srcBasePath, 'web.config');
      let webConfigContent = this.fileSystemService.readFile(webConfigPath);
      webConfigContent = webConfigContent.replace(/(<action type="Rewrite" url=")([\w/_-]+)(")/, `$1${this._baseHref}$3`);
      this.fileSystemService.saveFile(webConfigPath, webConfigContent);
    }
  }

  private generateEnvFolderIfNeeded() {
    const envDirPath = this.fileSystemService.join(this._gahCfgFolder, 'env');
    this.fileSystemService.ensureDirectory(envDirPath);
    const envFilePath = this.fileSystemService.join(envDirPath, 'environment.json');
    if(!this.fileSystemService.fileExists(envFilePath)) {
      this.fileSystemService.saveObjectToFile(envFilePath, {production: false});
      const envProdFilePath = this.fileSystemService.join(envDirPath, 'environment.prod.json');
      if(!this.fileSystemService.fileExists(envProdFilePath)) {
        this.fileSystemService.saveObjectToFile(envProdFilePath, {production: true});
      }
    }
  }

  private collectModuleScripts() {
    type ScriptDef = {name: string, script: string, moduleName: string};

    const allGahScripts = new Array<ScriptDef>();
    this.allRecursiveDependencies.forEach(m => {
      if(!m.packageJson.scripts) {
        return;
      }
      Object.keys(m.packageJson.scripts).forEach(scriptName => {
        if(scriptName.startsWith('gah-') && scriptName !== 'gah-preinstall' && scriptName !== 'gah-postinstall') {
          const simpleScriptName = scriptName.substring(4);

          const existingScript = allGahScripts.find(x => x.name === simpleScriptName);

          if(existingScript) {
            this.loggerService.warn(`The gah-script named "${simpleScriptName}" is declared multiple times. (${existingScript.moduleName} & ${m.moduleName!})`);
          } else {
            allGahScripts.push(
              {
                name: simpleScriptName,
                script: m.packageJson.scripts![scriptName]!,
                moduleName: m.moduleName!
              }
            );
          }
        }
      });
    });

    const pkgJson = this.packageJson;

    if(allGahScripts.length > 0) {
      if(!pkgJson.scripts) {
        pkgJson.scripts = {};
      }

      allGahScripts.forEach(script => {
        pkgJson.scripts![script.name] = script.script;
      });

      this.fileSystemService.saveObjectToFile(this.packageJsonPath, pkgJson);
    }
  }

}
