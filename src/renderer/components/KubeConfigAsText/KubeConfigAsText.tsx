import React from "react";
import * as yaml from "yaml";
import { postMessage } from "../../utils/index";
import Select from "../Select";

interface IKubeConfigAsTextProps {
  contextValue: string;
  value: string;
  onSubmit: (kubeConfigs: string) => void;
  onChangeContextValue: (v: string) => void;
  onChangeKubeConfig: (v: string) => void;
}

const KubeConfigAsText: React.FC<IKubeConfigAsTextProps> = (props) => {
  const {
    value,
    onSubmit,
    contextValue,
    onChangeContextValue,
    onChangeKubeConfig,
  } = props;
  console.log("contextValue", contextValue);
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
      onChangeContextValue(kubeObj["current-context"] || defaultContext);
      return opts;
    } catch (e) {
      return [];
    }
  }, [value]);
  function submit() {
    if (!value || !contextValue) {
      return;
    }
    const kubeObj = yaml.parse(value);
    kubeObj["current-context"] = contextValue;
    onSubmit(yaml.stringify(kubeObj));
  }
  return (
    <div>
      <textarea
        value={value}
        className="type"
        onChange={(e) => {
          onChangeKubeConfig(e.target.value);
        }}
        rows={20}
        placeholder="KubeConfig"
      ></textarea>
      <Select
        value={contextValue}
        onChange={(v) => onChangeContextValue(v)}
        options={options}
        className="kubeConfig-select"
      />
      <button className="kubeConfig-add-btn" onClick={() => submit()}>
        Add Cluster
      </button>
    </div>
  );
};

export default KubeConfigAsText;
