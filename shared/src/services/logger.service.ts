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
  updateProgressBar(value: number): void;
  startProgressBar(total: number, description: string): void;
}
