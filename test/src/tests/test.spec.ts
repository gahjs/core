import { GahHelper } from '../helper/gah-helper'
require('should');
import sinon from 'sinon';

let gah: GahHelper;

beforeEach(async function () {
  const title = this.currentTest?.title;
  gah = new GahHelper(title!);
  await gah.clean();
  process.stdout.write
});

describe('', async () => {
  xit('1_InstallWorks', async () => {
    await gah.copyModules(['core', 'host', 'shared', 'led', 'blog']);
    await gah.runInstall('host', true);

    await gah.compareHost();
  });

  it('2_CheckPluginUpdates', async () => {
    await gah.copyModules(['core', 'host', 'shared', 'led', 'blog']);
    await gah.runPluginUpdate('host');
  });
});
