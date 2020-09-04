import { IFileSystemService, ModuleTemplateData, ModulesTemplateData, ITemplateService, GahFolderData } from '@awdware/gah-shared';
import DIContainer from '../di-container';
import { FileSystemService } from '../services/file-system.service';
import { TemplateService } from '../services/template.service';
import { platform } from 'os';

export class GahFolder {
  private readonly _fileSystemService: IFileSystemService;
  private readonly _templateService: ITemplateService;

  private readonly _moduleBaseFolder: string;
  private readonly _pathRelativeToModuleBaseFolder: string;
  private readonly _modulesTemplateData: ModulesTemplateData;

  constructor(moduleBaseFolder: string, srcBasePath: string) {
    this._fileSystemService = DIContainer.get(FileSystemService);
    this._templateService = DIContainer.get(TemplateService);
    this._modulesTemplateData = new ModulesTemplateData();

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

  public get dependencyPath(): string {
    return this._fileSystemService.join(this._pathRelativeToModuleBaseFolder, 'dependencies');
  }

  public get stylesPath(): string {
    return this._fileSystemService.join(this._pathRelativeToModuleBaseFolder, 'styles');
  }

  public get generatedPath(): string {
    return this._fileSystemService.join(this._pathRelativeToModuleBaseFolder, 'generated');
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
      fswin.setAttributesSync(this._fileSystemService.join(this._moduleBaseFolder, this._pathRelativeToModuleBaseFolder), { IS_HIDDEN: true });
    }
  }

  public addGeneratedFileTemplateData(moduleName: string, packageName: string, isEntry: boolean, baseNgModuleName?: string, parentGahModule?: string) {
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

  public generateFileFromTemplate() {
    this._templateService.renderFile(
      this._fileSystemService.join(__dirname, '../templates/modules.ejs.t'),
      this._modulesTemplateData,
      this._fileSystemService.join(this._moduleBaseFolder, this.generatedPath, 'gah-modules.ts')
    );
  }
}
