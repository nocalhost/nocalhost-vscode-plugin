import React, { useState, useEffect } from "react";
import FolderOpenIcon from "@material-ui/icons/FolderOpen";
import RemoveCircleIcon from "@material-ui/icons/RemoveCircle";
import { postMessage, vscode } from "./utils/index";
import * as yaml from "yaml";

export default function Home() {
  const oldState = vscode.getState() || {
    username: "",
    password: "",
    baseUrl: "",
    isLocal: "0",
    localPaths: [],
    kubeConfigs: [],
  };
  const [username, setUsername] = useState(oldState.username);
  const [password, setPassword] = useState(oldState.password);
  const [baseUrl, setBaseUrl] = useState(oldState.baseUrl);
  const [isLocal, setIsLocal] = useState(oldState.isLocal);

  const [isLocalPath, setIsLocalPath] = useState<string>("1");
  const [localPaths, setLocalPaths] = useState<Array<string>>(
    oldState.localPaths || []
  );
  const [currentLocalPath, setCurrentLocalPath] = useState<string>("");
  const [currentKubeConfig, setCurrentKubeConfig] = useState<string>("");
  const [kubeConfigs, setKubeConfigs] = useState<Array<string>>(
    oldState.kubeConfigs || []
  );

  const handleMessage = (event: MessageEvent) => {
    const data = event.data;
    const { type, payload } = data;
    switch (type) {
      case "kubeConfig": {
        console.log("payload: ", payload);
        setCurrentLocalPath(payload || "");
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
  const localItems = localPaths.map((p) => {
    return (
      <div className="flex">
        <span className="normal">{p}</span>
        <span
          className="icon"
          onClick={() => {
            let tmpPaths = [...localPaths];
            const index = tmpPaths.indexOf(p);
            if (tmpPaths.length > 1) {
              tmpPaths = tmpPaths.splice(index - 1, 1);
            } else {
              tmpPaths = [];
            }
            console.log("index, ", index, "\n", tmpPaths);
            setLocalPaths(tmpPaths);
          }}
        >
          <RemoveCircleIcon />
        </span>
      </div>
    );
  });
  const kubeConfigItems = kubeConfigs.map((p) => {
    const kubeObj = yaml.parse(p);
    const clusters = kubeObj["clusters"];
    const clusterName = clusters[0]["name"];
    return (
      <div className="flex">
        <span className="normal">{clusterName}</span>
        <span
          className="icon"
          onClick={() => {
            let tmpKubeConfigs = [...kubeConfigs];
            const index = tmpKubeConfigs.indexOf(p);
            if (tmpKubeConfigs.length > 1) {
              tmpKubeConfigs = tmpKubeConfigs.splice(index - 1, 1);
            } else {
              tmpKubeConfigs = [];
            }
            console.log("index, ", index, "\n", tmpKubeConfigs);
            setKubeConfigs(tmpKubeConfigs);
          }}
        >
          <RemoveCircleIcon />
        </span>
      </div>
    );
  });
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
              value={currentKubeConfig}
              className="type"
              onChange={(e) => {
                setCurrentKubeConfig(e.target.value);
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
                value={currentLocalPath}
                onChange={(e) => {
                  setCurrentLocalPath(e.target.value);
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
                <FolderOpenIcon className="icon"></FolderOpenIcon>
              </span>
            </div>
          )}
          <button
            className="type"
            onClick={() => {
              // add kubeconfig
              console.log("add kubeconfig");
              if (isLocalPath === "1" && currentLocalPath) {
                if (localPaths.includes(currentLocalPath)) {
                  return;
                }
                const tmpPaths = [...localPaths];
                tmpPaths.push(currentLocalPath);
                setLocalPaths(tmpPaths);
              } else if (isLocalPath === "0" && currentKubeConfig) {
                if (kubeConfigs.includes(currentKubeConfig)) {
                  return;
                }
                // check kubeconfig
                const kubeObj = yaml.parse(currentKubeConfig);
                const currentContext = kubeObj["current-context"];
                if (!currentContext) {
                  return;
                }
                const tmpKubeconfigs = [...kubeConfigs];
                tmpKubeconfigs.push(currentKubeConfig);
                setKubeConfigs(tmpKubeconfigs);
              }
            }}
          >
            Add
          </button>
          {localItems}
          {kubeConfigItems}
          <button
            onClick={() => {
              vscode.setState({
                ...oldState,
                localPaths,
                kubeConfigs,
                isLocal,
              });
              console.log("state: ", {
                ...oldState,
                localPaths,
                kubeConfigs,
                isLocal,
              });
              postMessage({
                type: "local",
                data: {
                  localPaths,
                  kubeConfigs,
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
