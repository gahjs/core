export class GahEnvironments {
  $schema = '"https://raw.githubusercontent.com/awdware/gah/master/assets/gah-environments-schema.json"';
  default: GahEnvironment;
  [name: string]: GahEnvironment | string;
}

export class GahEnvironment {
  production: boolean;
  test?: boolean;
  [key: string]: any;
}
