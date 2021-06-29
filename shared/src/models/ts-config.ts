import { GahAngularCompilerOptions } from './gah-angular-compiler-options';

export class TsConfig {
  extends: string;
  compilerOptions: TsConfigCompilerOptions;
  angularCompilerOptions?: GahAngularCompilerOptions;
}

export class TsConfigCompilerOptions {
  paths: TsConfigCompilerOptionsPaths;
  baseUrl: string;
  target: string;
}

export class TsConfigCompilerOptionsPaths {
  [name: string]: string[] | undefined;
}
