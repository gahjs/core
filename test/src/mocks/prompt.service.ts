import { injectable } from 'inversify';
import { PromptConfig, FuzzyPathPromptConfig, SelectionPromptConfig } from '@gah/shared';
import { PromptService } from '@gah/cli/lib/services/prompt.service';
import { PromptMock } from '../helper/prompt';


const respose = (cfg: PromptConfig, type: "string" | "number" | "boolean" | "object") => {
  if (!cfg.enabled()) {
    return undefined as any;
  }
  const res = PromptMock.getMock();

  const validType = typeof res !== type || type === 'object' && typeof res === 'number';
  if (!validType) {
    throw new Error('Prompt was called the mocked response had the wrong type! expected: ' + type + ', actual: ' + typeof res);
  }

  if (type === 'object' && typeof res === 'number') {
    return [(cfg as any).choices()[res]]
  }
  if (type === 'object' && typeof res === 'object' && typeof (res as any[])[0] === 'number') {
    return (res as any as number[]).map(x => (cfg as any).choices()[x]);
  }

  return res;
}


@injectable()
export class MockPromptService extends PromptService {
  constructor() {
    super();
  }

  public async input(cfg: PromptConfig): Promise<string> {
    const res = respose(cfg, 'string');
    return res;
  }

  public async confirm(cfg: PromptConfig): Promise<boolean> {
    const res = respose(cfg, 'boolean');
    return res;
  }

  public async fuzzyPath(cfg: FuzzyPathPromptConfig): Promise<string> {
    const res = respose(cfg, 'string');
    return res;
  }

  public async list(cfg: SelectionPromptConfig): Promise<string> {
    const res = respose(cfg, 'string');
    return res;
  }

  public async checkbox(cfg: SelectionPromptConfig): Promise<string[]> {
    const res = respose(cfg, 'object');
    return res;
  }
}
