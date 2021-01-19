import { LoggerService } from './logger.service';
import { ILoggerService, IGitService } from '@gah/shared';
import simpleGit, { SimpleGit } from 'simple-git';
import chalk from 'chalk';
const git: SimpleGit = simpleGit();

export class GitService implements IGitService {
  private readonly _loggerService: ILoggerService;

  constructor(loggerService: LoggerService) {
    this._loggerService = loggerService;
  }

  public async init(): Promise<void> {
    const rootDir = await this.getRootDir();
    await git.cwd(rootDir).catch(err => {
      this._loggerService.debug('Git Service could not be initialized.');
    });
  }

  public async getRootDir(): Promise<string> {
    return git.revparse(['--show-toplevel']);
  }

  public async isGitRepo(): Promise<boolean> {
    return git.checkIsRepo();
  }

  public async getCurrentBranchName(): Promise<string> {
    return git.revparse({ '--abbrev-ref': null, HEAD: null });
  }

  public async getModifiedLines(): Promise<string[]> {
    return git.status().then(x => x.modified);
  }

  public async getBranchStateOfFile(filePath: string): Promise<string> {
    return git.show([`${await this.getCurrentBranchName()}:${filePath}`]);
  }

  public async discardFile(filePath: string): Promise<void> {
    const discardOptions = { '--': null } as any;
    discardOptions[filePath] = null;
    const response = await git.checkout(discardOptions);
    if (response.length > 10) {
      this._loggerService.error(`Cannot discard changes for '${chalk.gray(filePath)}'`);
      this._loggerService.debug(response);
    }
  }
}
