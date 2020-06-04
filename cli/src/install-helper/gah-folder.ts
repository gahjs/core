import { IFileSystemService, ModuleTemplateData, ModulesTemplateData } from '@awdware/gah-shared';

export class GahFolder {
  private _fileSystemService: IFileSystemService;
  private _moduleBaseFolder: string;
  private pathRelativeToModuleBaseFolder: string;
  private _modulesTemplateData: ModulesTemplateData;

  constructor(moduleBaseFolder: string, srcBasePath: string, fileSystemService: IFileSystemService) {
    this._fileSystemService = fileSystemService;
    this._modulesTemplateData = new ModulesTemplateData();

    this._moduleBaseFolder = moduleBaseFolder;
    this.pathRelativeToModuleBaseFolder = this._fileSystemService.join(srcBasePath, '.gah');
  }

  public get dependencyPath(): string {
    return this._fileSystemService.join(this._moduleBaseFolder, this.pathRelativeToModuleBaseFolder, 'dependencies');
  }

  public get stylesPath(): string {
    return this._fileSystemService.join(this._moduleBaseFolder, this.pathRelativeToModuleBaseFolder, 'styles');
  }

  public get generatedPath(): string {
    return this._fileSystemService.join(this._moduleBaseFolder, this.pathRelativeToModuleBaseFolder, 'generated');
  }

  public cleanDependencyDirectory() {
    this._fileSystemService.deleteFilesInDirectory(this.dependencyPath);
    this._fileSystemService.ensureDirectory(this.dependencyPath);
  }

  public cleanStylesDirectory() {
    this._fileSystemService.ensureDirectory(this.stylesPath);
    this._fileSystemService.deleteFilesInDirectory(this.stylesPath);
  }

  public cleanGeneratedDirectory() {
    this._fileSystemService.deleteFilesInDirectory(this.generatedPath);
    this._fileSystemService.ensureDirectory(this.generatedPath);
  }

  public addGeneratedFileTemplateData(moduleName: string, isEntry: boolean, baseNgModuleName?: string) {
    // Get a save name of a module removing some special chars. Mainly dots are probably used in names and have to be replaced.
    const saveModuleName = moduleName.replace(/[.*:$]/g, '_');
    // Generationg data for the ejs template generation generating the gah-modules.ts
    const newTemplateData = new ModuleTemplateData();
    newTemplateData.name = moduleName;
    newTemplateData.isEntry = isEntry || false;
    newTemplateData.isLibraryOnly = !baseNgModuleName;
    newTemplateData.baseModuleName = baseNgModuleName;
    newTemplateData.saveName = saveModuleName;
    this._modulesTemplateData.modules.push(newTemplateData);
  }
}
