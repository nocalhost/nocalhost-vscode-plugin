import CircularProgress from "@material-ui/core/CircularProgress";
import DoneIcon from "@material-ui/icons/Done";
import CloseIcon from "@material-ui/icons/Close";
import React from "react";

export interface ICheckResult {
  namespace: string;
  result: {
    status: "FAIL" | "SUCCESS" | "CHECKING" | "DEFAULT";
    tips?: string;
  };
}

export const KubeconfigStatus: React.FC<{
  status: ICheckResult["result"]["status"];
}> = ({ status, children }) => {
  let icon: React.ReactNode;

  const style: React.CSSProperties = {
    minWidth: "1.5rem",
    width: "1.5rem",
    height: "1.5rem",
    display: "inline-block",
  };

  switch (status) {
    case "CHECKING":
      icon = (
        <CircularProgress
          className="icon"
          style={{
            ...style,
            color: "var(--vscode-progressBar-background)",
          }}
        />
      );
      break;
    case "FAIL":
      icon = <CloseIcon className="icon vscode-errorForeground" />;
      break;
    case "SUCCESS":
      icon = <DoneIcon className="icon vscode-icon-foreground" />;
      break;
    default:
      icon = <div className="icon" style={style} />;
      break;
  }

  return (
    <div className="type flex kubeConfig-select">
      {children}
      {icon}
    </div>
  );
};
