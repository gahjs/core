import { IExecutionService, IPackageService } from '@gah/shared';
import { ExecutionService } from './execution.service';
export class PackageService implements IPackageService {
  private readonly _executionService: IExecutionService;

  constructor(executionService: ExecutionService) {
    this._executionService = executionService;
  }

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
