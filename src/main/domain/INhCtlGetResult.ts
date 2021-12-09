import { IDescribeConfig } from "./IDescribeConfig";
import { IK8sResource } from "./IK8sResource";

export interface VPN {
  belongsToMe: boolean;
  ip: string;
  mode: "reverse";
  status: "healthy" | "unHealthy" | "unknown";
}

export interface INhCtlGetResult {
  description?: IDescribeConfig;
  info: IK8sResource;
  vpn?: VPN;
}
