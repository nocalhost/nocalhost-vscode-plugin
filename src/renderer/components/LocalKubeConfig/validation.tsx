import React, {
  useEffect,
  useRef,
  useCallback,
  ButtonHTMLAttributes,
} from "react";
import { ICheckResult } from "./status";

export interface IValidation {
  checkResult: ICheckResult["result"];
  submit: any;
  namespace: string;
  checkKubeconfig: (ns: string) => void;
}

export const Validation: React.FC<IValidation> = ({
  checkResult,
  submit,
  children,
  namespace,
  checkKubeconfig,
}) => {
  const input = useRef<HTMLInputElement>();
  const time = useRef<number>(0);

  const onChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.value !== namespace) {
        clearTimeout(time.current);

        time.current = window.setTimeout(() => {
          checkKubeconfig(event.target.value.trim());
        }, 500);
      }
    },
    [namespace]
  );

  const isSuccess = checkResult?.status === "SUCCESS";

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
        defaultValue={namespace}
        onChange={onChange}
        className="kubeConfig-select p-4"
      />
      <div className="kubeConfig-select vscode-errorForeground">
        {isSuccess || checkResult.tips}
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
