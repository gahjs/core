import ejs from 'ejs';

import { ITemplateService, IFileSystemService } from '@gah/shared';

import { FileSystemService } from './file-system.service';
export class TemplateService implements ITemplateService {
  private readonly _fileSystemService: IFileSystemService;

  constructor(fileSystemService: FileSystemService) {
    this._fileSystemService = fileSystemService;
  }

  public async renderFile<T>(sourceFilePath: string, data: T, outputFilePath: string) {
    const renderedString = await ejs.renderFile(sourceFilePath, data);
    await this._fileSystemService.saveFile(outputFilePath, renderedString);
  }
}
