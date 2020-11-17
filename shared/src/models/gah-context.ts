export interface GahContext {
  calledFromCli?: boolean;
  calledFromHostFolder?: boolean;
  debug?: boolean;
  skipScripts?: boolean;
  currentBaseFolder?: string;
  oneTimeClearDone?: boolean;
  yarnTimeout?: number;
  configName?: string;
}
