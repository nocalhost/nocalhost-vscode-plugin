import React, { useState } from "react";
import NocalHostTab from "./components/Tab";
import { getState, setState } from "./utils/index";
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

const STATE_KEY = "navTab";

export default function Home() {
  const [navTab, setNavTab] = useState<string>(
    getState<string>(STATE_KEY) || "local"
  );

  const handleChange = (newValue: string) => {
    setNavTab(newValue);
    setState(STATE_KEY, newValue);
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
        <LocalKubeConfig />
      </TabPanel>
      <TabPanel value={navTab} name="server">
        <NocalHostServer />
      </TabPanel>
    </div>
  );
}
