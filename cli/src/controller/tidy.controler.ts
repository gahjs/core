import { injectable } from 'inversify';

import { GahModuleType } from '@awdware/gah-shared';

import { Controller } from './controller';
import { GahFile } from '../install-helper/gah-file';


@injectable()
export class TidyController extends Controller {

  public async tidyPackages() {
    const isHost = this._configService.getGahModuleType() === GahModuleType.HOST;
    if (!isHost) {
      this._loggerService.error('This command can only be executed for gah hosts');
      return;
    }
    const gahFile = new GahFile('gah-host.json');
    gahFile.tidyPackages();
  }
}
