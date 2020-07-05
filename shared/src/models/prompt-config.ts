import { FileSystemType } from '../services/file-system.service';

export class PromptConfig {
  msg: string;
  default?: any;
  enabled: () => boolean = () => true;
  validator?: (val: any) => boolean;
}

export class FuzzyPathPromptConfig extends PromptConfig {
  itemType?: FileSystemType = 'any';
  excludePattern?: string[];
  exclude?: (val: string) => boolean;
}

export class SelectionPromptConfig extends PromptConfig {
  choices: () => string[];
}
