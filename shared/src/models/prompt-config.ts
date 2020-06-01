export class PromptConfig {
  msg: string;
  default?: any;
  enabled: () => boolean = () => true;
  cancelled: boolean = false;
  validator?: (val: any) => boolean;
}

export class FuzzyPathPromptConfig extends PromptConfig {
  itemType?: 'any' | 'directory' | 'file' = 'any';
  excludePath?: (val: string) => boolean;
}

export class SelectionPromptConfig extends PromptConfig {
  choices: () => string[];
}
