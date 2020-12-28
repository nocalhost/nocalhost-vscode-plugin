import { createStyles, makeStyles } from "@material-ui/core";
import React, { useContext, useEffect } from "react";
import { useHistory } from "react-router-dom";
import useMessage from "../../hooks/useMessage";
import useTheme from "../../hooks/useTheme";
import { store } from "../../store/store";

const useStyles = makeStyles(() =>
  createStyles({
    root: {
      position: "absolute",
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
    },
  })
);

export default function (props: { children: JSX.Element }): JSX.Element {
  const {
    state: { url },
  } = useContext(store);
  const history = useHistory();
  const classes = useStyles();
  useMessage();
  useTheme();

  useEffect(() => {
    history.push(url);
  }, [url]);

  return <div className={classes.root}>{props.children}</div>;
}
