import React, { useContext, useEffect, useRef } from "react";
import { useHistory } from "react-router-dom";
import qs from "qs";
import hljs from "highlight.js";
import { createStyles, makeStyles } from "@material-ui/core";
import { Skeleton } from "@material-ui/lab";
import { store } from "../../store/store";
import { CustomThemeOptions } from "../../themes";
import { ThemeType, LOG_TAIL_COUNT } from "../../constants";
import fetchLogs from "../../services/fetchLogs";
import useInterval from "../../hooks/useInterval";

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
      fontFamily: "droidsansmono",
      fontSize: 12,
    },
    line: {
      "&:before": {
        display: "inline-block",
        content: "attr(data-line)",
        marginRight: 12,
        color: theme.palette?.text?.hint,
        minWidth: 25,
        textAlign: "right",
      },
    },
    skeletonContainer: {
      padding: 20,
      height: "100%",
      overflow: "hidden",
    },
    skeletonItem: {
      marginBottom: 8,
    },
  })
);

const Logs: React.FC = () => {
  const {
    state: { logs, theme },
  } = useContext(store);
  const history = useHistory();
  const search: string = history.location.search;
  const query: qs.ParsedQs = qs.parse(search, {
    ignoreQueryPrefix: true,
  });
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
          {logs.items.map((text: string, i: number) => {
            hljs.configure({});
            const result = hljs.highlight("haskell", text);
            return (
              <li
                key={i}
                data-line={i + 1}
                dangerouslySetInnerHTML={{ __html: result.value }}
                className={classes.line}
              ></li>
            );
          })}
        </ul>
        <div className="logs-anthor" ref={elementRef}></div>
      </>
    );
  };
  const renderSkeleton = () => (
    <div className={classes.skeletonContainer}>
      {new Array(7).fill("").map((item, i) => (
        <div className={classes.skeletonItem} key={i} id="logs-skeleton">
          <Skeleton animation="wave" />
        </div>
      ))}
    </div>
  );

  useInterval(
    fetchLogs,
    [
      {
        id: query.id as string,
        app: query.app as string,
        pod: query.pod as string,
        container: query.container as string,
        tail: LOG_TAIL_COUNT,
      },
    ],
    [search]
  );

  useEffect(() => {
    if (elementRef.current) {
      elementRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, [logs]);

  useEffect(() => {
    const $link = document.getElementById("syntax-theme");
    if (!$link) {
      return;
    }
    const { light, dark } = $link.dataset;
    if (theme === ThemeType.light) {
      $link.setAttribute("href", light);
    } else {
      $link.setAttribute("href", dark);
    }
  }, [theme]);

  return (
    <div className={classes.root} data-testid="logs">
      {logs.items
        ? logs.items.length > 0
          ? renderList()
          : renderNoContent()
        : renderSkeleton()}
    </div>
  );
};

export default Logs;
