import { injectable } from 'inversify';
import { FileSystemService } from './file-system.service';
import { IWorkspaceService, IFileSystemService, GlobalGahData, ILoggerService } from '@gah/shared';
import { platform, homedir } from 'os';
import { createHash } from 'crypto';
import { LoggerService } from './logger.service';
import DIContainer from '../di-container';

@injectable()
export class WorkspaceService implements IWorkspaceService {
  private readonly _fileSystemService: IFileSystemService;
  private readonly _loggerService: ILoggerService;

  constructor() {
    this._fileSystemService = DIContainer.get(FileSystemService);
    this._loggerService = DIContainer.get(LoggerService);
  }

  public async ensureGitIgnoreLine(gitIgnorePattern: string, description?: string, baseDir?: string): Promise<void> {
    const gitIgnorePath = baseDir ? this._fileSystemService.join(baseDir, '.gitignore') : '.gitignore';

    if (!await this._fileSystemService.fileExists(gitIgnorePath)) {
      await this._fileSystemService.saveFile(gitIgnorePath, '## Added by gah\n\n');
    }

    const gitIgnoreLines = await this._fileSystemService.readFileLineByLine(gitIgnorePath);
    if (!gitIgnoreLines.some(x => x.indexOf(gitIgnorePattern) !== -1)) {
      if (gitIgnoreLines[gitIgnoreLines.length - 1]) {
        gitIgnoreLines.push('');
      }
      if (description) {
        gitIgnoreLines.push(`# ${description}`);
      }
      gitIgnoreLines.push(gitIgnorePattern);
      await this._fileSystemService.saveFile(gitIgnorePath, gitIgnoreLines.join('\n'));
    }
  }

  public getGlobalGahFolder(): string {
    if (platform() === 'win32') {
      return this._fileSystemService.join(process.env.APPDATA!, '..', 'Local', 'gah');
    } else {
      return this._fileSystemService.join(homedir(), 'gah');
    }
  }

  public async getGlobalData(): Promise<GlobalGahData> {
    const globalDataPath = this._fileSystemService.join(this.getGlobalGahFolder(), 'data.json');
    if (!await this._fileSystemService.fileExists(globalDataPath)) {
      return {} as GlobalGahData;
    }
    return await this._fileSystemService.parseFile<GlobalGahData>(globalDataPath);
  }

  public async saveGlobalGahData(data: GlobalGahData) {
    const globalDataPath = this._fileSystemService.join(this.getGlobalGahFolder(), 'data.json');
    await this._fileSystemService.ensureDirectory(this.getGlobalGahFolder());
    await this._fileSystemService.saveObjectToFile(globalDataPath, data);
  }

  public getWorkspaceHash(): string {
    return createHash('md5').update(process.cwd()).digest('hex').substr(0, 6);
  }

  public getWorkspaceFolder(): string {
    return this._fileSystemService.join(this.getGlobalGahFolder(), this.getWorkspaceHash());
  }
}
