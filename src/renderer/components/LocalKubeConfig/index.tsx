import React, { useEffect, useState } from "react";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import { postMessage, vscode } from "../../utils/index";
import KubeConfigPathSelect from "../kubeConfigPathSelect";
import TabPanel from "../TabPanel";
import KubeConfigAsText from "../KubeConfigAsText";

interface ILocalKubeConfigProps {
  oldState: {
    [key: string]: any;
  };
}

interface IContext {
  context: {
    cluster: string;
    namespace: string;
    user: string;
  };
  name: string;
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

  const handleMessage = (event: MessageEvent) => {
    const data = event.data;
    const { type, payload } = data;
    switch (type) {
      case "kubeConfig": {
        setLocalPathValue(payload.path || "");
        setLocalContextOpts(
          (payload.contexts || []).map((it: IContext) => ({
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
          (contexts || []).map((it: IContext) => ({
            label: it.name,
            value: it.name,
          }))
        );
        setLocalContextValue(currentContext);
        setLocalPathValue(defaultKubePath || "");
        return;
      }
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
        onChange={(event: React.ChangeEvent<{}>, newValue: string) => {
          vscode.setState({
            ...oldState,
            localTab: newValue,
          });
          setLocalTab(newValue);
        }}
        variant="fullWidth"
        aria-label="full width tabs"
      >
        <Tab
          className="localkube_tab"
          label={<div>Select Kubeconfig file</div>}
          value="select"
        />
        <Tab label={<div>Paste as text</div>} value="paste" />
      </Tabs>
      <TabPanel name="select" value={localTab}>
        <KubeConfigPathSelect
          onChangeContext={(v: string) => {
            setLocalContextValue(v);
          }}
          onSubmit={submitSelectLocal}
          currentContext={localContextValue}
          value={localPathValue}
          contextOpts={localContextOpts}
        />
      </TabPanel>

      <TabPanel name="paste" value={localTab}>
        <KubeConfigAsText
          onSubmit={submitAsText}
          contextValue={serverKubeContextValue}
          value={serverKubeConfigValue}
          onChangeContextValue={(v) => {
            setServerKubeContextValue(v);
          }}
          onChangeKubeConfig={(v) => {
            setServerKubeConfigValue(v);
          }}
        />
      </TabPanel>
    </div>
  );
};

export default LocalKubeConfig;
