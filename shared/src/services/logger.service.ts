export interface ILoggerService {
  log(text: string): void;
  warn(text: string): void;
  error(text: string | Error | unknown, debug?: boolean): void;
  debug(text: string): void;
  success(text: string): void;
  startLoadingAnimation(text: string): void;
  stopLoadingAnimation(removeLine?: boolean, succeeded?: boolean, text?: string): void;
}
