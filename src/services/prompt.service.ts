import { injectable } from 'inversify';
import inquirer from 'inquirer';
import { IPromptService, PromptConfig, FuzzyPathPromptConfig, SelectionPromptConfig } from '@awdware/gah';

@injectable()
export class PromptService implements IPromptService {

  constructor() {
    inquirer.registerPrompt('autosubmit', require('inquirer-autosubmit-prompt'));
    inquirer.registerPrompt('fuzzypath', require('inquirer-fuzzy-path'));
  }

  public input(cfg: PromptConfig) {
    return new Promise<string>((resolve, reject) => {
      inquirer.prompt({
        type: 'input',
        when: () => !cfg.cancelled && cfg.enabled(),
        message: cfg.msg,
        name: '_',
        default: cfg.default
      })
        .then(_ => resolve(_._))
        .catch(_ => reject(_));
    });
  }

  public confirm(cfg: PromptConfig) {
    return new Promise<boolean>((resolve, reject) => {
      inquirer.prompt({
        type: 'confirm',
        when: () => !cfg.cancelled && cfg.enabled(),
        message: cfg.msg,
        name: '_',
        default: cfg.default ?? false
      })
        .then(_ => resolve(_._))
        .catch(_ => reject(_));
    });
  }

  public fuzzyPath(cfg: FuzzyPathPromptConfig) {

    const excludePath = (val: string) => {
      if (cfg.excludePath)
        return cfg.excludePath(val);
      return false;
    };

    return new Promise<string>((resolve, reject) => {
      inquirer.prompt<{ _: string }>({
        type: 'fuzzypath',
        when: () => !cfg.cancelled && cfg.enabled(),
        message: cfg.msg,
        name: '_',
        itemType: cfg.itemType,
        depthLimit: 5,
        excludePath: (nodePath: string) => nodePath.startsWith('node_modules'),
        excludeFilter: (nodePath: string) => excludePath(nodePath)
      } as any)
        .then(_ => resolve(_._))
        .catch(_ => reject(_));
    });
  }


  public list(cfg: SelectionPromptConfig) {
    return new Promise<string>((resolve, reject) => {
      inquirer.prompt({
        type: 'list',
        when: () => !cfg.cancelled && cfg.enabled(),
        message: cfg.msg,
        name: '_',
        choices: () => cfg.choices()
      })
        .then(_ => resolve(_._))
        .catch(_ => reject(_));
    });
  }

  public checkbox(cfg: SelectionPromptConfig) {
    return new Promise<string[]>((resolve, reject) => {
      inquirer.prompt({
        type: 'checkbox',
        when: () => !cfg.cancelled && cfg.enabled(),
        message: cfg.msg,
        name: '_',
        choices: () => cfg.choices()
      })
        .then(_ => resolve(_._))
        .catch(_ => reject(_));
    });
  }
}
