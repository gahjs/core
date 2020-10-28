import { injectable } from 'inversify';

import { Controller } from './controller';


@injectable()
export class CleanController extends Controller {
  public async clean(packages: boolean, tsconfig: boolean) {
    if (!(tsconfig || packages)) {
      this._loggerService.warn('No cleaning target specified');
      return;
    }

    if (packages) {
      await this._cleanupService.cleanPackages();
    }
    if (tsconfig) {
      await this._cleanupService.cleanTsConfig();
    }
    this._loggerService.success('Cleanup done.');
  }
}
