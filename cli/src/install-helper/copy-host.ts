import { GahInfo, IFileSystemService, ILoggerService, IWorkspaceService } from '@gah/shared';
import { platform } from 'os';

export class CopyHost {
  public static async copy(
    fileSystemService: IFileSystemService,
    workspaceService: IWorkspaceService,
    loggerService: ILoggerService,
    ngVersion: string,
    force: boolean = false
  ) {
    const destinationFolder = './.gah';

    await workspaceService.ensureGitIgnoreLine('.gah', 'Ignoring the automatically generated .gah folder');
    await workspaceService.ensureGitIgnoreLine('dist', 'Ignoring the compiled output path');

    const templatePath = fileSystemService.join(__dirname, '../../assets/host-templates', ngVersion);

    const templateGahInfoPath = fileSystemService.join(templatePath, 'gah-info.json');
    const currentGahInfoPath = fileSystemService.join(destinationFolder, 'gah-info.json');
    const templateVersion = (await fileSystemService.parseFile<GahInfo>(templateGahInfoPath)).templateVersion;
    const currentVersion = (await fileSystemService.tryParseFile<GahInfo>(currentGahInfoPath))?.templateVersion;

    if (templateVersion !== currentVersion) {
      loggerService.log('Deleting previous host template because a new version is available');
      const filesToDelete = await fileSystemService.getFilesFromGlob(`${destinationFolder}/*`, undefined, true, 'file');

      for (const file in filesToDelete) {
        await fileSystemService.deleteFile(file);
      }

      const dirsToDelele = [fileSystemService.join(destinationFolder, 'src'), fileSystemService.join(destinationFolder, '.gah')];

      for (const dirToDelete in dirsToDelele) {
        if (await fileSystemService.directoryExists(dirToDelete)) {
          await fileSystemService.deleteDirectoryRecursively(dirToDelete);
        }
      }

      force = true;
    }

    if (!force) {
      return;
    }

    await fileSystemService.copyFilesInDirectory(templatePath, destinationFolder);

    if (platform() === 'win32') {
      const fswin = require('fswin'); //TODO: Move this to fileSystemService!
      fswin.setAttributesSync('.gah', { IS_HIDDEN: true });
    }
  }
}
