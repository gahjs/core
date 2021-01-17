import { GahModuleType } from '@gah/shared';

import { Controller } from './controller';
import { GahFile } from '../install-helper/gah-file';


export class InstallController extends Controller {

  public async install(skipPackageInstall: boolean, configName?: string) {
    if (configName) {
      this._contextService.setContext({ configName });
    }

    const isHost = await this._configService.getGahModuleType() === GahModuleType.HOST;
    const fileName = isHost ? 'gah-host.json' : 'gah-module.json';

    const gahFile = new GahFile(fileName);
    await gahFile.init();

    this._pluginService.triggerEvent('BEFORE_INSTALL', { gahFile: await gahFile.data() });

    await gahFile.install(skipPackageInstall);

    this._pluginService.triggerEvent('AFTER_INSTALL', { gahFile: await gahFile.data() });
  }
}
