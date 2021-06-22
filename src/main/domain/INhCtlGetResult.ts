import { IDescribeConfig } from "./IDescribeConfig";
import { IK8sResource } from "./IK8sResource";

export interface INhCtlGetResult {
  description?: IDescribeConfig;
  info: IK8sResource;
}
