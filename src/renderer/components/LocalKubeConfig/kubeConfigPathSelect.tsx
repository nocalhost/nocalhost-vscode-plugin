import React, { useEffect, useRef, useState } from "react";
import FolderOpenIcon from "@material-ui/icons/FolderOpen";

import { postMessage, vscode } from "../../utils/index";
import Select from "../Select";
import { ICheckResult, KubeconfigStatus } from "./status";
import { Validation } from "./Validation";

interface IKubeconfig {
  contexts: Array<{ name: string; context: { namespace: string } }>;
  "current-context": string;
}
interface State {
  kubeconfig: IKubeconfig;
  path: string;
}
const KubeConfigPathSelect: React.FC = () => {
  const [checkResult, setCheckResult] = useState<ICheckResult["result"]>({
    status: "DEFAULT",
  });
  const oldState = vscode.getState();

  const [state, setState] = useState<State>(oldState.selectPath);

  const [namespace, setNamespace] = useState<string>(
    oldState.selectPathNamespace
  );

  const input = useRef<HTMLInputElement>();

  function submit() {
    postMessage({
      type: "local",
      data: {
        currentContext: state.kubeconfig["current-context"],
        path: state.path,
        namespace,
      },
    });
  }

  const checkKubeconfig = (namespace?: string) => {
    const { kubeconfig, path } = state;

    let data = {
      path,
      currentContext: kubeconfig["current-context"],
      namespace,
    };

    setCheckResult({ status: "CHECKING" });

    postMessage({
      type: "checkKubeconfig",
      data,
    });

    setNamespace(namespace);
  };

  useEffect(() => {
    if (!state) {
      return;
    }

    checkKubeconfig();

    const currentContext = state.kubeconfig["current-context"];

    const namespace = state.kubeconfig.contexts.find(
      (item) => item.name === currentContext
    ).context.namespace;

    setNamespace(namespace);

    vscode.setState({
      selectPathNamespace: namespace,
      selectPath: state,
    });
  }, [state]);

  const handleMessage = (event: MessageEvent) => {
    const { type, payload } = event.data;

    console.warn("handleMessage", type, payload);

    switch (type) {
      case "selectKubeConfig":
      case "initKubePath":
        const { kubeconfig, path }: State = payload;

        setState({ kubeconfig, path });

        input && (input.current.value = path);

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
    });

    () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  return (
    <Validation
      checkResult={checkResult}
      submit={submit}
      namespace={namespace}
      checkKubeconfig={checkKubeconfig}
    >
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
      <KubeconfigStatus status={checkResult.status}>
        <Select
          value={state?.kubeconfig && state.kubeconfig["current-context"]}
          onChange={(currentContext) =>
            setState((prevState) => {
              const { kubeconfig } = prevState;
              kubeconfig["current-context"] = currentContext;

              return { ...prevState };
            })
          }
          options={
            state?.kubeconfig.contexts.map((item) => {
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
