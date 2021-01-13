import { ExtractEventPayloadFromName, GahEventDefinitions, GahEventName } from '@gah/shared';

export enum InstallUnitResult {
  unknown = 0,
  succeeded = 1,
  failed = 2,
  warnings = 3,
  skipped = 4
}

type InstallUnitReturn = void | InstallUnitResult | (void | InstallUnitResult)[];

export class InstallUnit<T extends GahEventName> {
  public id: GahEventName;
  public parents?: GahEventName[];
  public text: string;
  public action: () => Promise<InstallUnitReturn>;
  public eventPayload: ExtractEventPayloadFromName<GahEventDefinitions, T>;

  constructor(
    id: T,
    eventPayload: ExtractEventPayloadFromName<GahEventDefinitions, T>,
    parents: GahEventName[] | undefined,
    text: string,
    action: () => Promise<InstallUnitReturn>
  ) {
    this.id = id;
    this.eventPayload = eventPayload;
    this.parents = parents;
    this.text = text;
    this.action = action;
  }
}
