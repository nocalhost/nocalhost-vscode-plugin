import React, { useState } from "react";
import { postMessage, vscode } from "../../utils/index";

interface IHocatHostServerProps {
  oldState: {
    [key: string]: any;
  };
}

const NocalHostServer: React.FC<IHocatHostServerProps> = (props) => {
  const { oldState } = props;
  const [username, setUsername] = useState(oldState.username);
  const [password, setPassword] = useState(oldState.password);
  const [baseUrl, setBaseUrl] = useState(oldState.baseUrl);

  return (
    <div className="server">
      <div className="base-url">
        <input
          className="sign-in"
          type="text"
          placeholder="Nocalhost API Server"
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
            });
            postMessage({
              type: "connectServer",
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
  );
};

export default NocalHostServer;
