import { GahHelper } from '../helper/gah-helper'

const a = new GahHelper();

test('one plus one is two', async () => {
  await a.runInstall();
  (0).should.be.equal(0);
})
