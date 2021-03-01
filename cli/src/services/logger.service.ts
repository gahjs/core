import { ILoggerService, IContextService } from '@gah/shared';
import { ContextService } from './context-service';
import { AwesomeLogger } from 'awesome-logging';
import { TextObject } from 'awesome-logging/lib/models/text-object';
import { AwesomeLoggerSpinnerControl } from 'awesome-logging/lib/logger/models/config/spinner';

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
    const textObj = new TextObject(' ■ ', 'BLUE');
    textObj.append(text);
    AwesomeLogger.interrupt('text', { text: textObj });
  }

  public warn(text: string) {
    const textObj = new TextObject(' ■ ', 'YELLOW');
    textObj.append(text);
    AwesomeLogger.interrupt('text', { text: textObj });
  }
  public error(text: string | Error) {
    const textObj = new TextObject(' ■ ', 'RED');
    if (typeof text === 'string') {
      textObj.append(text);
    } else if(text) {
      text.name && textObj.append(text.name);
      text.message && textObj.append(text.message);
      text.stack && textObj.append(text.stack);
    } else {
      textObj.append('Unknown error');
    }
    AwesomeLogger.interrupt('text', { text: textObj });
  }
  public debug(text: string) {
    if (this.debugLoggingEnabled) {
      const textObj = new TextObject(' ■ ', 'MAGENTA');
      textObj.append(text);
      AwesomeLogger.interrupt('text', { text: textObj });
    }
  }
  public success(text: string) {
    const textObj = new TextObject(' ■ ', 'GREEN');
    textObj.append(text);
    AwesomeLogger.interrupt('text', { text: textObj });
  }

  public startLoadingAnimation(text: string) {
    const textObj = new TextObject(' ■ ', 'BLUE');
    textObj.append(text);
    this._spinnerControl = AwesomeLogger.log('spinner', {
      spinnerFrames: [' ▄', ' ■', ' ▀', ' ▀', ' ■'],
      spinnerColor: 'BLUE',
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
