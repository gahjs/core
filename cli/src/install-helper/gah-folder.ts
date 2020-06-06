import { IFileSystemService, ModuleTemplateData, ModulesTemplateData, ITemplateService } from '@awdware/gah-shared';
import DIContainer from '../di-container';
import { FileSystemService } from '../services/file-system.service';
import { TemplateService } from '../services/template.service';
import { platform } from 'os';

export class GahFolder {
  private _fileSystemService: IFileSystemService;
  private _templateService: ITemplateService;

  private _moduleBaseFolder: string;
  private pathRelativeToModuleBaseFolder: string;
  private _modulesTemplateData: ModulesTemplateData;

  constructor(moduleBaseFolder: string, srcBasePath: string) {
    this._fileSystemService = DIContainer.get(FileSystemService);
    this._templateService = DIContainer.get(TemplateService);
    this._modulesTemplateData = new ModulesTemplateData();

    this._moduleBaseFolder = moduleBaseFolder;
    this.pathRelativeToModuleBaseFolder = this._fileSystemService.join(srcBasePath, '.gah');
  }

  public get dependencyPath(): string {
    return this._fileSystemService.join(this.pathRelativeToModuleBaseFolder, 'dependencies');
  }

  public get stylesPath(): string {
    return this._fileSystemService.join(this.pathRelativeToModuleBaseFolder, 'styles');
  }

  public get generatedPath(): string {
    return this._fileSystemService.join(this.pathRelativeToModuleBaseFolder, 'generated');
  }

  public cleanDependencyDirectory() {
    this._fileSystemService.deleteFilesInDirectory(this._fileSystemService.join(this._moduleBaseFolder, this.dependencyPath));
    this._fileSystemService.ensureDirectory(this._fileSystemService.join(this._moduleBaseFolder, this.dependencyPath));
  }

  public cleanStylesDirectory() {
    this._fileSystemService.ensureDirectory(this._fileSystemService.join(this._moduleBaseFolder, this.stylesPath));
    this._fileSystemService.deleteFilesInDirectory(this._fileSystemService.join(this._moduleBaseFolder, this.stylesPath));
  }

  public cleanGeneratedDirectory() {
    this._fileSystemService.deleteFilesInDirectory(this._fileSystemService.join(this._moduleBaseFolder, this.generatedPath));
    this._fileSystemService.ensureDirectory(this._fileSystemService.join(this._moduleBaseFolder, this.generatedPath));
  }

  public tryHideGahFolder() {
    if (platform() === 'win32') {
      const fswin = require('fswin');
      fswin.setAttributesSync(this._fileSystemService.join(this._moduleBaseFolder, this.pathRelativeToModuleBaseFolder), { IS_HIDDEN: true });
    }
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

  public generateFileFromTemplate() {
    this._templateService.renderFile(
      this._fileSystemService.join(__dirname, '../templates/modules.ejs.t'),
      this._modulesTemplateData,
      this._fileSystemService.join(this._moduleBaseFolder, this.generatedPath, 'gah-modules.ts')
    );
  }
}
