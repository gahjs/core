export class GahCommandHandler {
  public pluginName: string;
  public command: string;
  public handler: (args: string[]) => Promise<boolean> | boolean;
}
