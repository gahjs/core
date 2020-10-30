export interface IGitService {
  init(): Promise<void>;
  getRootDir(): Promise<string>;
  isGitRepo(): Promise<boolean>;
  getCurrentBranchName(): Promise<string>;
  getModifiedLines(): Promise<string[]>;
  getBranchStateOfFile(filePath: string): Promise<string>;
  discardFile(filePath: string): Promise<void>;
}
