import React, {
  useEffect,
  useRef,
  useCallback,
  ButtonHTMLAttributes,
} from "react";
import { ICheckResult } from "./status";

export interface IValidation {
  checkResult: ICheckResult;
  submit: any;
  namespace: string;
  onChangeNamespace: (namespace: string) => void;
}

export interface IKubeconfig {
  contexts: Array<{ name: string; context: { namespace: string } }>;
  "current-context": string;
}

export const Validation: React.FC<IValidation> = ({
  checkResult,
  submit,
  children,
  namespace,
  onChangeNamespace,
}) => {
  const input = useRef<HTMLInputElement>();
  const time = useRef<number>(0);

  const onChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.value !== namespace) {
        clearTimeout(time.current);

        time.current = window.setTimeout(() => {
          onChangeNamespace(event.target.value.trim());
        }, 500);
      }
    },
    [namespace]
  );

  const isSuccess = checkResult?.status === "SUCCESS";

  const attributes: ButtonHTMLAttributes<HTMLButtonElement> = {};

  if (!isSuccess) {
    attributes.disabled = true;
  }

  useEffect(() => {
    input && (input.current.value = namespace ?? "");
  }, [namespace]);

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
