import { IFileSystemService } from '@awdware/gah-shared';

export class CopyHost {
  public static copy(fileSystemService: IFileSystemService) {
    const destinationFolder = './.gah';
    fileSystemService.copyFilesInDirectory(fileSystemService.join(__dirname, '../../assets/host-template'), destinationFolder);
  }
}
