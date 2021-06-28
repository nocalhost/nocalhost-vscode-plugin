import { AppType } from "./define";

export interface INocalhostConfig {
  application: {
    manifestType: AppType;
    name: string;
    resourcePath: string[];
  };
}
