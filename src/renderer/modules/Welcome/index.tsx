import React from "react";
import { postMessage } from "../../utils";
import { MessageActionType, Commands } from "../../constants";

const Welcome: React.FC = () => {
  const onSignIn = () => {
    postMessage({
      type: MessageActionType.executeCommand,
      payload: {
        command: Commands.signin,
      },
    });
  };
  return (
    <article className="markdown-body">
      <h1 className="atx" id="welcome-to-nocalhost">
        Welcome to Nocalhost
      </h1>
      <p>
        Nocalhost is an open-source IDE plugin for cloud-native applications
        development:
      </p>
      <p>
        Build, test and debug applications directly inside Kubernetes IDE
        Support : providing the same debugging and developing experience you're
        used in the IDE even in the remote Kubernetes cluster.
      </p>
      <p>
        Developing with instant file synchronization: instantly sync your code
        change to remote container without rebuilding images or restarting
        containers.
      </p>
      <h2 className="atx" id="how-to-use">
        How to use
      </h2>
      <p>You can use Nocalhost in two ways:</p>
      <ul>
        <li>
          One is to provide a kubeconfig of a K8s cluster. Our minimum
          requirement for RBAC is the&nbsp;
          <a href="https://kubernetes.io/docs/reference/access-authn-authz/rbac/">
            edit
          </a>
          &nbsp; of a namespace. After adding a kubeconfig, you can experience
          the functions of nocalhost through&nbsp;
          <a href="https://nocalhost.dev/docs/quick-start">quick start</a>.
        </li>
      </ul>
      <p>
        <strong>
          <a href="http://www.baidu.com">Experience through kubeconfig</a>
        </strong>
      </p>
      <ul>
        <li>
          The second is to log in through the Nocalhost Server account provided
          by the Nocalhost Server administrator of the privatized deployment.
          After logging in, you can still experience the functions of nocalhost
          through&nbsp;
          <a href="https://nocalhost.dev/docs/quick-start/#2-connect-to-kubernetes-cluster">
            quick start
          </a>
        </li>
      </ul>
      <p>
        <strong>
          <a href="http:///www.baidu.com">
            Experience through Nocalhost Server account
          </a>
        </strong>
      </p>
      <p>
        Nocalhost Server can help you better manage your K8s cluster,
        applications, personnel and permissions. To learn how to deploy
        Nocalhost Server, you can click
        <a href="https://nocalhost.dev/docs/server/server-overview">
          Nocalhost Server Overview
        </a>
      </p>
    </article>
  );
};

export default Welcome;
