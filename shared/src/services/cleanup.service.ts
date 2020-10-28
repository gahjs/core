export interface ICleanupService {
  cleanTsConfig(): Promise<void>;
  cleanPackages(): Promise<void>;
  logTsConfigPathAddition(filePath: string, key: string): void;
  logPackageJsonDependencyChange(filePath: string, dependencyKey: string, prevValue: string, newValue: string): void;
}
