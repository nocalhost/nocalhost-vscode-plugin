import React from "react";
import * as yaml from "yaml";
import Select from "../Select";
import { ICheckResult, KubeconfigStaus } from "./status";

interface IKubeConfigAsTextProps {
  strContextName: string;
  value: string;
  onChangeContextValue: (v: string) => void;
  onChangeKubeConfig: (v: string) => void;
  checkResult: ICheckResult;
}

const KubeConfigAsText: React.FC<IKubeConfigAsTextProps> = (props) => {
  const {
    value,
    strContextName,
    onChangeContextValue,
    onChangeKubeConfig,
    checkResult,
  } = props;

  const options = React.useMemo(() => {
    if (!value) {
      return;
    }
    try {
      const kubeObj = yaml.parse(value);
      const opts = (kubeObj.contexts || []).map((it: { name: string }) => ({
        label: it.name,
        value: it.name,
      }));
      const defaultContext = opts.length > 0 ? opts[0].value : null;
      let hasUpdateContext = true;
      if (strContextName) {
        hasUpdateContext = !Boolean(
          opts.find(
            (it: { label: string; value: string }) =>
              it.value === strContextName
          )
        );
      }
      if (hasUpdateContext) {
        onChangeContextValue(kubeObj["current-context"] || defaultContext);
      }

      return opts;
    } catch (e) {
      return [];
    }
  }, [value]);

  return (
    <>
      <textarea
        value={value}
        className="type"
        onChange={(e) => {
          onChangeKubeConfig(e.target.value);
        }}
        rows={20}
        placeholder="KubeConfig"
      />

      <KubeconfigStaus staus={checkResult?.result.status || "CHECKING"}>
        <Select
          value={strContextName}
          onChange={onChangeContextValue}
          options={options}
        />
      </KubeconfigStaus>
    </>
  );
};

export default KubeConfigAsText;
