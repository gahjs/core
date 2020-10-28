import { injectable } from 'inversify';
import DIContainer from '../di-container';

import { IFileSystemService, ICleanupService, IWorkspaceService, CleanupData, TsConfig, PackageJson, ILoggerService } from '@awdware/gah-shared';

import { FileSystemService } from './file-system.service';
import { WorkspaceService } from './workspace.service';
import { LoggerService } from './logger.service';
import chalk from 'chalk';


@injectable()
export class CleanupSevice implements ICleanupService {
  private readonly _fileSystemService: IFileSystemService;
  private readonly _workspaceService: IWorkspaceService;
  private readonly _loggerService: ILoggerService;
  private readonly _cleanupFilePath: string;

  constructor() {
    this._fileSystemService = DIContainer.get(FileSystemService);
    this._workspaceService = DIContainer.get(WorkspaceService);
    this._loggerService = DIContainer.get(LoggerService);
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

  public clean(): void {
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
    cleanupFile.packageJson.forEach(packageJson => {
      const pkgJsonFile = this._fileSystemService.parseFile<PackageJson>(packageJson.filePath);
      const currentDep = pkgJsonFile.dependencies?.[packageJson.dependencyKey];
      if (currentDep !== packageJson.newValue) {
        this._loggerService.error(`cannot clean package.json file in '${chalk.gray(packageJson.filePath)}' because the dependency '${packageJson.dependencyKey}' was changed.`);
      } else {
        pkgJsonFile.dependencies![packageJson.dependencyKey] = packageJson.prevValue;

        this._fileSystemService.saveObjectToFile(packageJson.filePath, pkgJsonFile);
        const idx = cleanupFileCopy.packageJson.findIndex(x => x.filePath === packageJson.filePath && x.dependencyKey === packageJson.dependencyKey);
        cleanupFileCopy.tsConfig.splice(idx, 1);
        this.saveCleanupFile(cleanupFileCopy);
      }
    });
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
      existing.prevValue = prevValue;
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
