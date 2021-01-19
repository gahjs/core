export interface ICleanupService {
  cleanPendingChanges(): Promise<void>;
  registerJsonFileTemporaryChange(filePath: string, propertyPath: string, previousValue: any): void;
  cleanJsonFileTemporaryChanges(): Promise<void>;
}
