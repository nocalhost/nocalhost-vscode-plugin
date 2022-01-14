import React, { useEffect, useRef } from "react";
import FolderOpenIcon from "@material-ui/icons/FolderOpen";
import { postMessage } from "../../utils/index";
import Select from "../Select";

interface IOption {
  label: string;
  value: string;
}

interface IKubeConfigPathSelectProps {
  contextOpts: IOption[];
  value: string;
  currentContext: string;
  onChangeContext: (v: string) => void;
}

const KubeConfigPathSelect: React.FC<IKubeConfigPathSelectProps> = (
  props: IKubeConfigPathSelectProps
) => {
  const { currentContext, onChangeContext, contextOpts, value } = props;

  const input = useRef<HTMLInputElement>();

  useEffect(() => {
    input.current.value = value;
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
              data: null,
            });
          }}
        >
          <FolderOpenIcon className="icon"></FolderOpenIcon>
        </span>
      </div>
      <Select
        value={currentContext}
        onChange={onChangeContext}
        options={contextOpts}
        className="kubeConfig-select pl-0"
      />
    </>
  );
};

export default KubeConfigPathSelect;
