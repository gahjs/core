import { GahEvent, ExtractEventPayload, GahEventType } from './gah-event';

export class GahEventHandler<T extends GahEventType> {
  public eventType: GahEventType;
  public handler: (payload: ExtractEventPayload<GahEvent, T>) => Promise<void | boolean> | void | boolean;
  public pluginName: string;
}
