export interface ICleanupService {
  cleanPendingChanges(): Promise<void>
}
