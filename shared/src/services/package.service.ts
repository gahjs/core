export interface IPackageService {
  findLatestPackageVersion(packageName: string): Promise<string>;
}
