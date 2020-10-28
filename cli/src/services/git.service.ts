import { inject, injectable } from 'inversify';
import { LoggerService } from './logger.service';
import { IExecutionService, ILoggerService, IGitService } from '@awdware/gah-shared';
import { ExecutionService } from './execution.service';
import simpleGit, { SimpleGit } from 'simple-git';
import chalk from 'chalk';
const git: SimpleGit = simpleGit();


@injectable()
export class GitService implements IGitService {
  @inject(LoggerService)
  private readonly _loggerService: ILoggerService;
  @inject(ExecutionService)
  private readonly _executionService: IExecutionService;

  public async init(): Promise<void> {
    const rootDir = await this.getRootDir();
    await git.cwd(rootDir);
  }

  public async getRootDir(): Promise<string> {
    return git.revparse(['--show-toplevel']);
  }

  public async isGitRepo(): Promise<boolean> {
    return git.checkIsRepo();
  }

  public async getCurrentBranchName(): Promise<string> {
    return git.revparse({ '--abbrev-ref': null, 'HEAD': null });
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
