import { injectable } from 'inversify';

import { GahModuleType } from '@awdware/gah-shared';

import { Controller } from './controller';


@injectable()
export class RunController extends Controller {

  public async exec(command: string[]) {

    const isHost = this._configService.getGahModuleType() === GahModuleType.HOST;

    const opts = ['run', ...command];

    await this._executionService.executeAndForget('yarn', opts, true, isHost ? '.gah' : undefined);
  }
}
