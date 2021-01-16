import * as gahMain from '@gah/cli/lib/gah-main';
import path from 'path';
import sinon from 'sinon';
import fs from 'fs-extra';
import { parse, stringify } from 'comment-json';
require('should');

const workingDir = path.join(__dirname, '../../working-dir');
const resourcesDir = path.join(__dirname, '../resources');
const resultsDir = path.join(__dirname, '../results');
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

  async runPluginUpdate(dir: string) {
    await this.runGah(dir, ['plugin', 'update']);
  }

  async copyModules(moduleNames: string[]) {
    const allModuleCopyTasks = moduleNames.map(moduleName => fs.copy(path.join(resourcesDir, moduleName), path.join(workingDir, moduleName)));
    await Promise.all(allModuleCopyTasks);
  }

  async compareHost() {
    const expectedRoot = path.join(resultsDir, this.testId + '', 'host');
    const actualRoot = path.join(workingDir, 'host');

    const expectedFilePaths = await this.getFiles(expectedRoot);
    for (const expectedFilePath of expectedFilePaths) {
      const relativePath = path.relative(expectedRoot, expectedFilePath);
      const actualFilePath = path.join(actualRoot, relativePath);
      const expectedContent = (await fs.promises.readFile(expectedFilePath)).toString().replace(/\s/g, '');
      const actualContent = (await fs.promises.readFile(actualFilePath)).toString().replace(/\s/g, '');
      expectedContent.should.equal(actualContent);
    }
  }

  private async getFiles(dir: string): Promise<string[] | string> {
    const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(dirents.map((dirent) => {
      const res = path.resolve(dir, dirent.name);
      return dirent.isDirectory() ? this.getFiles(res) : res;
    }));
    return Array.prototype.concat(...files);
  }

  async initModule(moduleName: string, entry: boolean = false) {

  }
}
