export type FileSystemType = 'any' | 'file' | 'directory';

export interface IFileSystemService {
  /**
   * Synchronously tests whether or not the given file exists by checking with the file system.
   * @param path  A path to a file.
   */
  fileExists(path: string): Promise<boolean>;
  /**
   * Synchronously reads the entire contents of a file.
   * @param path  A path to a file.
   * @returns The entire content of the file as a string
   */
  readFile(path: string): Promise<string>;
  /**
   * Synchronously reads the entire contents of a file and returns an array of string lines.
   * @param path  A path to a file.
   * @returns The entire content of the file line by line in a string array
   */
  readFileLineByLine(path: string): Promise<string[]>;
  /**
   * Tries to synchronously read the entire contents of a file.
   * @param path  A path to a file.
   * @returns The entire content of the file or null if it does not exist
   */
  tryReadFile(path: string): Promise<string | null>;
  /**
   * Synchronously reads the file and parses it to `T`.
   * @typeParam T  Type of the parsed object.
   * @param path  A path to a file.
   * @returns The parsed object of type `T`
   */
  parseFile<T>(path: string): Promise<T>;
  /**
   * Tries to synchronously read and parse the file to `T`.
   * @param path  A path to a file.
   * @returns The parsed object of type `T` or null if the file does not exist
   */
  tryParseFile<T>(path: string): Promise<T | null>;
  /**
   * Synchronously saves a string to a file.
   * @param path  A path to a file.
   * @param content  The content of the file.
   */
  saveFile(path: string, content: string): Promise<void>;
  /**
   * Synchronously saves an object to a file with json structure.
   * @typeParam T  Type of the object that should be saved.
   * @param path  A path to a file.
   * @param content  The content of the file.
   * @param beautify  Determines whether the json file should be beautified. Defaults to true
   */
  saveObjectToFile<T>(path: string, obj: T, beautify?: boolean): Promise<void>;
  /**
   * Converts an absolute path to a relative path. Converts all paths to unix/web forward slashes.
   * @param path  An absolute or relative path
   * @param relativeFrom  The directory from which the path should be reachable. Defaults to process.cwd().
   * @param dontCheck  Flag whether the folders folder existance-check should be skipped. Defaults to false.
   * @returns The relative unix/web-style path
   */
  ensureRelativePath(path: string, relativeFrom?: string, dontCheck?: boolean): Promise<string>;
  /**
   * Synchronously tests whether or not the given directory exists by checking with the file system.
   * @param path  A path to a directory.
   */
  directoryExists(path: string): Promise<boolean>;
  /**
   * Synchronously creates a directory.
   * @param path  A path to the directory that should be created.
   */
  createDirectory(path: string): Promise<void>;
  /**
   * Synchronously creates a directory if it does not exist yet.
   * @param path  A path to the directory that should be created.
   */
  ensureDirectory(path: string): Promise<void>;
  /**
   * Synchronously deletes a single file.
   * @param path  A path to the file that should be deleted.
   */
  deleteFile(path: string): Promise<void>;
  /**
   * Synchronously deletes all files in a specific directory.
   * @param path  A path to the directory that the files should be deleted from.
   */
  deleteFilesInDirectory(path: string): Promise<void>;
  /**
   * Synchronously copies all files from one directoy to another.
   * @param fromDirectory  The directory to copy from.
   * @param toDirectory  The directory to copy to.
   */
  copyFilesInDirectory(fromDirectory: string, toDirectory: string): Promise<void>;
  /**
   * Synchronously find all file-paths that match the provided globbing pattern.
   * @param glob  The globbing pattern for finding the files.
   * @param ignore  A single pattern or a array of patters that should be excluded from the glob search.
   * @param noDefaultIgnore  Set this parameter to true if you want to disable the default ignore patterns for this search.
   * @returns A string array of relative paths to the matches files.
   */
  getFilesFromGlob(glob: string, ignore?: string | string[], noDefaultIgnore?: boolean, type?: FileSystemType): Promise<string[]>;
  /**
   * @param file The path to the file that should be copied
   * @param destinationFolder The path to the destonation folder
   */
  copyFile(file: string, destinationFolder: string): Promise<void>;
  /**
   * Synchronously creates a symbolic link to a directory.
   * @param linkPath  The path of the link that gets created.
   * @param realPath  The path of the directory that should get linked to.
   */
  createDirLink(linkPath: string, realPath: string): Promise<void>;
  /**
   * Synchronously creates a symbolic link to a file.
   * @param linkPath  The path of the link that gets created.
   * @param realPath  The path of the file that should get linked to.
   */
  createFileLink(linkPath: string, realPath: string): Promise<void>;
  /**
   * Get the name of the current working directory
   */
  getCwdName(): string;
  /**
   * Returns the path to the directory containing the provided file
   * @param filePath The path to the file in the directory
   */
  getDirectoryPathFromFilePath(filePath: string): string;
  /**
   * Returns the name of the file of the provided path
   * @param filePath The path to the file
   */
  getFilenameFromFilePath(filePath: string): string;
  /**
   * Returns a joined path with forward slashes
   * @param basePath The fist path
   * @param subPaths The path(s) to join
   */
  join(basePath: string, ...subPaths: string[]): string;
  /**
   * Returns the name of the directory the provided path is located in
   * @param filePath The path to the file
   */
  directoryName(filePath: string): string;
  /**
   * Returns the absolute path to a provided path
   * @param path The path that should be ensured to be absolute
   */
  ensureAbsolutePath(path: string): string;
  /**
   * Decompresses a targz archive
   * @param filePath The path to the archive
   * @param destinationPath The destination path for the decompressed files
   * @returns whether the decompression was successful
   */
  decompressTargz(filePath: string, destinationPath: string): Promise<boolean>;
  /**
   * Renames a file or directory
   * @param oldPath The old path of the file or directory
   * @param newPath The new path of the file or directory
   */
  rename(oldPath: string, newPath: string): Promise<void>;
  /**
   * Synchronously deletes a directory with its contents.
   * @param path  A path to the directory that should be deleted.
   */
  deleteDirectoryRecursively(path: string): Promise<void>;
}
