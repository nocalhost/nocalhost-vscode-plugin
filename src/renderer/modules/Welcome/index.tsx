import React from "react";
import { createStyles, makeStyles } from "@material-ui/core";
import { CustomThemeOptions } from "../../themes";
import { postMessage } from "../../utils";
import { MessageActionType, Commands } from "../../constants";

const useStyles = makeStyles((theme: CustomThemeOptions) =>
  createStyles({
    root: {
      padding: 15,
    },
    divider: {
      height: 1,
      marginTop: 10,
      marginBottom: 10,
      backgroundColor: theme?.palette?.divider,
    },
    paragraph: {
      marginTop: 10,
      marginBottom: 10,
    },
    button: {
      cursor: "pointer",
      color: "var(--vscode-textLink-foreground)",
    },
  })
);

const Welcome: React.FC = () => {
  const classes = useStyles();
  const onSignIn = () => {
    postMessage(
      {
        type: MessageActionType.executeCommand,
        payload: {
          command: Commands.signin,
        },
      },
      "*"
    );
  };

  return (
    <div className={classes.root}>
      <h1>Welcome to Nocalhost</h1>
      <div className={classes.divider}></div>
      <p className={classes.paragraph}>
        Nocalhost is a CloudNative Development Enviroment. You can coding in
        VSCode on Kubernetes with no friction.
      </p>
      <dl>
        <dt>Before you start, please make sure:</dt>
        <li>git is installed</li>
        <li>kubectl is installed</li>
        <li>helm is installed if you develop helm apps</li>
        <li>nhctl is installed</li>
        <li>One or more DevSpaces created by nocalhost-web administrator.</li>
      </dl>
      <p className={classes.paragraph}>then,</p>
      <p className={classes.paragraph}>
        click{" "}
        <span className={classes.button} onClick={onSignIn}>
          sign in
        </span>{" "}
        to list your DevSpaces.
      </p>
      <p className={classes.paragraph}>
        <a href="https://nocalhost.dev/">Click here</a> for more details.
      </p>
    </div>
  );
};

export default Welcome;
