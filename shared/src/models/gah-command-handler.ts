import { GahFileData } from './install-helper/gah-file-data';

export class GahCommandHandler {
  public pluginName: string;
  public command: string;
  public handler: (args: string[], gahFile?: GahFileData) => Promise<boolean> | boolean;
}
