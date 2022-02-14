import { createStyles, makeStyles } from "@material-ui/core";
import React, { useContext, useEffect } from "react";
import { useHistory } from "react-router-dom";
import useMessage from "../../hooks/useMessage";
import useTheme from "../../hooks/useTheme";
import { store } from "../../store/store";
import updateURL from "../../services/updateURL";

const useStyles = makeStyles(() =>
  createStyles({
    root: {},
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
    if (!url) {
      return;
    }

    history.replace(url);
    updateURL(url);
  }, [url]);

  return <div className={classes.root}>{props.children}</div>;
}
