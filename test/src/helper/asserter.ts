import { match, SinonSpy } from "sinon";
require('should');

export class Asserter {
  writeSpy: SinonSpy;
  constructor(writeSpy: SinonSpy) {
    this.writeSpy = writeSpy;
  }

  public assertLog(expectedText: string | RegExp) {
    this._assertLog(expectedText, true)
  }
  public assertNoLog(expectedText: string | RegExp) {
    this._assertLog(expectedText, false)
  }
  private _assertLog(expectedText: string | RegExp, expected: boolean) {
    const regExp = typeof expectedText === 'string' ? new RegExp(`.*${expectedText}.*`) : expectedText;
    const hasBeenCalled = this.writeSpy.calledWithMatch(match(regExp));
    if (expected) {
      hasBeenCalled.should.be.true('Expected stdout write to have been called with ' + expectedText.toString());
    } else {
      hasBeenCalled.should.be.false('Expected stdout write NOT to have been called with ' + expectedText.toString());
    }
  }
}
