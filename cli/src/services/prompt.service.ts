import { IPromptService, PromptConfig, FuzzyPathPromptConfig, SelectionPromptConfig, IFileSystemService } from '@gah/shared';

import { prompt } from 'enquirer';
import { FileSystemService } from './file-system.service';
import { AwesomeLogger } from 'awesome-logging';
export class PromptService implements IPromptService {
  private readonly _fileSystemService: IFileSystemService;

  constructor(fileSystemService: FileSystemService) {
    this._fileSystemService = fileSystemService;
  }

  public async input(cfg: PromptConfig): Promise<string> {
    if (!cfg.enabled()) {
      return '';
    }
    return AwesomeLogger.prompt('text', {
      text: cfg.msg,
      default: cfg.default,
      validator: cfg.validator
    }).result;
  }

  public async confirm(cfg: PromptConfig): Promise<boolean> {
    return prompt({
      type: 'confirm',
      name: '_',
      message: cfg.msg,
      initial: cfg.default ?? false,
      skip: !cfg.enabled()
    }).then((_: any) => _._);
  }

  public async fuzzyPath(cfg: FuzzyPathPromptConfig): Promise<string> {
    const excludes = cfg.excludePattern || [];
    const allFiles = await this._fileSystemService.getFilesFromGlob(
      cfg.startingDirectory ? `${cfg.startingDirectory}/**` : '**',
      ['node_modules', ...excludes],
      undefined,
      cfg.itemType
    );

    const filteredFiles = (cfg.exclude ? allFiles.filter(x => !cfg.exclude!(x)) : allFiles).map(x => x.replace(/\\/g, '/'));

    const defaultIndex = filteredFiles.findIndex(x => x === cfg.default?.replace(/\\/g, '/'));

    const def = cfg.optional ? 0 : (cfg.default && defaultIndex) || undefined;

    if (filteredFiles.length === 0) {
      return '';
    }

    if (cfg.optional) {
      filteredFiles.splice(0, 0, filteredFiles.splice(defaultIndex, 1)[0]);
      filteredFiles.splice(0, 0, '');
    }

    return prompt({
      type: 'autocomplete',
      name: '_',
      message: cfg.msg,
      limit: 8,
      choices: filteredFiles,
      initial: def === -1 ? 0 : def ?? 0,
      skip: !cfg.enabled()
    } as any).then((_: any) => _._);
  }

  public async list(cfg: SelectionPromptConfig): Promise<string> {
    return prompt({
      type: 'select',
      name: '_',
      message: cfg.msg,
      choices: cfg.choices(),
      skip: !cfg.enabled()
    }).then((_: any) => _._);
  }

  public async checkbox(cfg: SelectionPromptConfig): Promise<string[]> {
    // Workaround for https://github.com/enquirer/enquirer/issues/298
    if (!cfg.enabled()) {
      return (undefined as any) as string[];
    }

    return prompt({
      type: 'multiselect',
      name: '_',
      message: cfg.msg,
      choices: cfg.choices(),
      skip: !cfg.enabled()
    }).then((_: any) => _._);
  }
}
