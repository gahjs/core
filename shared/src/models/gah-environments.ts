export class GahEnvironments {
  $schema: any = '"https://raw.githubusercontent.com/awdware/gah/master/assets/gah-environments-schema.json"';
  default: GahEnvironment;
  [name: string]: GahEnvironment;
}

export class GahEnvironment {
  production: boolean;
  test?: boolean;
  [key: string]: any;
}
