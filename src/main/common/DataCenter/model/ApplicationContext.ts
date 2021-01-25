export interface IApplicationContext {
  source: string;
  installType: string;
  applicationName: string;
  applicationURL: string;
  resourceDir: string[];
  applicationConfigPath?: string;
  nocalhostConfig?: string;
}

export default class ApplicationContext implements IApplicationContext {
  source: string;
  installType: string;
  applicationName: string;
  applicationURL: string;
  resourceDir: string[];
  applicationConfigPath?: string;
  nocalhostConfig?: string;

  constructor(
    source: string,
    installType: string,
    applicationName: string,
    applicationURL: string,
    resourceDir: string[],
    applicationConfigPath?: string,
    nocalhostConfig?: string
  ) {
    this.source = source;
    this.installType = installType;
    this.applicationName = applicationName;
    this.applicationURL = applicationURL;
    this.resourceDir = resourceDir;
    this.applicationConfigPath = applicationConfigPath;
    this.nocalhostConfig = nocalhostConfig;
  }
}
