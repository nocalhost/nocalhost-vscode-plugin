import React, { useContext, useState } from "react";
import { useHistory } from "react-router-dom";
import qs from "qs";
import { createStyles, makeStyles } from "@material-ui/core";
import { DataGrid, RowsProp, ColDef } from "@material-ui/data-grid";
import fetchDeployments from "../../../services/fetchDeployments";
import useInterval from "../../../hooks/useInterval";
import { store } from "../../../store/store";
import { IDeployment } from "../../../store/store.types";
import { CustomThemeOptions } from "../../../themes";

const useStyles = makeStyles((theme: CustomThemeOptions) =>
  createStyles({
    root: {
      height: "100%",
    },
  })
);

const Deployments: React.FC = () => {
  const {
    state: { deployments },
    dispatch,
  } = useContext(store);
  const [tabValue, setTabValue] = useState(0);
  const history = useHistory();
  const search: string = history.location.search;
  const query: qs.ParsedQs = qs.parse(search, {
    ignoreQueryPrefix: true,
  });
  const classes = useStyles();

  console.log(history);
  useInterval(
    fetchDeployments,
    [
      {
        id: query.id as string,
        app: query.app as string,
      },
    ],
    [search]
  );

  const columns: ColDef[] = [
    { field: "name", headerName: "Name", width: 120 },
    { field: "namespace", headerName: "Namespace", width: 130 },
    { field: "pods", headerName: "Pods", width: 120 },
    { field: "replicas", headerName: "Replicas", width: 120 },
    { field: "createdTime", headerName: "Created Time", width: 150 },
    { field: "conditions", headerName: "Conditions", width: 120 },
  ];

  const rows: RowsProp = deployments.items.map(
    (deployment: IDeployment, index: number) => ({
      id: index + 1,
      name: deployment.name,
      namespace: deployment.namespace,
      pods: deployment.pods,
      replicas: deployment.replicas,
      createdTime: deployment.createdTime,
      conditions: deployment.conditions,
    })
  );

  return (
    <div className={classes.root}>
      <h1>Deployments</h1>
      <div className={classes.root}>
        <DataGrid
          rows={rows}
          columns={columns}
          pageSize={5}
          checkboxSelection
        />
      </div>
    </div>
  );
};

export default Deployments;
