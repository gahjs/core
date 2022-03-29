export interface ITemplateService {
  renderFile<T extends { [key: string]: any }>(sourceFilePath: string, data: T, outputFilePath: string): Promise<void>;
}
