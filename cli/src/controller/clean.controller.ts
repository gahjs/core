import { injectable } from 'inversify';

import { Controller } from './controller';


@injectable()
export class CleanController extends Controller {
  public async clean() {
    this._cleanupService.clean();
  }
}
