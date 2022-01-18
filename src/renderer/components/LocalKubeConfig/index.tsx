import React, { useState } from "react";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";

import { getState, setState } from "../../utils/index";
import KubeConfigPathSelect from "./pathSelect";
import TabPanel from "../TabPanel";
import KubeConfigAsText from "./asText";
import i18n from "../../i18n";

type LocalTab = "select" | "paste";

const LocalKubeConfig: React.FC = () => {
  const [localTab, setLocalTab] = useState<LocalTab>(
    getState("localTab") || "select"
  );

  return (
    <div>
      <Tabs
        value={localTab}
        onChange={(_, newValue: string) => {
          setLocalTab(newValue as LocalTab);

          setState("localTab", newValue);
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
