import { injectable } from 'inversify';
import deepEqual from 'deep-equal';
import chalk from 'chalk';
import DIContainer from '../di-container';

import { IFileSystemService, ICleanupService, IWorkspaceService, CleanupData, TsConfig, PackageJson, ILoggerService, IGitService } from '@awdware/gah-shared';

import { FileSystemService } from './file-system.service';
import { WorkspaceService } from './workspace.service';
import { LoggerService } from './logger.service';
import { GitService } from './git.service';


@injectable()
export class CleanupSevice implements ICleanupService {
  private readonly _fileSystemService: IFileSystemService;
  private readonly _workspaceService: IWorkspaceService;
  private readonly _loggerService: ILoggerService;
  private readonly _gitService: IGitService;
  private readonly _cleanupFilePath: string;

  constructor() {
    this._fileSystemService = DIContainer.get(FileSystemService);
    this._workspaceService = DIContainer.get(WorkspaceService);
    this._loggerService = DIContainer.get(LoggerService);
    this._gitService = DIContainer.get(GitService);
    this._cleanupFilePath = this._fileSystemService.join(this._workspaceService.getWorkspaceFolder(), 'cleanup.json');
  }

  private getCleanupFile() {
    if (!this._fileSystemService.fileExists(this._cleanupFilePath)) {
      this._fileSystemService.saveObjectToFile(this._cleanupFilePath, {});
    }
    const cleanupFile = this._fileSystemService.parseFile<CleanupData>(this._cleanupFilePath);
    cleanupFile.tsConfig ??= [];
    cleanupFile.packageJson ??= [];
    return cleanupFile;
  }

  private saveCleanupFile(cleanupFile: any) {
    this._fileSystemService.saveObjectToFile(this._cleanupFilePath, cleanupFile);
  }

  public async cleanTsConfig() {
    const cleanupFile = this.getCleanupFile();
    const cleanupFileCopy = JSON.parse(JSON.stringify(cleanupFile)) as CleanupData;
    cleanupFile.tsConfig.forEach(tsConfig => {
      const tsConfigFile = this._fileSystemService.parseFile<TsConfig>(tsConfig.filePath);
      tsConfigFile.compilerOptions.paths[tsConfig.key] = undefined;
      this._fileSystemService.saveObjectToFile(tsConfig.filePath, tsConfigFile);
      const idx = cleanupFileCopy.tsConfig.findIndex(x => x.filePath === tsConfig.filePath && x.key === tsConfig.key);
      cleanupFileCopy.tsConfig.splice(idx, 1);
      this.saveCleanupFile(cleanupFileCopy);
    });
    await this.cleanPendingChanges(cleanupFile.tsConfig.map(x => x.filePath));

  }

  public async cleanPackages() {
    const cleanupFile = this.getCleanupFile();
    const cleanupFileCopy = JSON.parse(JSON.stringify(cleanupFile)) as CleanupData;

    cleanupFile.packageJson.forEach(packageJson => {
      const pkgJsonFile = this._fileSystemService.parseFile<PackageJson>(packageJson.filePath);
      const currentDep = pkgJsonFile.dependencies?.[packageJson.dependencyKey];
      if (currentDep !== packageJson.newValue) {
        this._loggerService.error(`cannot clean package.json file in '${chalk.gray(packageJson.filePath)}' because the dependency '${packageJson.dependencyKey}' was changed.`);
      } else {
        pkgJsonFile.dependencies![packageJson.dependencyKey] = packageJson.prevValue;

        this._fileSystemService.saveObjectToFile(packageJson.filePath, pkgJsonFile);
        const idx = cleanupFileCopy.packageJson.findIndex(x => x.filePath === packageJson.filePath && x.dependencyKey === packageJson.dependencyKey);
        cleanupFileCopy.packageJson.splice(idx, 1);
        this.saveCleanupFile(cleanupFileCopy);
      }
    });
    await this.cleanPendingChanges(cleanupFile.packageJson.map(x => x.filePath));

  }

  private async cleanPendingChanges(allPaths: string[]) {
    const isRepo = await this._gitService.isGitRepo();
    if (!isRepo) {
      return;
    }
    const gitRootDir = await this._gitService.getRootDir();
    for (const modifiedFile of await this._gitService.getModifiedLines()) {
      const fullPath = this._fileSystemService.join(gitRootDir, modifiedFile);
      if (allPaths.some(p => p === fullPath)) {
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

  public logTsConfigPathAddition(filePath: string, key: string): void {
    const cleanupFile = this.getCleanupFile();
    if (cleanupFile.tsConfig.some(x => x.filePath === filePath && x.key === key)) {
      return;
    }
    cleanupFile.tsConfig.push({
      filePath,
      key
    });
    this.saveCleanupFile(cleanupFile);
  }

  public logPackageJsonDependencyChange(filePath: string, dependencyKey: string, prevValue: string, newValue: string): void {
    const cleanupFile = this.getCleanupFile();

    const existing = cleanupFile.packageJson.find(x => x.filePath === filePath && x.dependencyKey === dependencyKey);
    if (existing) {
      existing.newValue = newValue;
    } else {
      if (newValue === prevValue) {
        return;
      }
      cleanupFile.packageJson.push({
        filePath,
        dependencyKey,
        prevValue,
        newValue
      });
    }
    this.saveCleanupFile(cleanupFile);
  }
}
