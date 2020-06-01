export interface IWorkspaceService {
  ensureGitIgnoreLine(gitIgnorePattern: string, description?: string, cwd?: string): void;
}
