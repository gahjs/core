import chalk from 'chalk';
import { AwesomeLogger, AwesomeLoggerSpinnerControl } from 'awesome-logging';

import { ILoggerService, IContextService } from '@gah/shared';
import { ContextService } from './context-service';

/**
 * TODO: Add logging to a file (error only or all)
 * Either flag or property in GahConfig!
 */

export class LoggerService implements ILoggerService {
  private _isSpinning: boolean;
  private _spinnerControl: AwesomeLoggerSpinnerControl;

  private readonly _contextService: IContextService;

  constructor(contextService: ContextService) {
    this._contextService = contextService;
  }

  private get debugLoggingEnabled(): boolean {
    return this._contextService.getContext().debug ?? false;
  }

  private logText(text: string) {
    if (AwesomeLogger.currentLoggerType !== 'text') {
      AwesomeLogger.interrupt(text);
    } else {
      AwesomeLogger.log(text);
    }
  }

  public log(text: string) {
    this.logText(` ${chalk.blue('■')} ${text}`);
  }

  public warn(text: string) {
    this.logText(` ${chalk.yellow('■')} ${text}`);
  }
  public error(text: string | Error | unknown, debug = false) {
    let errText = '';
    if (typeof text === 'string') {
      errText += text;
    } else if (text instanceof Error) {
      errText += text.name ?? '';
      errText += text.message ?? '';
      errText += text.stack ?? '';
    } else {
      errText += 'Unknown error';
    }
    if (!debug) {
      this.logText(` ${chalk.red('■')} ${errText}`);
      return;
    }
    if (this.debugLoggingEnabled) {
      this.logText(` ${chalk.magenta('■')} ${errText}`);
    }
  }
  public debug(text: string, prefx = true) {
    if (this.debugLoggingEnabled) {
      if (prefx) {
        this.logText(` ${chalk.magenta('■')} ${text}`);
      } else {
        this.logText(text);
      }
    }
  }
  public success(text: string) {
    this.logText(` ${chalk.green('■')} ${text}`);
  }

  public startLoadingAnimation(text: string) {
    this._spinnerControl = AwesomeLogger.log('spinner', {
      spinnerFrames: [chalk.blue(' ▄'), chalk.blue(' ■'), chalk.blue(' ▀'), chalk.blue(' ▀'), chalk.blue(' ■')],
      spinnerDelay: 80,
      text
    });
    this._isSpinning = true;
  }

  public stopLoadingAnimation(removeLine: boolean = false, succeeded: boolean = true, text?: string): void {
    if (!this._isSpinning) {
      return;
    }
    this._isSpinning = false;
    this._spinnerControl.stop({ removeLine, succeeded, text });
  }
}
