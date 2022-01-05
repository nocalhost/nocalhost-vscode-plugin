const fs = require("fs");
const path = require("path");

const packageJsonUri = path.resolve(__dirname, "../package.json");

let packageJson = require("../package.json");

const contextPatch = [
  {
    command: "Nocalhost.portForward",
    when:
      "viewItem =~ /^(viewer:|)workload-(deployment|statefulSet|job|daemonSet|cronjob|pod|pod-Running|crd-resources)-dev-(info|warn)-(?!vpn_)/i",
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
