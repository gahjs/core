import { GahEvent, GahEventPayload } from './gah-event';

export class GahEventHandler {
  public event: GahEvent;
  public handler: (payload: GahEventPayload) => void;
  public pluginName: string;
}
