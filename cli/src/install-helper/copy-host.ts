import { GahInfo, IFileSystemService, ILoggerService, IWorkspaceService } from '@gah/shared';
import { platform } from 'os';

export class CopyHost {
  public static copy(fileSystemService: IFileSystemService, workspaceService: IWorkspaceService, loggerService: ILoggerService, ngVersion: string, force: boolean = false) {
    const destinationFolder = './.gah';

    workspaceService.ensureGitIgnoreLine('.gah', 'Ignoring the automatically generated .gah folder');
    workspaceService.ensureGitIgnoreLine('dist', 'Ignoring the compiled output path');

    const templatePath = fileSystemService.join(__dirname, '../../assets/host-templates', ngVersion);

    const templateGahInfoPath = fileSystemService.join(templatePath, 'gah-info.json');
    const currentGahInfoPath = fileSystemService.join(destinationFolder, 'gah-info.json');
    const templateVersion = fileSystemService.parseFile<GahInfo>(templateGahInfoPath).templateVersion;
    const currentVersion = fileSystemService.tryParseFile<GahInfo>(currentGahInfoPath)?.templateVersion;

    if (templateVersion !== currentVersion) {
      loggerService.log('Deleting previous host template because a new version is available');
      // const filesToDelete = fileSystemService.getFilesFromGlob(`${destinationFolder}/*`, undefined, true, 'file');

      // for (const file in filesToDelete) {
      //   fileSystemService.deleteFile(file);
      // }

      // fileSystemService.deleteDirectoryRecursively(fileSystemService.join(destinationFolder, 'src'));
      // fileSystemService.deleteDirectoryRecursively(fileSystemService.join(destinationFolder, '.gah'));

      force = true;
    }

    if (!force) {
      return;
    }

    fileSystemService.copyFilesInDirectory(templatePath, destinationFolder);

    if (platform() === 'win32') {
      const fswin = require('fswin'); //TODO: Move this to fileSystemService!
      fswin.setAttributesSync('.gah', { IS_HIDDEN: true });
    }
  }
}
