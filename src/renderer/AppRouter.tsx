import React from "react";
import { HashRouter, Route, Switch, Redirect } from "react-router-dom";
import Layout from "./components/Layout";
import Landing from "./modules/Landing";
import Welcome from "./modules/Welcome";
import Dashboard from "./modules/Dashboard";

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
          <Route path="/dashboard" exact>
            <Dashboard />
          </Route>
        </Switch>
      </Layout>
    </HashRouter>
  );
};

export default AppRouter;
