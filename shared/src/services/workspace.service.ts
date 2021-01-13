import { GlobalGahData } from '../models/global-gah-data';

export interface IWorkspaceService {
  ensureGitIgnoreLine(gitIgnorePattern: string, description?: string, cwd?: string): Promise<void>;
  getGlobalGahFolder(): string;
  getWorkspaceFolder(): string;
  getWorkspaceHash(): string;
  getGlobalData(): Promise<GlobalGahData>;
  saveGlobalGahData(data: GlobalGahData): Promise<void>;
}
