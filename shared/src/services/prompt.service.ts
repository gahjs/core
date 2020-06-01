import { PromptConfig, FuzzyPathPromptConfig, SelectionPromptConfig } from '../models/prompt-config';

export interface IPromptService {
  input(cfg: PromptConfig): Promise<string>;
  confirm(cfg: PromptConfig): Promise<boolean>;
  fuzzyPath(cfg: FuzzyPathPromptConfig): Promise<string>;
  list(cfg: SelectionPromptConfig): Promise<string>;
  checkbox(cfg: SelectionPromptConfig): Promise<string[]>;
}
