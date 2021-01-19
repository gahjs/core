import { IFileSystemService, ModuleTemplateData, ModulesTemplateData, ITemplateService, GahFolderData } from '@gah/shared';
import { DIContainer } from '../di-container';
import { FileSystemService } from '../services/file-system.service';
import { TemplateService } from '../services/template.service';
import { platform } from 'os';

export class GahFolder {
  private readonly _fileSystemService: IFileSystemService;
  private readonly _templateService: ITemplateService;

  private readonly _gahCfgFolder: string;
  private readonly _moduleBaseFolder: string;
  private readonly _pathRelativeToModuleBaseFolder: string;
  private readonly _modulesTemplateData: ModulesTemplateData;

  constructor(moduleBaseFolder: string, srcBasePath: string, gahCfgFolder?: string) {
    this._fileSystemService = DIContainer.resolve<FileSystemService>('fileSystemService');
    this._templateService = DIContainer.resolve<TemplateService>('templateService');
    this._modulesTemplateData = new ModulesTemplateData();

    this._gahCfgFolder = gahCfgFolder ?? moduleBaseFolder;
    this._moduleBaseFolder = moduleBaseFolder;
    this._pathRelativeToModuleBaseFolder = this._fileSystemService.join(srcBasePath, '.gah');
  }

  public data(): GahFolderData {
    return {
      dependencyPath: this.dependencyPath,
      generatedPath: this.generatedPath,
      moduleBaseFolder: this._moduleBaseFolder,
      modulesTemplateData: this._modulesTemplateData,
      pathRelativeToModuleBaseFolder: this._pathRelativeToModuleBaseFolder,
      stylesPath: this.stylesPath
    };
  }

  public get path(): string {
    return this._gahCfgFolder;
  }

  public get dependencyPath(): string {
    return this._fileSystemService.join(this._pathRelativeToModuleBaseFolder, 'dependencies');
  }

  public get stylesPath(): string {
    return this._fileSystemService.join(this._pathRelativeToModuleBaseFolder, 'styles');
  }

  public get precompiledPath(): string {
    return this._fileSystemService.join(this._moduleBaseFolder, '.gah', 'precompiled');
  }

  public get generatedPath(): string {
    return this._fileSystemService.join(this._pathRelativeToModuleBaseFolder, 'generated');
  }

  public async cleanDependencyDirectory() {
    await this._fileSystemService.deleteFilesInDirectory(
      this._fileSystemService.join(this._moduleBaseFolder, this.dependencyPath)
    );
    await this._fileSystemService.ensureDirectory(this._fileSystemService.join(this._moduleBaseFolder, this.dependencyPath));
  }

  public async cleanStylesDirectory() {
    await this._fileSystemService.deleteFilesInDirectory(this._fileSystemService.join(this._moduleBaseFolder, this.stylesPath));
    await this._fileSystemService.ensureDirectory(this._fileSystemService.join(this._moduleBaseFolder, this.stylesPath));
  }

  public async cleanPrecompiledFolder() {
    await this._fileSystemService.deleteFilesInDirectory(this.precompiledPath);
    await this._fileSystemService.ensureDirectory(this.precompiledPath);
    if (platform() === 'win32') {
      const fswin = require('fswin');
      fswin.setAttributesSync(this.precompiledPath, { IS_HIDDEN: true });
    }
  }

  public async cleanGeneratedDirectory() {
    await this._fileSystemService.deleteFilesInDirectory(
      this._fileSystemService.join(this._moduleBaseFolder, this.generatedPath)
    );
    await this._fileSystemService.ensureDirectory(this._fileSystemService.join(this._moduleBaseFolder, this.generatedPath));
  }

  public async tryHideGahFolder() {
    if (platform() === 'win32') {
      const fswin = require('fswin');
      await new Promise((resolve, reject) => {
        fswin.setAttributes(
          this._fileSystemService.join(this._moduleBaseFolder, this._pathRelativeToModuleBaseFolder),
          { IS_HIDDEN: true },
          (succeeded: boolean) => (succeeded ? resolve(null) : reject(null))
        );
      });
    }
  }

  public addGeneratedFileTemplateData(
    moduleName: string,
    packageName: string,
    isEntry: boolean,
    baseNgModuleName?: string,
    parentGahModule?: string
  ) {
    // Get a save name of a module removing some special chars. Mainly dots are probably used in names and have to be replaced.
    const saveModuleName = moduleName.replace(/[.*:$-]/g, '_');
    // Generationg data for the ejs template generation generating the gah-modules.ts
    const newTemplateData = new ModuleTemplateData();
    newTemplateData.name = moduleName;
    newTemplateData.packageName = packageName;
    newTemplateData.isEntry = isEntry || false;
    newTemplateData.isLibraryOnly = !baseNgModuleName;
    newTemplateData.baseModuleName = baseNgModuleName;
    newTemplateData.saveName = saveModuleName;
    newTemplateData.staticModuleInit = '';
    newTemplateData.parentGahModule = parentGahModule ?? null;
    this._modulesTemplateData.modules.push(newTemplateData);
  }

  public async generateFileFromTemplate() {
    this._templateService.renderFile(
      this._fileSystemService.join(__dirname, '../templates/modules.ejs.t'),
      this._modulesTemplateData,
      this._fileSystemService.join(this._moduleBaseFolder, this.generatedPath, 'gah-modules.ts')
    );
  }
}
