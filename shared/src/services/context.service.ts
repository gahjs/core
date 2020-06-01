import { GahContext } from '../models/gah-context';

export interface IContextService {
  setContext(context: GahContext): void;
  getContext(): GahContext;
}
