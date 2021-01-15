import React from "react";
import { HashRouter, Route, Switch, Redirect } from "react-router-dom";
import Layout from "./components/Layout";
import Landing from "./modules/Landing";
import Welcome from "./modules/Welcome";
import Workloads from "./modules/Workloads";
import Logs from "./modules/Logs";

const AppRouter: React.FC = () => {
  return (
    <HashRouter>
      <Layout>
        <Switch>
          <Route path="/" exact>
            <Redirect to="/landing" />
          </Route>
          <Route path="/landing" exact>
            <Landing />
          </Route>
          <Route path="/welcome" exact>
            <Welcome />
          </Route>
          <Route path="/workloads" exact>
            <Workloads />
          </Route>
          <Route path="/logs" exact>
            <Logs />
          </Route>
        </Switch>
      </Layout>
    </HashRouter>
  );
};

export default AppRouter;
