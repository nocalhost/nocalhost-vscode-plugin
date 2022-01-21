import React, { useState } from "react";
import { getState, postMessage, setState } from "../../utils/index";

const NocalHostServer: React.FC = () => {
  const [username, setUsername] = useState(getState<string>("username"));
  const [password, setPassword] = useState(getState<string>("password"));
  const [baseUrl, setBaseUrl] = useState(getState<string>("baseUrl"));

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
          placeholder="Email Address"
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
          onClick={() => {
            const data = {
              username,
              password,
              baseUrl,
            };

            setState(data);

            postMessage({
              type: "connectServer",
              data,
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
