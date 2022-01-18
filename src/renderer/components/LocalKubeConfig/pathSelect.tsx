import React, { useEffect, useRef, useState } from "react";
import FolderOpenIcon from "@material-ui/icons/FolderOpen";

import vscode, { postMessage } from "../../utils/index";
import Select from "../Select";
import { ICheckResult, KubeconfigStatus } from "./status";
import { IKubeconfig, Validation } from "./validation";

interface State {
  kubeconfig: IKubeconfig;
  path: string;
  namespace: string;
  currentContext: string;
}

const KubeConfigPathSelect: React.FC = () => {
  const [checkResult, setCheckResult] = useState<ICheckResult>({
    status: "DEFAULT",
  });
  const [state, setState] = useState<State>();

  const input = useRef<HTMLInputElement>();

  function submit() {
    const { path, namespace, currentContext } = state;
    postMessage({
      type: "local",
      data: {
        currentContext,
        path,
        namespace,
      },
    });
  }

  const checkKubeconfig = () => {
    if (!state) {
      return;
    }

    const { path, currentContext, namespace } = state;

    let data = {
      path,
      currentContext,
      namespace,
    };

    setCheckResult({ status: "CHECKING" });

    postMessage({
      type: "checkKubeconfig",
      data,
    });

    vscode.setState({
      KubeConfigPathSelect: data,
    });
  };

  useEffect(checkKubeconfig, [state]);

  const handleMessage = (event: MessageEvent) => {
    const { type, payload } = event.data;

    switch (type) {
      case "selectKubeConfig":
      case "initKubePath":
        let { kubeconfig, path, currentContext, namespace }: State = payload;

        if (!currentContext) {
          currentContext = kubeconfig?.["current-context"];
        }
        if (!namespace) {
          namespace = kubeconfig?.contexts.find(
            (item) => item.name === currentContext
          )?.context?.namespace;
        }

        setState({ kubeconfig, path, currentContext, namespace });

        input?.current && (input.current.value = path);

        return;
      case "checkKubeconfig":
        setCheckResult(payload);
        return;
    }
  };

  useEffect(() => {
    window.addEventListener("message", handleMessage);

    postMessage({
      type: "initKubePath",
      data: vscode.getState("KubeConfigPathSelect"),
    });

    () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  return (
    <Validation
      checkResult={checkResult}
      submit={submit}
      namespace={state?.namespace}
      onChangeNamespace={(namespace) => {
        setState((prevState) => {
          return { ...prevState, namespace };
        });
      }}
    >
      <div className="type flex">
        <input
          ref={input}
          type="text"
          placeholder="Please select kubeConfig file path"
          name="file"
          defaultValue={state?.path}
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
      <KubeconfigStatus status={checkResult.status}>
        <Select
          value={state?.currentContext}
          onChange={(currentContext) =>
            setState((prevState) => {
              return { ...prevState, currentContext };
            })
          }
          options={
            state?.kubeconfig?.contexts.map((item) => {
              return {
                label: item.name,
                value: item.name,
              };
            }) ?? []
          }
          className="pl-0"
        />
      </KubeconfigStatus>
    </Validation>
  );
};

export default KubeConfigPathSelect;
