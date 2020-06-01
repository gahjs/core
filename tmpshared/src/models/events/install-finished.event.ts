import { GahEventPayload } from '../gah-event-payload.model';

export class InstallFinishedEvent extends GahEventPayload {
  public baseDir: string;
}
