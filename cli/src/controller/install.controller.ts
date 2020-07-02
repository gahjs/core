import { injectable } from 'inversify';

import { GahEvent, InstallFinishedEvent, GahModuleType } from '@awdware/gah-shared';

import { Controller } from './controller';
import { GahFile } from '../install-helper/gah-file';


@injectable()
export class InstallController extends Controller {

  public async install() {
    const isHost = this._configService.getGahModuleType() === GahModuleType.HOST;
    const fileName = isHost ? 'gah-host.json' : 'gah-module.json';

    const gahFile = new GahFile(fileName);


    await gahFile.install();

    this._pluginService.triggerEvent(GahEvent.INSTALL_FINISHED, {} as InstallFinishedEvent);
  }
}
