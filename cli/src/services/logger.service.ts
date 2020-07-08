import { injectable, inject } from 'inversify';
import { ILoggerService, IContextService } from '@awdware/gah-shared';
import ora, { Ora } from 'ora';
import chalk from 'chalk';
import { ContextService } from './context-service';

/**
 * TODO: Add logging to a file (error only or all)
 * Either flag or property in GahConfig!
 */

@injectable()
export class LoggerService implements ILoggerService {
  private _ora: Ora;
  private _lastOraText: string;

  @inject(ContextService)
  private readonly _contextService: IContextService;

  private get debugLoggingEnabled(): boolean {
    return this._contextService.getContext().debug ?? false;
  }

  public log(text: string) {
    this.interruptLoading(() => {
      console.log(chalk.blue(' ■ ') + text);
    });
  }

  public warn(text: string) {
    this.interruptLoading(() => {
      console.warn(chalk.yellow(' ■ ') + text);
    });
  }
  public error(text: string) {
    this.interruptLoading(() => {
      console.error(chalk.red(' ■ ') + text);
    });
  }
  public debug(text: string) {
    if (this.debugLoggingEnabled) {
      this.interruptLoading(() => {
        console.log(chalk.magenta(' ■ ') + text);
      });
    }
  }
  public success(text: string) {
    this.interruptLoading(() => {
      console.log(chalk.green(' ■ ') + text);
    });
  }

  public startLoadingAnimation(text: string) {
    this._ora = ora({
      text: text,
      spinner: {
        interval: 80,
        frames: [' ▄', ' ■', ' ▀', ' ▀', ' ■']
      }
    }).start();
    this._lastOraText = text;
  }

  public stopLoadingAnimation(removeLine: boolean = false, succeeded: boolean = true, text?: string): void {
    if (removeLine) {
      this._ora.stop();
      return;
    }
    if (text) {
      this._ora.stop();
    }
    if (succeeded) {
      text && this.success(text);
      text || this._ora.succeed();
    }
    else {
      text && this.error(text);
      text || this._ora.fail();
    }
  }

  public getProgressBarString(total: number, current: number, length: number = 30, char0: string = '·', char1: string = '■'): string {
    return chalk.gray('■') + chalk.blue(char1.repeat(current / total * length) + char0.repeat((1 - current / total) * length)) + chalk.gray('■');
  }

  public interruptLoading(interruptForAction: () => void) {
    const isSpinning = this._ora?.isSpinning;
    if (isSpinning) {
      this._ora.stop();
    }
    interruptForAction();
    if (isSpinning) {
      this.startLoadingAnimation(this._lastOraText);
    }
  }
}
