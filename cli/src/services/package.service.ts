import { inject, injectable } from 'inversify';
import { LoggerService } from './logger.service';
import { IExecutionService, ILoggerService, IPackageService } from '@gah/shared';
import { ExecutionService } from './execution.service';


@injectable()
export class PackageService implements IPackageService {

  @inject(LoggerService)
  private readonly _loggerService: ILoggerService;
  @inject(ExecutionService)
  private readonly _executionService: IExecutionService;

  public async findLatestPackageVersion(packageName: string): Promise<string> {
    const success = await this._executionService.execute(`yarn info --json ${packageName} version`, false);
    if (success) {
      const versionString = this._executionService.executionResult;
      const versionMatcher = /{"type":"inspect","data":"(.*?)"}/;
      const newestVersion = versionString.match(versionMatcher);
      if (!newestVersion || !newestVersion[1]) {
        throw new Error(`Cannot find latest version of package '${packageName}'`);
      }
      return newestVersion[1];
    } else {
      throw new Error(`Cannot find latest version of package '${packageName}'`);
    }
  }
}
