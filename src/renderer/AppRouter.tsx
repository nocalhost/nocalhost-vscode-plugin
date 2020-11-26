import React from "react";
import { HashRouter, Route, Switch, Redirect } from "react-router-dom";
import { makeStyles, createStyles } from "@material-ui/core/styles";
import Welcome from "./modules/Welcome";
import Dashboard from "./modules/Dashboard";

const useStyles = makeStyles(() =>
  createStyles({
    root: {},
  })
);

const AppRouter: React.FC = () => {
  const classes = useStyles();

  return (
    <HashRouter>
      <div className={classes.root}>
        <Switch>
          <Route path="/" exact>
            <Redirect to="/welcome" />
          </Route>
          <Route path="/welcome" exact>
            <Welcome />
          </Route>
          <Route path="/dashboard" exact>
            <Dashboard />
          </Route>
        </Switch>
      </div>
    </HashRouter>
  );
};

export default AppRouter;
