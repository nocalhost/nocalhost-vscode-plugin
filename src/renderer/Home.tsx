import React, { useState, useEffect } from "react";
import FolderOpenIcon from "@material-ui/icons/FolderOpen";
import RemoveCircleIcon from "@material-ui/icons/RemoveCircle";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import NocalHostTab from "./components/Tab";
import BottomNavigation from "@material-ui/core/BottomNavigation";
import BottomNavigationAction from "@material-ui/core/BottomNavigationAction";
import * as yaml from "yaml";
import { makeStyles } from "@material-ui/core";
import { postMessage, vscode } from "./utils/index";
import TabPanel from "./components/TabPanel";
import LocalKubeConfig from "./components/LocalKubeConfig";
import NocalHostServer from "./components/NocalHostServer";

// const useStyles = makeStyles({
//   localToggle: {
//     height: 35,
//   },
//   kubeconfigToggle: {
//     fontSize: 10,
//   },
// });

const options = [
  {
    label: "Add Kubeconfig",
    value: "local",
  },
  {
    label: "Connect to Nocalhost Server",
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
