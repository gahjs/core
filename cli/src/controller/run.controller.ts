import { GahModuleType } from '@gah/shared';

import { Controller } from './controller';

export class RunController extends Controller {
  public async exec(command: string[], configurationName?: string) {
    const isHost = (await this._configService.getGahModuleType()) === GahModuleType.HOST;

    const likedEnvFile = '.gah/src/environment.json';

    if (isHost) {
      const envFileSimpleName = configurationName ? `environment.${configurationName}.json` : 'environment.json';
      const envFileName = `env/${envFileSimpleName}`;

      if (!(await this._fileSystemService.fileExists(envFileName))) {
        throw new Error(`Cannot find configuration file "${envFileSimpleName}"`);
      }

      if (await this._fileSystemService.fileExists(likedEnvFile)) {
        await this._fileSystemService.deleteFile(likedEnvFile);
      }

      await this._fileSystemService.createFileLink(likedEnvFile, envFileName);
    }

    const opts = ['run', ...command];

    const success = await this._executionService.executeAndForget('yarn', opts, true, isHost ? '.gah' : undefined);
    if (!success) {
      process.exit(1);
    }
  }
}
