import { injectable } from 'inversify';
import deepEqual from 'deep-equal';
import chalk from 'chalk';
import DIContainer from '../di-container';

import { IFileSystemService, ICleanupService, ILoggerService, IGitService } from '@gah/shared';

import { FileSystemService } from './file-system.service';
import { LoggerService } from './logger.service';
import { GitService } from './git.service';


@injectable()
export class CleanupSevice implements ICleanupService {
  private readonly _fileSystemService: IFileSystemService;
  private readonly _loggerService: ILoggerService;
  private readonly _gitService: IGitService;
  private _temporaryJsonFileChanges: { filePath: string, propertyPath: string, previousValue: any }[] = [];

  constructor() {
    this._fileSystemService = DIContainer.get(FileSystemService);
    this._loggerService = DIContainer.get(LoggerService);
    this._gitService = DIContainer.get(GitService);
  }


  public async cleanPendingChanges() {
    const isRepo = await this._gitService.isGitRepo();
    if (!isRepo) {
      return;
    }
    const gitRootDir = await this._gitService.getRootDir();
    for (const modifiedFile of await this._gitService.getModifiedLines()) {
      const fullPath = this._fileSystemService.join(gitRootDir, modifiedFile);
      if (fullPath.endsWith('.json')) {
        let currentState: Object;
        let branchState: Object;
        try {
          currentState = this._fileSystemService.parseFile<object>(fullPath);
        } catch (error) {
          this._loggerService.error(`Cannot compare '${chalk.gray(fullPath)}' because it is not a valid JSON file.`);
          continue;
        }
        const branchStateText = await this._gitService.getBranchStateOfFile(modifiedFile);
        try {
          branchState = JSON.parse(branchStateText);
        } catch (error) {
          this._loggerService.error(`Cannot compare '${chalk.gray(fullPath)}' because the branch state is not a valid JSON file.`);
          continue;
        }
        if (deepEqual(currentState, branchState)) {
          await this._gitService.discardFile(modifiedFile);
          this._loggerService.debug(`Discarded file '${modifiedFile}'`);
        }
      }
    }
  }

  public registerJsonFileTemporaryChange(filePath: string, propertyPath: string, previousValue: any) {
    this._temporaryJsonFileChanges.push({ filePath, propertyPath, previousValue });
  }

  public async cleanJsonFileTemporaryChanges() {
    for (const change of this._temporaryJsonFileChanges) {
      const content = await this._fileSystemService.parseFile<any>(change.filePath);
      let property = content;
      const pathSteps = change.propertyPath.split('.');
      const lastPathStep = pathSteps.pop()!;
      pathSteps.forEach(propPathSegment => {
        property = property[propPathSegment];
      });
      property[lastPathStep] = change.previousValue;
      await this._fileSystemService.saveObjectToFile(change.filePath, content);
    }
    this._temporaryJsonFileChanges = [];
  }
}
