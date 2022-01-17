import React, { useEffect, useState } from "react";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";

import { postMessage, vscode } from "../../utils/index";
import KubeConfigPathSelect from "./kubeConfigPathSelect";
import TabPanel from "../TabPanel";
import KubeConfigAsText from "./KubeConfigAsText";
import i18n from "../../i18n";
import { KubeconfigValidation } from "./KubeconfigValidation";
import { ICheckResult } from "./status";

interface ILocalKubeConfigProps {
  oldState: {
    [key: string]: any;
  };
}

type LocalTab = "select" | "paste";

const setStatus = (status: ICheckResult["result"]["status"]): ICheckResult => {
  return {
    namespace: null,
    result: { status, tips: null },
  };
};

const LocalKubeConfig: React.FC<ILocalKubeConfigProps> = (props) => {
  const { oldState } = props;

  const [strKubeconfig, setStrKubeconfig] = useState<string>(
    oldState.strKubeconfig
  );
  const [localTab, setLocalTab] = useState<LocalTab>(
    oldState.localTab || "select"
  );
  const [strContextName, setStrContextName] = useState<string>(
    oldState.strContextName
  );

  const [localPath, setLocalPath] = useState<string>(oldState.localPath);

  const [contextName, setContextName] = useState<string>(oldState.contextName);

  const [localContextOpts, setLocalContextOpts] = useState(
    oldState.localContextOpts || []
  );

  const [checkResult, setCheckResult] = useState<ICheckResult>(
    setStatus("DEFAULT")
  );

  const handleMessage = (event: MessageEvent) => {
    const data = event.data;
    const { type, payload } = data;
    switch (type) {
      case "selectKubeConfig": {
        setLocalPath(payload.localPath || "");
        setLocalContextOpts(
          (payload.contexts || []).map((it: any) => ({
            label: it.name,
            value: it.name,
          }))
        );
        setContextName(payload.currentContext);
        return;
      }
      case "initKubePath": {
        const { defaultKubePath, contexts, currentContext } = payload;
        setLocalContextOpts(
          (contexts || []).map((it: any) => ({
            label: it.name,
            value: it.name,
          }))
        );
        setContextName(currentContext);
        setLocalPath(defaultKubePath || "");
        return;
      }
      case "checkKubeconfig":
        setCheckResult(payload);
        return;
      default:
        return;
    }
  };

  useEffect(() => {
    window.addEventListener("message", handleMessage);

    if (!localPath) {
      postMessage({
        type: "initKubePath",
        data: null,
      });
    } else {
      postMessage({
        type: "selectKubeConfig",
        data: { localPath },
      });
    }

    () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  const checkKubeconfig = (namespace?: string) => {
    let data: {
      strKubeconfig?: string;
      localPath?: string;
      namespace?: string;
      contextName: string;
    };

    if (localTab === "select") {
      data = {
        localPath,
        contextName,
      };
    } else {
      data = {
        strKubeconfig,
        contextName: strContextName,
      };
    }

    data.namespace = namespace;

    vscode.setState({
      ...oldState,
      ...data,
    });

    postMessage({
      type: "checkKubeconfig",
      data,
    });
  };

  useEffect(() => {
    if (
      (localTab === "select" && contextName && localPath) ||
      (localTab === "paste" && strKubeconfig && strContextName)
    ) {
      setCheckResult(setStatus("CHECKING"));
      checkKubeconfig();
      return;
    }

    setCheckResult(setStatus("DEFAULT"));
  }, [contextName, strContextName, localTab, strKubeconfig, contextName]);

  function submitSelectLocal() {
    postMessage({
      type: "local",
      data: {
        contextName,
        localPath,
        namespace: checkResult.namespace,
      },
    });
  }

  function submitAsText(kubeConfig: string) {
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

          setLocalTab(newValue as LocalTab);
        }}
        variant="fullWidth"
        aria-label="full width tabs"
      >
        <Tab label={i18n.t("loadKubeConfig")} value="select" />
        <Tab label={i18n.t("pasteAsText")} value="paste" />
      </Tabs>
      <TabPanel name="select" value={localTab}>
        <KubeconfigValidation
          checkKubeconfig={checkKubeconfig}
          checkResult={checkResult}
          submit={submitSelectLocal}
        >
          <KubeConfigPathSelect
            onChangeContext={setContextName}
            checkResult={checkResult}
            currentContext={contextName}
            value={localPath}
            contextOpts={localContextOpts}
          />
        </KubeconfigValidation>
      </TabPanel>

      <TabPanel name="paste" value={localTab}>
        <KubeconfigValidation
          checkKubeconfig={checkKubeconfig}
          checkResult={checkResult}
          submit={submitAsText}
        >
          <KubeConfigAsText
            strContextName={strContextName}
            value={strKubeconfig}
            checkResult={checkResult}
            onChangeContextValue={setStrContextName}
            onChangeKubeConfig={setStrKubeconfig}
          />
        </KubeconfigValidation>
      </TabPanel>
    </div>
  );
};

export default LocalKubeConfig;
