import * as gahMain from '@gah/cli/lib/gah-main';
import { DIContainer as gahDiContainer } from '@gah/cli/lib/di-container';
import { PromptService } from '@gah/cli/lib/services/prompt.service';
import { MockPromptService } from '../mocks/prompt.service';


import path from 'path';
import fs from 'fs-extra';
import { homedir, platform } from 'os';
import { parse, stringify } from 'comment-json';
import { PromptMock } from './prompt';
import { asClass } from 'awilix';
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
    PromptMock.reset();
  }

  async clean() {
    gahDiContainer.register({ promptService: asClass(MockPromptService) });
    gahDiContainer.dispose();

    await fs.promises.rmdir(workingDir, { recursive: true });
    await fs.ensureDir(workingDir);

    let globalPath: string;
    if (platform() === 'win32') {
      globalPath = path.join(process.env.APPDATA!, '..', 'Local', 'gah-test');
    } else {
      globalPath = path.join(homedir(), 'gah-test');
    }
    await fs.promises.rmdir(globalPath, { recursive: true });
  }

  async runGah(dir: string, args: string[]) {
    process.argv = [process.argv[0], path.resolve("../../../cli/lib/index.js"), ...args, '--useTestContext'];
    const cwd = path.join(workingDir, dir);
    process.cwd = () => cwd;
    console.log('CWD: ' + cwd);

    await gahMain.gahMain()
      .catch((err: any) => {
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

  async modifyModuleConfig(moduleName: string, configPropertyChain: string, newValue: any) {
    const modulePath = path.join(workingDir, moduleName, 'gah-module.json');
    return this.modifyJsonConfig(modulePath, configPropertyChain, newValue);
  }

  async modifyJsonConfig(filePath: string, configPropertyChain: string, newValue: any) {
    const config = parse((await fs.promises.readFile(filePath)).toString());
    let currentStep = config;
    const propertyChain = configPropertyChain.split('.');
    const lastChainKey = propertyChain.pop()!;
    propertyChain.forEach(propChainKey => {
      currentStep = currentStep[propChainKey];
    });
    currentStep[lastChainKey] = newValue;
    await fs.promises.writeFile(filePath, stringify(config));
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
      actualContent.should.equal(expectedContent);
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
