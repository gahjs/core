import { GahAngularCompilerOptions } from './gah-angular-compiler-options';

export class TsConfig {
  compilerOptions: TsConfigCompilerOptions
  angularCompilerOptions?: GahAngularCompilerOptions;
}

export class TsConfigCompilerOptions {
  paths: TsConfigCompilerOptionsPaths;
  baseUrl: string;
  target: string;
}

export class TsConfigCompilerOptionsPaths {
  [name: string]: string[];
}
