export interface ITemplateService {
  renderFile<T>(sourceFilePath: string, data: T, outputFilePath: string): Promise<void>;
}
