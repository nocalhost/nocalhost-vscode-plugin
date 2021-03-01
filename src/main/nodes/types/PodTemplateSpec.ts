import { ObjectMeta } from "./Meta";
import { PodSpec } from "./Pod";

export default interface PodTemplateSpec {
  metadata: ObjectMeta;
  spec: PodSpec;
}
