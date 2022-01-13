import React, { useEffect, useRef } from "react";

export interface ICheckResult {
  status: "FAIL" | "SUCCESS";
  tips: string;
}

interface IKubeconfigValidation {
  checkResult: ICheckResult;
  submit: any;
  context: string;
}

export const KubeconfigValidation: React.FC<IKubeconfigValidation> = ({
  checkResult,
  submit,
  children,
  context,
}) => {
  const nodes = [children];

  if (!checkResult || checkResult.status === "SUCCESS") {
    nodes.push(
      <button className="kubeConfig-add-btn" onClick={submit}>
        Add Cluster
      </button>
    );
  } else {
    const input = useRef<HTMLInputElement>();

    useEffect(() => {
      input.current.value = context;
    }, [input, context]);

    nodes.push(
      <input
        ref={input}
        title="Enter a namespace if you don't have cluster-level role"
        placeholder="Enter a namespace if you don't have cluster-level role"
        type="text"
        defaultValue={context}
        onChange={(event) => {}}
        className="kubeConfig-select"
      />,
      <div
        className="kubeConfig-select"
        style={{
          color: "rgb(226,37,58)",
        }}
      >
        {checkResult?.tips}
      </div>,

      <button className="kubeConfig-add-btn" onClick={submit} disabled>
        Add Cluster
      </button>
    );
  }

  return <>{children}</>;
};
