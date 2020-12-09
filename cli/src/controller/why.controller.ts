import { injectable } from 'inversify';

import { GahModuleType } from '@gah/shared';

import { Controller } from './controller';
import { GahFile } from '../install-helper/gah-file';


@injectable()
export class WhyController extends Controller {

  public async whyModule(moduleName: string) {
    const isHost = this._configService.getGahModuleType() === GahModuleType.HOST;
    const fileName = isHost ? 'gah-host.json' : 'gah-module.json';

    const gahFile = new GahFile(fileName);

    gahFile.whyModule(moduleName);
  }

  public async whyPackage(packageName: string) {
    const isHost = this._configService.getGahModuleType() === GahModuleType.HOST;
    if (!isHost) {
      this._loggerService.error('This command can only be executed in a gah host folder.');
      process.exit();
    }

    const gahFile = new GahFile('gah-host.json');
    gahFile.whyPackage(packageName);
  }
}
