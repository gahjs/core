import fs from 'fs-extra';
import path_ from 'path';
import { IFileSystemService, ILoggerService, IExecutionService, FileSystemType } from '@gah/shared';
import globby from 'globby';
import { platform } from 'os';
import { ExecutionService } from './execution.service';
import { LoggerService } from './logger.service';
import { parse, stringify } from 'comment-json';
import decompress from 'decompress';
import chalk from 'chalk';
const decompressTargz = require('decompress-targz');

export class FileSystemService implements IFileSystemService {
  private readonly _executionService: IExecutionService;
  private readonly _loggerService: ILoggerService;
  private readonly _cwd: string;

  private readonly _objectStore: { [path: string]: any } = {};

  constructor(executionService: ExecutionService, loggerService: LoggerService) {
    this._executionService = executionService;
    this._loggerService = loggerService;
    this._cwd = process.cwd();
  }

  private cwd(string: string) {
    if (path_.isAbsolute(string)) {
      return string;
    }
    return this.join(this._cwd, string);
  }

  async fileExists(path: string): Promise<boolean> {
    return new Promise(r => fs.access(this.cwd(path), fs.constants.F_OK, e => r(!e)));
  }

  async readFile(path: string): Promise<string> {
    const content = await this.tryReadFile(path);
    if (content === null) {
      throw new Error(`File could not be found at: ${path}`);
    }
    return content;
  }

  async readFileLineByLine(path: string) {
    return (await this.readFile(path)).replace('\r\n', '\n').split('\n');
  }

  async tryReadFile(path: string): Promise<string | null> {
    if (!await this.fileExists(path)) {
      return null;
    }
    return fs.promises.readFile(this.cwd(path))
      .then(b => b.toString());
  }

  async tryParseFile<T>(path: string): Promise<T | null> {
    if (!await this.fileExists(path)) {
      return null;
    }
    return this.parseFile<T>(path);
  }

  async parseFile<T>(path: string): Promise<T> {
    const absolutePath = this.cwd(path);

    const str = await this.readFile(absolutePath);
    try {
      const res = parse(str) as T;
      if (!this._objectStore[absolutePath]) {
        this._objectStore[absolutePath] = res;
      } else {
        const prevObj = this._objectStore[absolutePath];
        Object.keys(prevObj).forEach(key => {
          delete prevObj[key];
        });
        Object.assign(prevObj, res);
      }
      return this._objectStore[absolutePath];
    } catch (error) {
      this._loggerService.error(`Failed to parse file: '${chalk.gray(absolutePath)}'`);
      throw error;
    }
  }

  async saveFile(path: string, content: string): Promise<void> {
    return fs.promises.writeFile(this.cwd(path), content);
  }

  async saveObjectToFile<T>(path: string, obj: T, beautify = true): Promise<void> {
    const absolutePath = this.cwd(path);

    if (!this._objectStore[absolutePath]) {
      this._objectStore[absolutePath] = obj;
    } else {
      const prevObj = this._objectStore[absolutePath];
      const objCopy = { ...obj };
      Object.keys(prevObj).forEach(key => {
        delete prevObj[key];
      });
      Object.assign(prevObj, objCopy);
    }

    const objStr = stringify(obj, null, beautify ? 2 : 0);
    return this.saveFile(absolutePath, objStr);
  }

  async ensureRelativePath(path: string, relativeFrom?: string, dontCheck = false): Promise<string> {
    if (!dontCheck && !await this.directoryExists(path)) { throw new Error(`Could not find path ${path}`); }
    relativeFrom = relativeFrom ?? this._cwd;
    if (!dontCheck && !await this.directoryExists(relativeFrom)) { throw new Error(`Could not find path ${relativeFrom}`); }

    path = path_.relative(relativeFrom, path).replace(/\\/g, '/');
    return path;
  }


  async directoryExists(path: string): Promise<boolean> {
    return fs.pathExists(this.cwd(path));
  }

  async createDirectory(path: string): Promise<void> {
    return fs.mkdir(this.cwd(path));
  }

  async ensureDirectory(path: string): Promise<void> {
    return fs.ensureDir(this.cwd(path));
  }

  async deleteFile(path: string): Promise<void> {
    if (await this.fileExists(path)) {
      return fs.unlink(this.cwd(path));
    }
  }

  async deleteFilesInDirectory(path: string): Promise<void> {
    return fs.emptyDir(this.cwd(path));
  }

  async deleteDirectory(path: string): Promise<void> {
    return fs.promises.rmdir(this.cwd(path), { recursive: true });
  }

  async copyFilesInDirectory(fromDirectory: string, toDirectory: string): Promise<void> {
    if (!await this.directoryExists(fromDirectory)) {
      throw new Error('Directory to copy from not found');
    }
    await this.ensureDirectory(toDirectory);
    return fs.copy(this.cwd(fromDirectory), this.cwd(toDirectory), { recursive: true });
  }

  async getFilesFromGlob(glob_: string, ignore?: string | string[], noDefaultIgnore?: boolean, type: FileSystemType = 'any'): Promise<string[]> {
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

    return globby(glob_, { ignore: ignore_, onlyFiles, onlyDirectories });
  }

  async copyFile(file: string, destinationFolder: string): Promise<void> {
    return fs.copyFile(this.cwd(file), this.cwd(path_.join(destinationFolder, path_.basename(file))));
  }

  async createDirLink(linkPath: string, realPath: string): Promise<void> {
    if (platform() === 'win32') {
      const cmd = `mklink /j "${this.cwd(linkPath)}" "${this.cwd(realPath)}"`;
      await this._executionService.execute(cmd, false).then(success => {
        if (!success) { throw new Error(this._executionService.executionErrorResult); }
      });
    } else {
      fs.ensureSymlink(this.cwd(realPath), this.cwd(linkPath), 'dir');
    }
  }

  async createFileLink(linkPath: string, realPath: string): Promise<void> {
    if (platform() === 'win32') {
      const cmd = `mklink /h "${this.cwd(linkPath)}" "${this.cwd(realPath)}"`;
      await this._executionService.execute(cmd, false).then(success => {
        if (!success) { throw new Error(this._executionService.executionErrorResult); }
      });
    } else {
      await fs.ensureSymlink(this.cwd(realPath), this.cwd(linkPath), 'file');
    }
  }

  getCwdName(): string {
    return path_.basename(this._cwd);
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
    return path_.resolve(this.cwd(path)).replace(/\\/g, '/');
  }

  async decompressTargz(filePath: string, destinationPath: string) {
    return decompress(filePath, destinationPath, {
      plugins: [
        decompressTargz()
      ]
    })
      .then(() => true)
      .catch((reason) => {
        this._loggerService.error(reason);
        return false;
      });
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    return fs.rename(this.cwd(oldPath), this.cwd(newPath));
  }

  async deleteDirectoryRecursively(path: string): Promise<void> {
    return fs.promises.rmdir(this.cwd(path), { recursive: true });
  }
}
