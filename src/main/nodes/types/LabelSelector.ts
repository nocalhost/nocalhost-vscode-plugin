export default interface LabelSelector {
  matchExpressions: Array<LabelSelectorRequirement>;
  matchLabels: object;
}

export interface LabelSelectorRequirement {
  key: string;
  operator: string;
  values: Array<string>;
}
