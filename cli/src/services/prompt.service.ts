import { injectable, inject } from 'inversify';
import { IPromptService, PromptConfig, FuzzyPathPromptConfig, SelectionPromptConfig, IFileSystemService } from '@awdware/gah-shared';


import { prompt } from 'enquirer';
import { FileSystemService } from './file-system.service';

@injectable()
export class PromptService implements IPromptService {
  @inject(FileSystemService)
  private readonly _fileSystemService: IFileSystemService;

  constructor() {

  }

  public async input(cfg: PromptConfig) {
    return prompt({
      type: 'input',
      name: '_',
      message: cfg.msg,
      initial: cfg.default,
      skip: !cfg.enabled(),
      validate: cfg.validator
    }).then(_ => (_ as any)._);
  }

  public async confirm(cfg: PromptConfig) {
    return prompt({
      type: 'confirm',
      name: '_',
      message: cfg.msg,
      initial: cfg.default ?? false,
      skip: !cfg.enabled()
    }).then(_ => (_ as any)._);
  }

  public async fuzzyPath(cfg: FuzzyPathPromptConfig) {
    const excludes = cfg.excludePattern || [];
    const allFiles = this._fileSystemService.getFilesFromGlob('**', ['node_modules', ...excludes], undefined, cfg.itemType);

    const filteredFiles = (cfg.exclude ? allFiles.filter(x => !cfg.exclude!(x)) : allFiles).map(x => x.replace(/\\/g, '/'));

    const defaultIndex = filteredFiles.findIndex(x => x === cfg.default?.replace(/\\/g, '/'));

    const def = cfg.optional ? 0 : cfg.default && defaultIndex || undefined;

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
    } as any).then(_ => (_ as any)._);
  }


  public async list(cfg: SelectionPromptConfig) {
    return prompt({
      type: 'select',
      name: '_',
      message: cfg.msg,
      choices: cfg.choices(),
      skip: !cfg.enabled()
    }).then(_ => (_ as any)._);
  }

  public async checkbox(cfg: SelectionPromptConfig) {
    // Workaround for https://github.com/enquirer/enquirer/issues/298
    if (!cfg.enabled()) {
      return null;
    }

    return prompt({
      type: 'multiselect',
      name: '_',
      message: cfg.msg,
      choices: cfg.choices(),
      skip: !cfg.enabled()
    }).then(_ => (_ as any)._);
  }
}
