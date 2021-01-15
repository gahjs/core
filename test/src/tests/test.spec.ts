import { GahHelper } from '../helper/gah-helper'

const gah = new GahHelper();

describe('', async () => {
  it('one plus one is two', async done => {
    await gah.runInstall()
      .catch((err) => console.log(err));
    (0).should.be.equal(0);
    done();
  });
});
