import React, { useState } from "react";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";

import { vscode } from "../../utils/index";
import KubeConfigPathSelect from "./pathSelect";
import TabPanel from "../TabPanel";
import KubeConfigAsText from "./asText";
import i18n from "../../i18n";

interface ILocalKubeConfigProps {
  oldState: {
    [key: string]: any;
  };
}

type LocalTab = "select" | "paste";

const LocalKubeConfig: React.FC<ILocalKubeConfigProps> = (props) => {
  const { oldState } = props;

  const [localTab, setLocalTab] = useState<LocalTab>(
    oldState.localTab || "select"
  );

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
        <KubeConfigPathSelect />
      </TabPanel>

      <TabPanel name="paste" value={localTab}>
        <KubeConfigAsText />
      </TabPanel>
    </div>
  );
};

export default LocalKubeConfig;
