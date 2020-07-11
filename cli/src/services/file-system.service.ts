import { injectable, inject } from 'inversify';
import fs from 'fs-extra';
import path_ from 'path';
import { IFileSystemService, ILoggerService, IExecutionService, FileSystemType } from '@awdware/gah-shared';
import globby from 'globby';
import { platform } from 'os';
import { ExecutionService } from './execution.service';
import { LoggerService } from './logger.service';
import {parse, stringify} from 'comment-json';

@injectable()
export class FileSystemService implements IFileSystemService {
  @inject(ExecutionService)
  private readonly _executionService: IExecutionService;
  @inject(LoggerService)
  private readonly _loggerService: ILoggerService;

  constructor() { }

  fileExists(path: string): boolean {
    return fs.existsSync(path);
  }

  readFile(path: string): string {
    const content = this.tryReadFile(path);
    if (content === null) {
      throw new Error(`File could not be found at: ${path}`);
    }
    return content;
  }

  readFileLineByLine(path: string) {
    return this.readFile(path).replace('\r\n', '\n').split('\n');
  }

  tryReadFile(path: string): string | null {
    if (!this.fileExists(path)) {
      return null;
    }
    return fs.readFileSync(path).toString();
  }

  parseFile<T>(path: string): T {
    const str = this.readFile(path);
    return parse(str) as T;
  }

  saveFile(path: string, content: string): void {
    fs.writeFileSync(path, content);
  }

  saveObjectToFile<T>(path: string, obj: T, beautify = true): void {
    const objStr = stringify(obj, null, beautify ? 2 : 0);
    this.saveFile(path, objStr);
  }

  ensureRelativePath(path: string, relativeFrom?: string, dontCheck = false) {
    if (!dontCheck && !this.directoryExists(path)) { throw new Error(`Could not find path ${path}`); }
    relativeFrom = relativeFrom ?? process.cwd();
    if (!dontCheck && !this.directoryExists(relativeFrom)) { throw new Error(`Could not find path ${relativeFrom}`); }

    path = path_.relative(relativeFrom, path).replace(/\\/g, '/');
    return path;
  }


  directoryExists(path: string): boolean {
    return fs.existsSync(path);
  }

  createDirectory(path: string): void {
    fs.mkdirSync(path);
  }

  ensureDirectory(path: string): void {
    fs.ensureDirSync(path);
  }

  deleteFile(path: string): void {
    if (this.fileExists(path)) { fs.unlinkSync(path); }
  }

  deleteFilesInDirectory(path: string): void {
    fs.emptyDirSync(path);
  }

  copyFilesInDirectory(fromDirectory: string, toDirectory: string) {
    if (!this.directoryExists(fromDirectory)) { throw new Error('Directory to copy from not found'); }
    this.ensureDirectory(toDirectory);
    fs.copySync(fromDirectory, toDirectory, { recursive: true });
  }

  getFilesFromGlob(glob_: string, ignore?: string | string[], noDefaultIgnore?: boolean, type: FileSystemType = 'any'): string[] {
    const ignore_ = new Array<string>();
    if (!noDefaultIgnore) {
      ignore_.push('**/node_modules/**');
      ignore_.push('/node_modules/**');
      ignore_.push('**/.gah/**');
    }
    if (ignore && typeof (ignore) === 'string') { ignore_.push(ignore); }
    if (ignore && Array.isArray(ignore)) { ignore.forEach(x => ignore_.push(x)); }

    const onlyFiles = type && type === 'file';
    const onlyDirectories = type && type === 'directory';

    return globby.sync(glob_, { ignore: ignore_, onlyFiles, onlyDirectories });
  }

  copyFile(file: string, destinationFolder: string) {
    fs.copyFileSync(file, path_.join(destinationFolder, path_.basename(file)));
  }

  async createDirLink(linkPath: string, realPath: string) {
    if (platform() === 'win32') {
      const cmd = `mklink /j "${linkPath}" "${realPath}"`;
      await this._executionService.execute(cmd, false).then(success => {
        if (!success) { throw new Error(this._executionService.executionErrorResult); }
      });
    } else {
      fs.ensureSymlink(realPath, linkPath, 'dir');
    }
  }

  async createFileLink(linkPath: string, realPath: string) {
    if (platform() === 'win32') {
      const cmd = `mklink /h "${linkPath}" "${realPath}"`;
      await this._executionService.execute(cmd, false).then(success => {
        if (!success) { throw new Error(this._executionService.executionErrorResult); }
      });
    } else {
      await fs.ensureSymlink(realPath, linkPath, 'file');
    }
  }

  getCwdName(): string {
    return path_.basename(process.cwd());
  }

  getDirectoryPathFromFilePath(filePath: string): string {
    return path_.dirname(filePath);
  }

  getFilenameFromFilePath(filePath: string): string {
    return path_.basename(filePath);
  }

  join(basePath: string, ...subPaths: string[]): string {
    return path_.join(basePath, ...subPaths).replace(/\\/g, '/');
  }

  directoryName(filePath: string): string {
    filePath = this.ensureAbsolutePath(filePath);
    return path_.basename(path_.dirname(filePath));
  }

  ensureAbsolutePath(path: string) {
    if (path_.isAbsolute(path)) { return path.replace(/\\/g, '/'); }
    return path_.resolve(path).replace(/\\/g, '/');
  }
}
