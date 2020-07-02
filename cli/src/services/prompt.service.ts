import { injectable, inject } from 'inversify';
import inquirer from 'inquirer';
import { IPromptService, PromptConfig, FuzzyPathPromptConfig, SelectionPromptConfig, IFileSystemService } from '@awdware/gah-shared';


import { prompt } from 'enquirer';
import { FileSystemService } from './file-system.service';

@injectable()
export class PromptService implements IPromptService {
  @inject(FileSystemService)
  private _fileSystemService: IFileSystemService;

  constructor() {

  }

  public async input(cfg: PromptConfig) {
    return prompt({
      type: 'input',
      name: '_',
      message: cfg.msg,
      initial: cfg.default,
      skip: cfg.cancelled || !cfg.enabled()
    }).then(_ => (_ as any)._);
  }

  public async confirm(cfg: PromptConfig) {
    return prompt({
      type: 'confirm',
      name: '_',
      message: cfg.msg,
      initial: cfg.default ?? false,
      skip: cfg.cancelled || !cfg.enabled()
    }).then(_ => (_ as any)._);
  }

  public async fuzzyPath(cfg: FuzzyPathPromptConfig) {
    const excludes = cfg.excludePattern || [];
    const allFiles = this._fileSystemService.getFilesFromGlob('**', ['node_modules', ...excludes], undefined, cfg.itemType);

    const filteredFiles = (cfg.exclude ? allFiles.filter(x => !cfg.exclude!(x)) : allFiles).map(x => x.replace(/\\/g, '/'));

    const def = cfg.default && filteredFiles.findIndex(x => x === cfg.default.replace(/\\/g, '/')) || undefined;

    return prompt({
      type: 'autocomplete',
      name: '_',
      message: cfg.msg,
      limit: 8,
      choices: filteredFiles,
      initial: def === -1 ? 0 : def ?? 0,
      skip: cfg.cancelled || !cfg.enabled()
    } as any).then(_ => (_ as any)._);
  }


  public async list(cfg: SelectionPromptConfig) {
    return prompt({
      type: 'list',
      name: '_',
      message: cfg.msg,
      choices: cfg.choices(),
      skip: cfg.cancelled || !cfg.enabled()
    }).then(_ => (_ as any)._);
  }

  public async checkbox(cfg: SelectionPromptConfig) {
    return prompt({
      type: 'multiselect',
      name: '_',
      message: cfg.msg,
      choices: cfg.choices(),
      skip: cfg.cancelled || !cfg.enabled()
    }).then(_ => (_ as any)._);
  }
}
