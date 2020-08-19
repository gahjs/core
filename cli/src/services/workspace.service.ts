import { injectable, inject } from 'inversify';
import { FileSystemService } from './file-system.service';
import { IWorkspaceService, IFileSystemService, GlobalGahData } from '@awdware/gah-shared';
import { platform, homedir } from 'os';

@injectable()
export class WorkspaceService implements IWorkspaceService {
  @inject(FileSystemService)
  private readonly _fileSystemService: IFileSystemService;

  public ensureGitIgnoreLine(gitIgnorePattern: string, description?: string, baseDir?: string) {
    const gitIgnorePath = baseDir ? this._fileSystemService.join(baseDir, '.gitignore') : '.gitignore';

    if (!this._fileSystemService.fileExists(gitIgnorePath)) {
      this._fileSystemService.saveFile(gitIgnorePath, '## Added by gah\n\n');
    }

    const gitIgnoreLines = this._fileSystemService.readFileLineByLine(gitIgnorePath);
    if (!gitIgnoreLines.some(x => x.indexOf(gitIgnorePattern) !== -1)) {
      if (gitIgnoreLines[gitIgnoreLines.length - 1]) {
        gitIgnoreLines.push('');
      }
      if (description) {
        gitIgnoreLines.push(`# ${description}`);
      }
      gitIgnoreLines.push(gitIgnorePattern);
      this._fileSystemService.saveFile(gitIgnorePath, gitIgnoreLines.join('\n'));
    }
  }

  public getGlobalGahFolder(): string {
    if (platform() === 'win32') {
      return this._fileSystemService.join(process.env.APPDATA!, '..', 'Local', 'awdware', 'gah');
    } else {
      return this._fileSystemService.join(homedir(), 'awdware', 'gah');
    }
  }

  public getGlobalData(): GlobalGahData {
    const globalDataPath = this._fileSystemService.join(this.getGlobalGahFolder(), 'data.json');
    if (!this._fileSystemService.fileExists(globalDataPath)) {
      return {} as GlobalGahData;
    }
    return this._fileSystemService.parseFile<GlobalGahData>(globalDataPath);
  }
  public saveGlobalGahData(data: GlobalGahData) {
    const globalDataPath = this._fileSystemService.join(this.getGlobalGahFolder(), 'data.json');
    return this._fileSystemService.saveObjectToFile(globalDataPath, data);
  }
}
