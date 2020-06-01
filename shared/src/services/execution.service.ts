export interface IExecutionService {
  execute(cmd: string, outPut: boolean, outPutCallback?: (out: string) => string): Promise<boolean>;
  executionResult: string;
  executionErrorResult: string;
}
