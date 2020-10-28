export interface CleanupData {
  tsConfig: CleanupTsConfigData[];
  packageJson: CleanupPackageJsonData[];
}

export interface CleanupTsConfigData {
  filePath: string;
  key: string;
}

export interface CleanupPackageJsonData {
  filePath: string;
  dependencyKey: string;
  prevValue: string;
  newValue: string;
}