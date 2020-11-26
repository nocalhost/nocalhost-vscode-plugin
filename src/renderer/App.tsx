import React from "react";
import { makeStyles, createStyles } from "@material-ui/core/styles";
import { store, AppProvider } from "./store/store";
import AppRouter from "./AppRouter";

const useStyles = makeStyles(() =>
  createStyles({
    root: {},
  })
);

export const AppWrapper = (props: { children: JSX.Element }) => {
  const { children } = props;
  return <AppProvider>{children}</AppProvider>;
};

export default function App() {
  const classes = useStyles();
  return (
    <AppWrapper>
      <div className={classes.root}>
        <AppRouter />
      </div>
    </AppWrapper>
  );
}
