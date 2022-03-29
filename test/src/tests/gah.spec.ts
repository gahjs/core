require('should');
import { PromptMock } from '../helper/prompt';

import { SinonSpy, spy } from 'sinon';
import { Asserter } from '../helper/asserter';
import { GahHelper } from '../helper/gah-helper';

describe('Basic Tests', () => {
  let gah: GahHelper;
  let asserter: Asserter;
  let writeSpy: SinonSpy;
  let originalCwdMethod: () => string;

  before(() => {
    writeSpy = spy(process.stdout, 'write') as SinonSpy<[string], boolean>;
    asserter = new Asserter(writeSpy);
    originalCwdMethod = process.cwd;
  });

  beforeEach(async function () {
    const title = this.currentTest?.title;
    gah = new GahHelper(title!);
    writeSpy.resetHistory();
    await gah.clean();
  });

  after(() => {
    process.cwd = originalCwdMethod;
  });

  it('1_install-works', async () => {
    await gah.copyModules(['core', 'host', 'shared', 'led', 'blog']);
    await gah.runInstall('host', true);

    await gah.compareHost();
  });

  it('2_check-plugin-updates-none-installed', async () => {
    await gah.copyModules(['core', 'host', 'shared', 'led', 'blog']);
    await gah.runPluginUpdate('host');
    asserter.assertLog('No plugins installed!');
  });

  it('3_check-plugin-updates-no-updates', async () => {
    await gah.copyModules(['core', 'shared', 'led']);
    await gah.runPluginUpdate('led');
    asserter.assertNoLog('No plugins installed!');
    asserter.assertLog('No plugins can be updated.');
  });

  it('4_check-plugin-updates-found-updates', async () => {
    await gah.copyModules(['core', 'shared', 'led']);
    await gah.modifyModuleConfig('led', 'modules.0.config.plugins.0.version', '0.0.1');
    PromptMock.addMock(0);
    await gah.runPluginUpdate('led');
    asserter.assertNoLog('No plugins installed!');
    asserter.assertNoLog('No plugins can be updated.');
    asserter.assertLog('@gah/test-plugin can be updated from version 0.0.1 to version 1.0.0');
    asserter.assertLog('Updated plugins');
  });
});
