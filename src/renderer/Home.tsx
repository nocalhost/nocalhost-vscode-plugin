import React, { useState, useEffect } from "react";
import FolderOpenIcon from "@material-ui/icons/FolderOpen";
import { postMessage, vscode } from "./utils/index";

export default function Home() {
  const oldState = vscode.getState() || {
    username: "",
    password: "",
    baseUrl: "",
    isLocal: "0",
    isLocalPath: "1",
    localPath: "",
    kubeConfig: "",
  };
  const [username, setUsername] = useState(oldState.username);
  const [password, setPassword] = useState(oldState.password);
  const [baseUrl, setBaseUrl] = useState(oldState.baseUrl);
  const [isLocal, setIsLocal] = useState(oldState.isLocal);

  const [isLocalPath, setIsLocalPath] = useState(oldState.isLocalPath || "1");
  const [localPath, setLocalPath] = useState(oldState.localPath || "");
  const [kubeConfig, setKubeConfig] = useState(oldState.kubeConfig || "");

  const handleMessage = (event: MessageEvent) => {
    const data = event.data;
    const { type, payload } = data;
    switch (type) {
      case "kubeConfig": {
        console.log("payload: ", payload);
        setLocalPath(payload || "");
        return "";
      }
      default:
        return;
    }
  };

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  console.log("oldState: ", oldState);
  return (
    <div>
      <div className="type">
        <select
          value={isLocal}
          name="type"
          id="type"
          onChange={(event) => {
            console.log("type: ", event.target.value);
            setIsLocal(event.target.value);
          }}
        >
          <option value="0">Server</option>
          <option value="1">Local</option>
        </select>
      </div>
      {isLocal === "0" && (
        <div className="server">
          <div className="base-url">
            <input
              className="sign-in"
              type="text"
              placeholder="Server Url"
              name="u"
              value={baseUrl}
              onChange={(e) => {
                setBaseUrl(e.target.value);
              }}
            ></input>
          </div>
          <div className="login-form">
            <input
              className="sign-in"
              type="text"
              placeholder="Username"
              name="u"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
              }}
            ></input>
            <input
              className="sign-in"
              type="password"
              placeholder="Password"
              name="p"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
              }}
            ></input>
            <button
              className="sign-in"
              onClick={(e) => {
                vscode.setState({
                  ...oldState,
                  username,
                  password,
                  baseUrl,
                  isLocal,
                });
                postMessage({
                  type: "login",
                  data: {
                    username,
                    password,
                    baseUrl,
                  },
                });
              }}
            >
              Sign In
            </button>
          </div>
        </div>
      )}
      {isLocal === "1" && (
        <div className="type">
          <select
            value={isLocalPath}
            name="localpath"
            id="localpath"
            onChange={(event) => {
              vscode.setState({
                ...oldState,
                isLocalPath: event.target.value,
              });
              setIsLocalPath(event.target.value);
            }}
          >
            <option value="0">KubeConfig Text</option>
            <option defaultChecked value="1">
              Local Path
            </option>
          </select>

          {isLocalPath === "0" && (
            <textarea
              value={kubeConfig}
              className="type"
              onChange={(e) => {
                setKubeConfig(e.target.value);
              }}
              rows={30}
              placeholder="KubeConfig"
            ></textarea>
          )}
          {isLocalPath === "1" && (
            <div className="type flex">
              <input
                type="text"
                placeholder="kubeConfigPath"
                name="k"
                value={localPath}
                onChange={(e) => {
                  setLocalPath(e.target.value);
                }}
              ></input>
              <span
                onClick={() => {
                  postMessage({
                    type: "selectKubeConfig",
                    data: null,
                  });
                }}
              >
                <FolderOpenIcon className="browser"></FolderOpenIcon>
              </span>
            </div>
          )}
          <button
            onClick={() => {
              vscode.setState({
                ...oldState,
                isLocalPath,
                localPath,
                kubeConfig,
                isLocal,
              });
              postMessage({
                type: "local",
                data: {
                  isLocalPath,
                  localPath,
                  kubeConfig,
                  isLocal,
                },
              });
            }}
          >
            Confirm
          </button>
        </div>
      )}
    </div>
  );
}
