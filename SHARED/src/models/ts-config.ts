export class TsConfig {
  compilerOptions: TsConfigCompilerOptions
}

export class TsConfigCompilerOptions {
  paths: TsConfigCompilerOptionsPaths;
  baseUrl: string;
}

export class TsConfigCompilerOptionsPaths {
  [name: string]: string[];
}
