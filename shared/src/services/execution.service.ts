export interface IExecutionService {
  execute(cmd: string, outPut: boolean, outPutCallback?: (out: string) => string, cwd?: string): Promise<boolean>;
  executeAndForget(executeable: string, options: string[], outPut: boolean, cwd?: string): Promise<boolean>;
  executionResult: string;
  executionErrorResult: string;
}
