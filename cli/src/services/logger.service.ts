import { injectable } from 'inversify';
import { ILoggerService } from '@awdware/gah-shared';
import ora, { Ora } from 'ora';
import chalk from 'chalk';
import { SingleBar, Presets } from 'cli-progress';

@injectable()
export class LoggerService implements ILoggerService {
  private _ora: Ora;
  public debugLoggingEnabled: boolean;
  private _pBar: SingleBar;
  private _progressRunning: boolean;

  public log(text: string) {
    this.stopExistingAnimations();
    console.log(chalk.blue(' ■ ') + text);
  }
  public warn(text: string) {
    this.stopExistingAnimations();
    console.warn(chalk.yellow(' ■ ') + text);
  }
  public error(text: string) {
    this.stopExistingAnimations();
    console.error(chalk.red(' ■ ') + text);
  }
  public debug(text: string) {
    if (this.debugLoggingEnabled) { console.log(chalk.magenta(' ■ ') + text); }
  }
  public success(text: string) {
    this.stopExistingAnimations();
    console.log(chalk.green(' ■ ') + text);
  }

  public enableDebugLogging(): void {
    this.debugLoggingEnabled = true;
  }

  public startLoadingAnimation(text: string) {
    this.stopExistingAnimations();
    this._ora = ora({
      text: text,
      spinner: {
        interval: 80,
        frames: [' ▄', ' ■', ' ▀', ' ▀', ' ■']
      }
    }).start();
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

  public updateProgressBar(value: number) {
    this._pBar.update(value);

    if (this._pBar.getTotal() === value) {
      this._pBar.stop();
    }
  }

  public startProgressBar(total: number, description: string) {

    this._pBar = new SingleBar({
      format: chalk.yellow('{bar}') + ' {value}/{total} ' + description,
      hideCursor: true,
      clearOnComplete: true
    }, Presets.rect);

    this._progressRunning = true;
    this._pBar.start(total, 0, { description });
  }

  private stopExistingAnimations() {
    if (this._progressRunning) {
      this._pBar.stop();
      this._progressRunning = false;
    }
  }
}
