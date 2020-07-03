export interface ILoggerService {
  debugLoggingEnabled: boolean;
  log(text: string): void
  warn(text: string): void
  error(text: string): void;
  debug(text: string): void;
  success(text: string): void;
  startLoadingAnimation(text: string): void;
  stopLoadingAnimation(removeLine?: boolean, succeeded?: boolean, text?: string): void
  enableDebugLogging(): void;
  getProgressBarString(total: number, current: number, length?: number, char0?: string, char1?: string): string;
  interruptLoading(interruptForAction: () => void): void;
}
