export class GahEnvironment {
  $schema = 'https://raw.githubusercontent.com/gahjs/core/master/shared/assets/gah-environment-schema.json';
  production: boolean;
  test?: boolean;
  [key: string]: any;
}
