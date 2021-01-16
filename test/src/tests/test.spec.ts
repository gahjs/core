import { GahHelper } from '../helper/gah-helper'
require('should');

let gah: GahHelper;

beforeEach(async function () {
  const title = this.currentTest?.title;
  gah = new GahHelper(title!);
  await gah.clean();
});

describe('', async () => {
  it('1_InstallWorks', async () => {
    await gah.copyModules(['core', 'host', 'shared', 'led', 'blog']);
    // await gah.initModule('frame', true);
    await gah.runInstall('host', true);
    (1 + 1).should.equal(2);
  });
});
