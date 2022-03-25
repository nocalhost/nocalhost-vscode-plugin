import React, { useState } from "react";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";

import vscode, { getState } from "../../utils/index";
import KubeConfigPathSelect from "./pathSelect";
import TabPanel from "../TabPanel";
import KubeConfigAsText from "./asText";
import i18n from "../../i18n";
import useMessage from "../../hooks/vscode";
import { ICheckResult } from "./status";

type LocalTab = "select" | "paste";

const LocalKubeConfig: React.FC = () => {
  const [localTab, setLocalTab] = useState<LocalTab>(
    getState("localTab") || "select"
  );

  const [checkResult, setCheckResult] = useState<ICheckResult>({
    status: "DEFAULT",
  });

  const [state, setState] = useState();

  useMessage(["selectKubeConfig", "initKubePath", "parseKubeConfig"], setState);

  useMessage("checkKubeconfig", setCheckResult);

  return (
    <div>
      <Tabs
        value={localTab}
        onChange={(_, newValue: string) => {
          setLocalTab(newValue as LocalTab);

          vscode.setState("localTab", newValue);

          if (newValue !== localTab) {
            setCheckResult({ status: "DEFAULT" });
          }
        }}
        variant="fullWidth"
        aria-label="full width tabs"
      >
        <Tab label={i18n.t("loadKubeConfig")} value="select" />
        <Tab label={i18n.t("pasteAsText")} value="paste" />
      </Tabs>
      <TabPanel name="select" value={localTab}>
        <KubeConfigPathSelect checkResult={checkResult} state={state} />
      </TabPanel>

      <TabPanel name="paste" value={localTab}>
        <KubeConfigAsText checkResult={checkResult} state={state} />
      </TabPanel>
    </div>
  );
};

export default LocalKubeConfig;
