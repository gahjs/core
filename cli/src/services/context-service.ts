import { injectable } from 'inversify';
import { IContextService } from '@awdware/gah-shared';
import { GahContext } from '@awdware/gah-shared';

@injectable()
export class ContextService implements IContextService {
  private readonly _ctx: GahContext;

  constructor() {
    this._ctx = {};
  }

  setContext(context: Partial<GahContext>): void {
    Object.keys(context).forEach(k => {
      (this._ctx as any)[k] = (context as any)[k];
    });
  }
  getContext(): GahContext {
    return this._ctx;
  }
}
