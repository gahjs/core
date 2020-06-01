import { GahEvent } from './gah-event';
import { GahEventPayload } from './gah-event-payload.model';

export class GahEventHandler {
  public event: GahEvent;
  public handler: (payload: GahEventPayload) => void;
  public pluginName: string;
}
