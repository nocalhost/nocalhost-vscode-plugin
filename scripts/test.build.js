const fs = require("fs");
const path = require("path");

const packageJsonUri = path.resolve(__dirname, "../package.json");

let packageJson = require("../package.json");

const contextPatch = [
  {
    command: "Nocalhost.portForward",
    when: "viewItem =~ /^(viewer:|)workload-(deployment|statefulSet|job|daemonSet|cronjob|pod|pod-Running|crd-resources)-dev-(?!vpn_)/i",
  },
  {
    command: "Nocalhost.log",
    when: "viewItem =~ /^(viewer:|)workload-(deployment|statefulSet|daemonSet|job|cronJob|pod|crd-resources)-dev-(?!vpn_)/i",
  },
  {
    command: "Nocalhost.startCopyDevMode",
    when: "viewItem =~ /^workload-(deployment|statefulSet|job|daemonSet|cronjob|pod|crd-resources)-dev-(?!(developing-duplicate|developing-replace-self|starting|vpn_healthy|vpn_unhealthy))/i",
  },
  {
    command: "Nocalhost.run",
    when: "viewItem =~ /^workload-(deployment|statefulSet|job|daemonSet|cronjob|pod|crd-resources)-dev-(?!vpn_)/i",
  },
  {
    command: "Nocalhost.applyKubernetesObject",
    when: "viewItem =~ /^application-(.*)-installed/i",
  },
];
packageJson.contributes.menus["view/item/context"].forEach((context) => {
  if (
    contextPatch.find(
      (item) => item.command === context.command && item.when === context.when
    )
  ) {
    context.group = "inline";
  }
});

fs.unlinkSync(packageJsonUri);
fs.writeFileSync(packageJsonUri, JSON.stringify(packageJson, null, 2));
