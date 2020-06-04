import { IFileSystemService, TsConfigCompilerOptionsPaths, TsConfig } from '@awdware/gah-shared';

export class TsConfigFile {
  private _fileSystemService: IFileSystemService;

  private _path: string;
  private _tsConfig: TsConfig;

  public clean() {
    if (!this._tsConfig.compilerOptions.paths) {
      this._tsConfig.compilerOptions.paths = new TsConfigCompilerOptionsPaths();
    }

    const allPaths = Object.keys(this._tsConfig.compilerOptions.paths);
    allPaths.forEach((x) => {
      if (x.startsWith('@gah-deps')) {
        delete this._tsConfig.compilerOptions.paths[x];
      }
    });

    if (!this._tsConfig.compilerOptions.baseUrl) {
      this._tsConfig.compilerOptions.baseUrl = './';
    }

    this.save();
  }

  constructor(path: string, fileSystemService: IFileSystemService) {
    this._fileSystemService = fileSystemService;
    this._path = path;

    this._tsConfig = this._fileSystemService.parseFile<TsConfig>(this._path);

  }

  public save() {
    this._fileSystemService.saveObjectToFile(this._path, this._tsConfig);
  }

  public addPathAlias(aliasName: string, path: string) {
    this._tsConfig.compilerOptions.paths[aliasName] = [path];
  }
}
