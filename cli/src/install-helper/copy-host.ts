import { IFileSystemService, IWorkspaceService } from '@awdware/gah-shared';
import { platform } from 'os';

export class CopyHost {
  public static copy(fileSystemService: IFileSystemService, workspaceService: IWorkspaceService, ngVersion: string, force: boolean = false) {
    const destinationFolder = './.gah';

    workspaceService.ensureGitIgnoreLine('.gah', 'Ignoring the automatically generated .gah folder');
    workspaceService.ensureGitIgnoreLine('dist', 'Ignoring the compiled output path');

    if (!force && fileSystemService.directoryExists(fileSystemService.join(destinationFolder, 'src', 'app'))) {
      return;
    }

    const templatePath = fileSystemService.join(__dirname, '../../assets/host-templates', ngVersion);
    fileSystemService.copyFilesInDirectory(templatePath, destinationFolder);

    if (platform() === 'win32') {
      const fswin = require('fswin'); //TODO: Move this to fileSystemService!
      fswin.setAttributesSync('.gah', { IS_HIDDEN: true });
    }
  }
}
