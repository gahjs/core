export interface GahContext {
  calledFromCli?: boolean;
  calledFromHostFolder?: boolean;
  debug?: boolean;
  skipScripts?: boolean;
}
