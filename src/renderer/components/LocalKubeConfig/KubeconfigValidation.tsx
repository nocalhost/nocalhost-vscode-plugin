import React, { useEffect, useRef, useCallback } from "react";
import CircularProgress from "@material-ui/core/CircularProgress";

export interface ICheckResult {
  ns: string;
  result: {
    status: "FAIL" | "SUCCESS";
    tips: string;
  };
}

export interface IKubeconfigValidation {
  checkResult: ICheckResult;
  submit: any;
  checkKubeconfig: (ns: string) => void;
}

export const KubeconfigValidation: React.FC<IKubeconfigValidation> = ({
  checkResult,
  submit,
  children,
  checkKubeconfig,
}) => {
  const input = useRef<HTMLInputElement>();

  useEffect(() => {
    if (input.current && checkResult.ns) {
      input.current.value = checkResult.ns;
    }
  }, [checkResult]);

  const onBlur = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.value !== checkResult?.ns) {
        checkKubeconfig(event.target.value.trim());
      }
    },
    [checkResult?.ns]
  );

  let node: React.ReactNode;

  if (!checkResult || checkResult.result.status === "SUCCESS") {
    node = (
      <button className="kubeConfig-add-btn" onClick={submit}>
        Add Cluster
      </button>
    );
  } else {
    node = (
      <>
        <input
          ref={input}
          placeholder="Enter a namespace if you don't have cluster-level role"
          type="text"
          onBlur={onBlur}
          className="kubeConfig-select p-4"
        />
        <div className="kubeConfig-select text-red-500">
          {checkResult?.result.tips}
        </div>
        <button className="kubeConfig-add-btn" onClick={submit} disabled>
          {/* Add Cluster */}
          <CircularProgress />
        </button>
      </>
    );
  }

  return (
    <>
      {children}
      {node}
    </>
  );
};
