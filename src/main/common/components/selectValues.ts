import host from "../../host";

export default async function selectValues() {
  let valuesPath: string | undefined;
  let valuesStr: string | undefined;
  const res = await host.showInformationMessage(
    "Do you want to specify values?",
    { modal: true },
    "Use Default values",
    "Specify One values.yaml",
    "Specify values"
  );
  if (!res) {
    return [];
  }
  if (res === "Specify One values.yaml") {
    const valuesUri = await host.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      title: "Select the value file path",
    });

    if (valuesUri && valuesUri.length > 0) {
      valuesPath = valuesUri[0].fsPath;
    } else {
      return [];
    }
  } else if (res === "Specify values") {
    valuesStr = await host.showInputBox({
      placeHolder: "eg: key1=val1,key2=val2",
    });

    if (!valuesStr) {
      return [];
    }
  }

  return [valuesPath, valuesStr];
}
