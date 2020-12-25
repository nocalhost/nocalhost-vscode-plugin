import React, { useContext, useEffect, useRef } from "react";
import { createStyles, makeStyles } from "@material-ui/core";
import { store } from "../../store/store";
import { CustomThemeOptions } from "../../themes";

const useStyles = makeStyles((theme: CustomThemeOptions) =>
  createStyles({
    root: {
      width: "100%",
      height: "100%",
      overflowX: "hidden",
      overflowY: "auto",
      "&:hover": {
        "& div.logs-anthor": {
          display: "none",
        },
      },
    },
    noContent: {
      width: "100%",
      height: "100%",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    },
    list: {
      padding: 10,
    },
  })
);

const Logs: React.FC = () => {
  const {
    state: { logs },
  } = useContext(store);
  const elementRef: React.MutableRefObject<HTMLDivElement | null> = useRef(
    null
  );
  const classes = useStyles();

  const renderNoContent = () => (
    <div className={classes.noContent}>No Content.</div>
  );
  const renderList = () => {
    return (
      <>
        <ul className={classes.list}>
          {logs.items.map((text: string, i: number) => (
            <li key={i}>{text}</li>
          ))}
        </ul>
        <div className="logs-anthor" ref={elementRef}></div>
      </>
    );
  };

  useEffect(() => {
    if (elementRef.current) {
      elementRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, [logs]);

  return (
    <div className={classes.root}>
      {logs.items.length > 0 ? renderList() : renderNoContent()}
    </div>
  );
};

export default Logs;
