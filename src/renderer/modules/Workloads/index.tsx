import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import qs from "qs";
import {
  Tab,
  Tabs,
  Theme,
  withStyles,
  createStyles,
  makeStyles,
} from "@material-ui/core";
import { CustomThemeOptions } from "../../themes";
import Deployments from "./Deployments";

interface StyledTabProps {
  label: string;
}

const tabs: string[] = [
  "StatefulSets",
  "Deployments",
  "DaemonSets",
  "Jobs",
  "CronJobs",
  "Pods",
];

const NHTabs = withStyles((theme: Theme) =>
  createStyles({
    root: {
      borderBottom: `1px solid ${theme.palette?.divider}`,
    },
    indicator: {
      backgroundColor: "#a10000",
    },
  })
)(Tabs);

const NHTab = withStyles((theme: Theme) =>
  createStyles({
    root: {
      textTransform: "none",
      minWidth: 72,
      fontWeight: theme.typography.fontWeightRegular,
      marginRight: theme.spacing(4),
      "&:hover": {
        color: "red",
        opacity: 1,
      },
      "&$selected": {
        color: "blue",
        fontWeight: theme.typography.fontWeightMedium,
      },
      "&:focus": {
        color: "green",
      },
    },
    selected: {},
  })
)((props: StyledTabProps) => <Tab disableRipple {...props} />);

const useStyles = makeStyles((theme: CustomThemeOptions) =>
  createStyles({
    root: {
      height: "100%",
    },
  })
);

const Workloads: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const history = useHistory();
  const search: string = history.location.search;
  const query: qs.ParsedQs = qs.parse(search, {
    ignoreQueryPrefix: true,
  });
  const resourceType: string = query.type as string;
  const classes = useStyles();

  useEffect(() => {
    const value: number = tabs.indexOf(resourceType);
    if (value > 0) {
      setTabValue(value);
    }
  }, [resourceType]);

  const handleTabChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <div className={classes.root}>
      <NHTabs
        value={tabValue}
        onChange={handleTabChange}
        aria-label="Workloads"
      >
        {tabs.map((label: string) => (
          <NHTab label={label} />
        ))}
      </NHTabs>
      <div>
        {tabValue === 0 && (
          <div>
            {tabValue}: {tabs[tabValue]}
          </div>
        )}
        {tabValue === 1 && <Deployments />}
        {tabValue === 2 && (
          <div>
            {tabValue}: {tabs[tabValue]}
          </div>
        )}
        {tabValue === 3 && (
          <div>
            {tabValue}: {tabs[tabValue]}
          </div>
        )}
        {tabValue === 4 && (
          <div>
            {tabValue}: {tabs[tabValue]}
          </div>
        )}
        {tabValue === 5 && (
          <div>
            {tabValue}: {tabs[tabValue]}
          </div>
        )}
      </div>
    </div>
  );
};

export default Workloads;
