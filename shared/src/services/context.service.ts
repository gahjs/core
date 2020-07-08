import { GahContext } from '../models/gah-context';

export interface IContextService {
  setContext(context: Partial<GahContext>): void;
  getContext(): GahContext;
}
