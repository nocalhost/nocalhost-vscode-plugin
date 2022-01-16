import React, { useEffect, useRef } from "react";
import FolderOpenIcon from "@material-ui/icons/FolderOpen";

import { postMessage } from "../../utils/index";
import Select from "../Select";
import { ICheckResult, KubeconfigStaus } from "./status";

interface IOption {
  label: string;
  value: string;
}

interface IKubeConfigPathSelectProps {
  contextOpts: IOption[];
  value: string;
  currentContext: string;
  onChangeContext: (v: string) => void;
  checkResult: ICheckResult;
}

const KubeConfigPathSelect: React.FC<IKubeConfigPathSelectProps> = (
  props: IKubeConfigPathSelectProps
) => {
  const {
    currentContext,
    onChangeContext,
    contextOpts,
    value,
    checkResult,
  } = props;

  const input = useRef<HTMLInputElement>();

  useEffect(() => {
    if (value) {
      input.current.value = value;
    }
  }, [value]);

  return (
    <>
      <div className="type flex">
        <input
          ref={input}
          type="text"
          placeholder="Please select kubeConfig file path"
          name="file"
        />
        <span
          onClick={() => {
            postMessage({
              type: "selectKubeConfig",
            });
          }}
        >
          <FolderOpenIcon className="icon" />
        </span>
      </div>
      <KubeconfigStaus staus={checkResult?.result.status || "CHECKING"}>
        <Select
          value={currentContext}
          onChange={onChangeContext}
          options={contextOpts}
          className="pl-0"
        />
      </KubeconfigStaus>
    </>
  );
};

export default KubeConfigPathSelect;
