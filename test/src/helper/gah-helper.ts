import * as gahMain from '@gah/cli/lib/gah-main';
import path from 'path';
import sinon from 'sinon';
export class GahHelper {

  async runGah(args: string[]) {
    process.argv = [process.argv[0], path.resolve("../../../cli/lib/index.js"), ...args];
    process.cwd = () => 'D:/git/awdware/Src/Awdware.Host/Awdware.Host.Presentation';

    await gahMain.gahMain();
  }

  async runInstall() {
    await this.runGah(['i']);
  }
}
