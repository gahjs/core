import { GahHelper } from '../helper/gah-helper'

const a = new GahHelper();

describe('', async () => {
  it('one plus one is two', async done => {
    await a.runInstall();
    (0).should.be.equal(0);
    done();
  });
});
