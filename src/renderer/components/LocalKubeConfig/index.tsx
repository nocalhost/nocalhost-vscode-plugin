import React, { useCallback, useEffect, useState } from "react";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";

import { postMessage, vscode } from "../../utils/index";
import KubeConfigPathSelect from "./kubeConfigPathSelect";
import TabPanel from "../TabPanel";
import KubeConfigAsText from "./KubeConfigAsText";
import i18n from "../../i18n";
import { ICheckResult, KubeconfigValidation } from "./KubeconfigValidation";

interface ILocalKubeConfigProps {
  oldState: {
    [key: string]: any;
  };
}

const LocalKubeConfig: React.FC<ILocalKubeConfigProps> = (props) => {
  const { oldState } = props;

  const [serverKubeConfigValue, setServerKubeConfigValue] = useState<string>(
    oldState.serverKubeConfigValue
  );
  const [localTab, setLocalTab] = useState<string>(
    oldState.localTab || "select"
  );
  const [serverKubeContextValue, setServerKubeContextValue] = useState<string>(
    oldState.serverKubeContextValue
  );
  const [localPathValue, setLocalPathValue] = useState<string>(
    oldState.localPathValue
  );
  const [localContextValue, setLocalContextValue] = useState<string>(
    oldState.localContextValue
  );
  const [localContextOpts, setLocalContextOpts] = useState(
    oldState.localContextOpts
  );

  const [checkResult, setCheckResult] = useState<ICheckResult>();

  const handleMessage = (event: MessageEvent) => {
    const data = event.data;
    const { type, payload } = data;
    switch (type) {
      case "kubeConfig": {
        setLocalPathValue(payload.path || "");
        setLocalContextOpts(
          (payload.contexts || []).map((it: any) => ({
            label: it.name,
            value: it.name,
          }))
        );
        setLocalContextValue(payload.currentContext);
        return;
      }
      case "initKubePath-response": {
        const { defaultKubePath, contexts, currentContext } = payload;
        setLocalContextOpts(
          (contexts || []).map((it: any) => ({
            label: it.name,
            value: it.name,
          }))
        );
        setLocalContextValue(currentContext);
        setLocalPathValue(defaultKubePath || "");
        return;
      }
      case "checkKubeconfig":
        console.warn("checkKubeconfig res:", payload);
        setCheckResult(payload);
        return;
      default:
        return;
    }
  };

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    if (!localPathValue) {
      postMessage({
        type: "initKubePath",
        data: null,
      });
    }

    () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  const checkKubeconfig = useCallback(
    (data: { str?: string; path?: string; ns?: string; context: string }) => {
      console.warn("checkKubeconfig req:", data);
      postMessage({
        type: "checkKubeconfig",
        data,
      });
    },
    []
  );

  useEffect(() => {
    checkKubeconfig({
      path: localPathValue,
      context: localContextValue,
    });
  }, [localContextValue]);

  function submitSelectLocal(props: { context: string; localPath: string }) {
    const { context, localPath } = props;
    if (!localPath || !context) {
      return;
    }
    postMessage({
      type: "local",
      data: {
        contextName: context,
        localPath: localPath,
      },
    });
    vscode.setState({
      ...oldState,
      localContextOpts,
      localPathValue: localPath,
      localContextValue: context,
    });
  }

  function submitAsText(kubeConfig: string) {
    vscode.setState({
      ...oldState,
    });
    postMessage({
      type: "local",
      data: {
        kubeConfig,
      },
    });
  }

  return (
    <div>
      <Tabs
        value={localTab}
        onChange={(_, newValue: string) => {
          vscode.setState({
            ...oldState,
            localTab: newValue,
          });
          setLocalTab(newValue);
        }}
        variant="fullWidth"
        aria-label="full width tabs"
      >
        <Tab label={i18n.t("loadKubeConfig")} value="select" />
        <Tab label={i18n.t("pasteAsText")} value="paste" />
      </Tabs>
      <TabPanel name="select" value={localTab}>
        <KubeconfigValidation
          checkKubeconfig={(ns) =>
            checkKubeconfig({
              path: localPathValue,
              ns,
              context: localContextValue,
            })
          }
          checkResult={checkResult}
          submit={submitSelectLocal}
        >
          <KubeConfigPathSelect
            onChangeContext={setLocalContextValue}
            currentContext={localContextValue}
            value={localPathValue}
            contextOpts={localContextOpts}
          />
        </KubeconfigValidation>
      </TabPanel>

      <TabPanel name="paste" value={localTab}>
        <KubeConfigAsText
          onSubmit={submitAsText}
          contextValue={serverKubeContextValue}
          value={serverKubeConfigValue}
          onChangeContextValue={setServerKubeContextValue}
          onChangeKubeConfig={setServerKubeConfigValue}
        />
      </TabPanel>
    </div>
  );
};

export default LocalKubeConfig;
