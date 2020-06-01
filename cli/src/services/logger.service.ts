import { injectable } from 'inversify';
import { ILoggerService } from '@awdware/gah-shared';
import ora, { Ora } from 'ora';
import chalk from 'chalk';

@injectable()
export class LoggerService implements ILoggerService {
  private ora_: Ora;
  public debugLoggingEnabled: boolean;

  public log(text: string) {
    console.log(chalk.blue(' ■ ') + text);
  }
  public warn(text: string) {
    console.warn(chalk.yellow(' ■ ') + text);
  }
  public error(text: string) {
    console.error(chalk.red(' ■ ') + text);
  }
  public debug(text: string) {
    if (this.debugLoggingEnabled) { console.log(chalk.magenta(' ■ ') + text); }
  }
  public success(text: string) {
    console.log(chalk.green(' ■ ') + text);
  }

  public enableDebugLogging(): void {
    this.debugLoggingEnabled = true;
  }

  public startLoadingAnimation(text: string) {
    this.ora_ = ora({
      text: text,
      spinner: {
        interval: 80,
        frames: [' ▄', ' ■', ' ▀', ' ▀', ' ■']
      }
    }).start();
  }

  public stopLoadingAnimation(removeLine: boolean = false, succeeded: boolean = true, text?: string): void {
    if (removeLine) {
      this.ora_.stop();
      return;
    }
    if (text) {
      this.ora_.stop();
    }
    if (succeeded) {
      text && this.success(text);
      text || this.ora_.succeed();
    }
    else {
      text && this.error(text);
      text || this.ora_.fail();
    }
  }
}
