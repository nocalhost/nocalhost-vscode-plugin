import React, { useEffect, useRef, useState } from "react";

import { postMessage } from "../../utils/index";
import Select from "../Select";
import { ICheckResult, KubeconfigStatus } from "./status";
import { IKubeconfig, Validation } from "./validation";

interface State {
  kubeconfig: IKubeconfig;
  strKubeconfig: string;
}

const KubeConfigAsText: React.FC = () => {
  const [checkResult, setCheckResult] = useState<ICheckResult>({
    status: "DEFAULT",
  });
  const [state, setState] = useState<State>();

  const [namespace, setNamespace] = useState<string>();

  const input = useRef<HTMLInputElement>();

  function submit() {
    postMessage({
      type: "local",
      data: {
        currentContext: state.kubeconfig["current-context"],
        strKubeconfig: state.strKubeconfig,
        namespace,
      },
    });
  }

  const checkKubeconfig = (namespace?: string) => {
    const { kubeconfig, strKubeconfig } = state;

    let data = {
      strKubeconfig,
      currentContext: kubeconfig?.["current-context"],
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
    if (!state || !state.strKubeconfig) {
      return;
    }

    checkKubeconfig();

    let namespace: string;
    if (state.kubeconfig) {
      const currentContext = state.kubeconfig["current-context"];

      namespace = state.kubeconfig.contexts.find(
        (item) => item.name === currentContext
      ).context.namespace;
    }

    setNamespace(namespace);
  }, [state]);

  const handleMessage = (event: MessageEvent) => {
    const { type, payload } = event.data;

    console.warn("handleMessage", type, payload);

    switch (type) {
      case "parseKubeConfig":
        const { kubeconfig, strKubeconfig }: State = payload;

        setState({ kubeconfig, strKubeconfig });

        input?.current && (input.current.value = strKubeconfig);
        return;
      case "checkKubeconfig":
        setCheckResult(payload);
        return;
    }
  };

  useEffect(() => {
    window.addEventListener("message", handleMessage);

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
      <textarea
        defaultValue={state?.strKubeconfig}
        className="type"
        onChange={(el) => {
          const strKubeconfig = el.target.value;

          if (!strKubeconfig) {
            setNamespace(undefined);
            setState({ strKubeconfig: undefined, kubeconfig: undefined });
            setCheckResult({ status: "DEFAULT" });
            return;
          }

          if (strKubeconfig === state?.strKubeconfig) {
            return;
          }

          postMessage({
            type: "parseKubeConfig",
            data: { strKubeconfig },
          });
        }}
        rows={20}
        placeholder="KubeConfig"
      />

      <KubeconfigStatus status={checkResult?.status}>
        <Select
          value={state?.kubeconfig?.["current-context"]}
          onChange={(currentContext) =>
            setState((prevState) => {
              const { kubeconfig } = prevState;
              kubeconfig["current-context"] = currentContext;

              return { ...prevState };
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
        />
      </KubeconfigStatus>
    </Validation>
  );
};

export default KubeConfigAsText;
