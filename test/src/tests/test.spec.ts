import { GahHelper } from '../helper/gah-helper'
require('should');

const gah = new GahHelper();

describe('', async () => {
  it('one plus one is two', async () => {
    await gah.runInstall()
      .catch((err) => console.log(err));
    (1 + 1).should.equal(2);
  });
});
