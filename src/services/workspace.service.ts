import { injectable, inject } from 'inversify';
import { FileSystemService } from './file-system.service';
import { IWorkspaceService, IFileSystemService } from '@awdware/gah-shared';

@injectable()
export class WorkspaceService implements IWorkspaceService {
  @inject(FileSystemService)
  private _fileSystemService: IFileSystemService;

  ensureGitIgnoreLine(gitIgnorePattern: string, description?: string, baseDir?: string) {
    const gitIgnorePath = baseDir ? this._fileSystemService.join(baseDir, '.gitignore') : '.gitignore';

    if (!this._fileSystemService.fileExists(gitIgnorePath)) {
      this._fileSystemService.saveFile(gitIgnorePath, '## Added by gah\n\n');
    }

    const gitIgnoreLines = this._fileSystemService.readFileLineByLine(gitIgnorePath);
    if (!gitIgnoreLines.includes(gitIgnorePattern)) {
      if (gitIgnoreLines[gitIgnoreLines.length - 1]) {
        gitIgnoreLines.push('');
      }
      if (description)
        gitIgnoreLines.push(`# ${description}`);
      gitIgnoreLines.push(gitIgnorePattern);
    }
    this._fileSystemService.saveFile(gitIgnorePath, gitIgnoreLines.join('\n'));
  }
}
