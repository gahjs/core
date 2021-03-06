import { GahModuleType } from '@gah/shared';

import { Controller } from './controller';
import { GahFile } from '../install-helper/gah-file';

export class WhyController extends Controller {
  public async whyModule(moduleName: string) {
    const isHost = (await this._configService.getGahModuleType()) === GahModuleType.HOST;
    const fileName = isHost ? 'gah-host.json' : 'gah-module.json';

    const gahFile = new GahFile(fileName);

    await gahFile.init();
    gahFile.whyModule(moduleName);
  }

  public async whyPackage(packageName: string) {
    const isHost = (await this._configService.getGahModuleType()) === GahModuleType.HOST;
    if (!isHost) {
      throw new Error('This command can only be executed in a gah host folder.');
    }

    const gahFile = new GahFile('gah-host.json');
    await gahFile.whyPackage(packageName);
  }
}
