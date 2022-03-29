import { render } from 'ejs';

import { ITemplateService, IFileSystemService } from '@gah/shared';

import { FileSystemService } from './file-system.service';
export class TemplateService implements ITemplateService {
  private readonly _fileSystemService: IFileSystemService;

  constructor(fileSystemService: FileSystemService) {
    this._fileSystemService = fileSystemService;
  }

  public async renderFile<T extends { [key: string]: any }>(sourceFilePath: string, data: T, outputFilePath: string) {
    const template = await this._fileSystemService.readFile(sourceFilePath);
    const renderedString = render(template, data);
    await this._fileSystemService.saveFile(outputFilePath, renderedString);
  }
}
