import { IFileSystemService, IWorkspaceService } from '@awdware/gah-shared';
import { platform } from 'os';

export class CopyHost {
  public static copy(fileSystemService: IFileSystemService, workspaceService: IWorkspaceService, force: boolean = false) {
    const destinationFolder = './.gah';

    workspaceService.ensureGitIgnoreLine('.gah', 'Ignoring the automatically generated .gah folder');
    workspaceService.ensureGitIgnoreLine('dist', 'Ignoring the compiled output path');

    if (!force && fileSystemService.directoryExists(fileSystemService.join(destinationFolder, 'src', 'app'))) {
      return;
    }

    fileSystemService.copyFilesInDirectory(fileSystemService.join(__dirname, '../../assets/host-template'), destinationFolder);

    if (platform() === 'win32') {
      const fswin = require('fswin');
      fswin.setAttributesSync('.gah', { IS_HIDDEN: true });
    }
  }
}
