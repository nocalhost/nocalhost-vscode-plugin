import React, { useState } from "react";
import NocalHostTab from "./components/Tab";
import { vscode } from "./utils/index";
import TabPanel from "./components/TabPanel";
import LocalKubeConfig from "./components/LocalKubeConfig";
import NocalHostServer from "./components/NocalHostServer";
import i18n from "./i18n";

const options = [
  {
    label: i18n.t("connect2Cluster"),
    value: "local",
  },
  {
    label: i18n.t("connect2Server"),
    value: "server",
  },
];

export default function Home() {
  const oldState = vscode.getState() || {
    username: "",
    password: "",
    baseUrl: "",
    navTab: 0,
    localPaths: [],
    kubeConfigs: [],
  };
  const [navTab, setNavTab] = useState(oldState.navTab || "local");

  const handleChange = (newValue: string) => {
    vscode.setState({
      ...oldState,
      navTab: newValue,
    });
    setNavTab(newValue);
  };

  return (
    <div>
      <div className="type">
        <NocalHostTab
          defaultValue="local"
          options={options}
          onChange={handleChange}
          value={navTab}
        />
      </div>
      <TabPanel value={navTab} name="local">
        <LocalKubeConfig oldState={oldState} />
      </TabPanel>
      <TabPanel value={navTab} name="server">
        <NocalHostServer oldState={oldState} />
      </TabPanel>
    </div>
  );
}
