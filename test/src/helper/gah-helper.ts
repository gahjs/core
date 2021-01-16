import * as gahMain from '@gah/cli/lib/gah-main';
import path from 'path';
import sinon from 'sinon';
import fs from 'fs-extra';

const workingDir = path.join(__dirname, '../../working-dir');
const resourcesDir = path.join(__dirname, '../resources');
export class GahHelper {
  testTitle: string;
  testId: number;

  constructor(title: string) {
    this.testTitle = title;
    this.testId = Number.parseInt(title.split('_')[0]);
  }

  async clean() {

    await fs.promises.rmdir(workingDir, { recursive: true });
    await fs.ensureDir(workingDir);
  }

  async runGah(dir: string, args: string[]) {
    process.argv = [process.argv[0], path.resolve("../../../cli/lib/index.js"), ...args];
    process.cwd = () => path.join(workingDir, dir);

    await gahMain.gahMain()
      .catch((err) => {
        console.error(err);
      });
  }

  async runInstall(dir: string, skipPackageInstall = false) {
    await this.runGah(dir, skipPackageInstall ? ['i', '--skipPackageInstall'] : ['i']);
  }

  async copyModules(moduleNames: string[]) {
    const allModuleCopyTasks = moduleNames.map(moduleName => fs.copy(path.join(resourcesDir, moduleName), path.join(workingDir, moduleName)));
    await Promise.all(allModuleCopyTasks);
  }

  async initModule(moduleName: string, entry: boolean = false) {

  }
}
