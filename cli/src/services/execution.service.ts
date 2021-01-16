import { inject, injectable } from 'inversify';
import { exec, spawn } from 'child_process';
import { IExecutionService, ILoggerService } from '@gah/shared';
import { LoggerService } from './logger.service';
import chalk from 'chalk';

/**
 * TODO: Use loggerservice to ensure that this works with loading animations, but without any square before the msg
 */
@injectable()
export class ExecutionService implements IExecutionService {
  public executionResult: string = '';
  public executionErrorResult: string = '';
  @inject(LoggerService)
  private readonly _loggerService: ILoggerService;

  public execute(cmd: string, outPut: boolean, outPutCallback?: (out: string) => string, cwd?: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.executionResult = '';
      this.executionErrorResult = '';
      this._loggerService.debug(`Spawning process '${chalk.gray(cmd)}' in '${chalk.blue(cwd ?? process.cwd())}'`);
      const childProcess = exec(cmd, { cwd, env: process.env });

      childProcess.stdout?.on('data', buffer => {
        this.executionResult += buffer;
        if (outPut) {
          if (outPutCallback) {
            const newOut = outPutCallback(buffer);
            if (newOut) { console.log(newOut); }
          } else {
            console.log(buffer);
          }
        }
      });
      childProcess.stderr?.on('data', buffer => {
        this.executionResult += buffer;
        this.executionErrorResult += buffer;
        if (outPut) {
          if (outPutCallback) {
            const newOut = outPutCallback(buffer);
            if (newOut) { console.log(newOut); }
          } else {
            console.error(buffer);
          }
        }
      });

      childProcess.on('exit', code => {
        this._loggerService.debug(chalk.magenta('--------------Execution Result--------------'));
        this._loggerService.debug(chalk.cyan(this.executionResult.replace(/\s$/g, '')));
        this._loggerService.debug(chalk.magenta('--------------################--------------\n'));
        if (code !== 0) {
          setTimeout(() => {
            resolve(false);
          }, 100);
        }
        else {
          setTimeout(() => {
            resolve(true);
          }, 100);
        }
      });
    });
  }


  public executeAndForget(executeable: string, options: string[], outPut: boolean, cwd?: string): Promise<boolean> {
    return new Promise((resolve) => {
      const childProcess = spawn(executeable, options, { cwd, shell: true, stdio: outPut ? 'inherit' : 'ignore' });
      childProcess.on('exit', code => {
        if (code !== 0) {
          setTimeout(() => {
            resolve(false);
          }, 10);
        }
        else {
          setTimeout(() => {
            resolve(true);
          }, 10);
        }
      });
    });
  }
}
