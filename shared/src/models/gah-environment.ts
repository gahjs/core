export class GahEnvironment {
  $schema = 'https://raw.githubusercontent.com/awdware/gah/master/shared/assets/gah-environment-schema.json';
  production: boolean;
  test?: boolean;
  [key: string]: any;
}
