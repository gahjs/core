import { injectable } from 'inversify';
import { exec } from 'child_process';
import { IExecutionService } from '@awdware/gah-shared';

@injectable()
export class ExecutionService implements IExecutionService {
  public executionResult: string = '';
  public executionErrorResult: string = '';

  public execute(cmd: string, outPut: boolean, outPutCallback?: (out: string) => string): Promise<boolean> {
    return new Promise((resolve) => {
      const childProcess = exec(cmd);

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
        if (outPut) {
          console.error(buffer);
        }
        this.executionResult += buffer;
        this.executionErrorResult += buffer;
      });

      childProcess.on('exit', code => {
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
}
