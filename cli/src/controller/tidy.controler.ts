import { GahModuleType } from '@gah/shared';

import { Controller } from './controller';
import { GahFile } from '../install-helper/gah-file';

export class TidyController extends Controller {

  public async tidyPackages() {
    const isHost = await this._configService.getGahModuleType() === GahModuleType.HOST;
    if (!isHost) {
      this._loggerService.error('This command can only be executed for gah hosts');
      return;
    }
    const gahFile = new GahFile('gah-host.json');
    await gahFile.init();
    await gahFile.tidyPackages();
    this._loggerService.success('Successfully tidied package versions');
  }
}
