import { IFileSystemService } from '@awdware/gah-shared';

export class CopyHost {
  public static copyIfNeeded(fileSystemService: IFileSystemService) {
    const destinationFolder = './.gah';
    if (fileSystemService.directoryExists(fileSystemService.join(destinationFolder, 'src', 'app'))) {
      return;
    }
    fileSystemService.copyFilesInDirectory(fileSystemService.join(__dirname, '../../assets/host-template'), destinationFolder);
  }
}
