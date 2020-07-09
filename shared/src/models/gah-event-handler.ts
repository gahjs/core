import { GahEvent, ExtractEventPayload, GahEventType } from './gah-event';

export class GahEventHandler<T extends GahEventType> {
  public eventType: GahEventType;
  public handler: (payload: Omit<ExtractEventPayload<GahEvent, T>, 'type'>) => void;
  public pluginName: string;
}
