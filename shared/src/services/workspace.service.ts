import { GlobalGahData } from "../models/global-gah-data";

export interface IWorkspaceService {
  ensureGitIgnoreLine(gitIgnorePattern: string, description?: string, cwd?: string): void;
  getGlobalGahFolder(): string;
  getGlobalData(): GlobalGahData;
  saveGlobalGahData(data: GlobalGahData): void;
}
