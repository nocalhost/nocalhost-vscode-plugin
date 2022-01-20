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

const KubeConfigPathSelect: React.FC<{
  checkResult: ICheckResult;
  state: State;
}> = (props) => {
  const [checkResult, setCheckResult] = useState<ICheckResult>(
    props.checkResult
  );

  useEffect(() => {
    setCheckResult(props.checkResult);
  }, [props.checkResult]);

  const [state, setState] = useState<State>();

  useEffect(() => {
    if (!props.state) {
      return;
    }

    let { kubeconfig, path, currentContext, namespace } = props.state;

    if (kubeconfig) {
      if (!currentContext) {
        currentContext = kubeconfig["current-context"];
      }
      if (!namespace) {
        namespace = kubeconfig.contexts?.find(
          (item) => item.name === currentContext
        )?.context?.namespace;
      }
    } else {
      currentContext = namespace = null;
    }

    setState({ kubeconfig, path, currentContext, namespace });

    input?.current && (input.current.value = path);
  }, [props.state]);

  useEffect(() => {
    postMessage({
      type: "initKubePath",
      data: vscode.getState("KubeConfigPathSelect"),
    });
  }, []);

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
    if (!state || !state.path) {
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

  const time = useRef<number>(-1);

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
          onChange={(el) => {
            clearTimeout(time.current);

            const path = el.currentTarget.value;

            time.current = window.setTimeout(() => {
              postMessage({
                type: "selectKubeConfig",
                data: {
                  path,
                },
              });
            }, 500);
          }}
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
            postMessage({
              type: "selectKubeConfig",
              data: {
                ...state,
                currentContext,
                namespace: undefined,
              },
            })
          }
          options={
            state?.kubeconfig?.contexts?.map((item) => {
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
