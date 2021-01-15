import * as gahIndex from '@gah/cli/lib/index';
import sinon from 'sinon';

export class GahHelper {

  async runGah(args: string[]) {
    process.argv = args;
    await gahIndex.gahIndex();
  }

  async runInstall() {
    await this.runGah(['i']);
  }
}
