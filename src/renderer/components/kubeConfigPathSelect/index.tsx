import React from "react";
import MenuItem from "@material-ui/core/MenuItem";
import FolderOpenIcon from "@material-ui/icons/FolderOpen";
import { postMessage, vscode } from "../../utils/index";
import Select from "../Select";

interface IOption {
  label: string;
  value: string;
}

interface IKubeConfigPathSelectProps {
  contextOpts: IOption[];
  value: string;
  onSubmit: (values: { context: string; localPath: string }) => void;
  currentContext: string;
  onChangeContext: (v: string) => void;
}

const KubeConfigPathSelect: React.FC<IKubeConfigPathSelectProps> = (
  props: IKubeConfigPathSelectProps
) => {
  const {
    onSubmit,
    currentContext,
    onChangeContext,
    contextOpts,
    value,
  } = props;

  function handleChange(value: string) {
    onChangeContext(value);
  }

  function submit() {
    onSubmit({
      context: currentContext,
      localPath: value,
    });
  }
  return (
    <div>
      <div className="type flex">
        <input
          value={value}
          type="text"
          placeholder="kubeConfigPath"
          name="file"
        ></input>
        <span
          onClick={() => {
            postMessage({
              type: "selectKubeConfig",
              data: null,
            });
          }}
        >
          <FolderOpenIcon className="icon"></FolderOpenIcon>
        </span>
      </div>
      <Select
        value={currentContext}
        onChange={handleChange}
        options={contextOpts}
        className="kubeConfig-select"
      />
      <button
        className="kubeConfig-add-btn"
        onClick={() => {
          submit();
        }}
      >
        Add Cluster
      </button>
    </div>
  );
};

export default KubeConfigPathSelect;
