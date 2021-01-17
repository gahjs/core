import { ChildProcess, exec, spawn } from 'child_process';
import { IExecutionService } from '@gah/shared';
import { LoggerService } from './logger.service';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';
/**
 * TODO: Use loggerservice to ensure that this works with loading animations, but without any square before the msg
 */

export class ExecutionService implements IExecutionService {
  public executionResult: string = '';
  public executionErrorResult: string = '';
  private readonly _loggerService: LoggerService;

  constructor(loggerService: LoggerService) {
    this._loggerService = loggerService;
  }


  public execute(cmd: string, outPut: boolean, outPutCallback?: (out: string) => string, cwd?: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.executionResult = '';
      this.executionErrorResult = '';
      const usedCwd =
        cwd
          ? path.isAbsolute(cwd)
            ? cwd
            : path.join(process.cwd(), cwd)
          : process.cwd();
      this._loggerService.debug(`Spawning process '${chalk.gray(cmd)}' in '${chalk.blue(usedCwd)}'`);
      let childProcess: ChildProcess;
      if (!fs.pathExistsSync(usedCwd)) {
        reject(new Error('Path does not exist'));
        return;
      }
      try {
        childProcess = exec(cmd, { cwd: usedCwd, env: process.env });
      } catch (error) {
        reject(error);
        return;
      }

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
