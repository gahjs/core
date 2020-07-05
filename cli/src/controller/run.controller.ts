import { injectable } from 'inversify';

import { GahModuleType } from '@awdware/gah-shared';

import { Controller } from './controller';


@injectable()
export class RunController extends Controller {

  public async exec(command: string[], configurationName?: string) {
    const isHost = this._configService.getGahModuleType() === GahModuleType.HOST;

    const likedEnvFile = '.gah/src/environment.json';

    if (isHost) {

      const envFileSimpleName = `environment.${configurationName ? `${configurationName}.json` : 'json'}`;
      const envFileName = `env/${envFileSimpleName}`;

      if (!this._fileSystemService.fileExists(envFileName)) {
        throw new Error(`Cannot find configuration file "${envFileSimpleName}"`);
      }

      if (this._fileSystemService.fileExists(likedEnvFile)) {
        this._fileSystemService.deleteFile(likedEnvFile);
      }

      this._fileSystemService.createFileLink(likedEnvFile, envFileName);
    }

    const opts = ['run', ...command];

    await this._executionService.executeAndForget('yarn', opts, true, isHost ? '.gah' : undefined);
  }
}
