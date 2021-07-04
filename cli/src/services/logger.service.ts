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

  public log(text: string) {
    AwesomeLogger.interrupt(` ${chalk.blue('■')} ${text}`);
  }

  public warn(text: string) {
    AwesomeLogger.interrupt(` ${chalk.yellow('■')} ${text}`);
  }
  public error(text: string | Error) {
    let errText = chalk.red(' ■ ');
    if (typeof text === 'string') {
      errText += text;
    } else if (text && (text.name || text.message || text.stack)) {
      errText += text.name ?? '';
      errText += text.message ?? '';
      errText += text.stack ?? '';
    } else {
      errText += 'Unknown error';
    }
    AwesomeLogger.interrupt(errText);
  }
  public debug(text: string, prefx = true) {
    if (this.debugLoggingEnabled) {
      if (prefx) {
        AwesomeLogger.interrupt(` ${chalk.magenta('■')} ${text}`);
      } else {
        AwesomeLogger.interrupt(text);
      }
    }
  }
  public success(text: string) {
    AwesomeLogger.interrupt(` ${chalk.green('■')} ${text}`);
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
