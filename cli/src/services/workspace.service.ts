import { injectable } from 'inversify';
import { FileSystemService } from './file-system.service';
import { IWorkspaceService, IFileSystemService, GlobalGahData, IContextService } from '@gah/shared';
import { platform, homedir } from 'os';
import { createHash } from 'crypto';
import { DIContainer } from '../di-container';
import { ContextService } from './context-service';

@injectable()
export class WorkspaceService implements IWorkspaceService {
  private readonly _fileSystemService: IFileSystemService;
  private readonly _contextService: IContextService;

  constructor() {
    this._fileSystemService = DIContainer.get(FileSystemService);
    this._contextService = DIContainer.get(ContextService);
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
    const isTextContext = this._contextService.getContext().test;
    if (platform() === 'win32') {
      return this._fileSystemService.join(process.env.APPDATA!, '..', 'Local', isTextContext ? 'gah-test' : 'gah');
    } else {
      return this._fileSystemService.join(homedir(), isTextContext ? 'gah-test' : 'gah');
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
