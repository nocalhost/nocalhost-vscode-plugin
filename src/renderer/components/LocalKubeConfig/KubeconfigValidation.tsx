import React, {
  useEffect,
  useRef,
  useCallback,
  ButtonHTMLAttributes,
} from "react";
import { ICheckResult } from "./status";

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
  const time = useRef<number>(0);

  useEffect(() => {
    if (input.current) {
      input.current.value = checkResult.namespace ?? "";
    }
  }, [checkResult]);

  const onChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.value !== checkResult?.namespace) {
        clearTimeout(time.current);

        time.current = window.setTimeout(() => {
          checkKubeconfig(event.target.value.trim());
        }, 500);
      }
    },
    [checkResult?.namespace]
  );

  const isSuccess = checkResult?.result.status === "SUCCESS";

  const attributes: ButtonHTMLAttributes<HTMLButtonElement> = {};

  if (!attributes) {
    attributes.disabled = true;
  }

  return (
    <>
      {children}
      <input
        ref={input}
        placeholder="Enter a namespace if you don't have cluster-level role"
        type="text"
        defaultValue={checkResult?.namespace}
        onChange={onChange}
        className="kubeConfig-select p-4"
      />
      <div className="kubeConfig-select vscode-errorForeground">
        {isSuccess || checkResult?.result.tips}
      </div>

      <button
        {...attributes}
        className={`kubeConfig-add-btn ${isSuccess ? "" : "opacity-30"}`}
        onClick={submit}
      >
        Add Cluster
      </button>
    </>
  );
};
