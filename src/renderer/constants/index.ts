export const enum ThemeType {
  dark = "dark",
  light = "light",
}

export const enum MessageActionType {
  executeCommand = "executeCommand",
  domContentLoaded = "domContentLoaded",
  homeWebView = "homeWebView",
}

export const enum Commands {
  refresh = "Nocalhost.refresh",
  editServiceConfig = "Nocalhost.editServiceConfig",
  startDevMode = "Nocalhost.startDevMode",
  endDevMode = "Nocalhost.endDevMode",
  reset = "Nocalhost.reset",
  switchEndPoint = "Nocalhost.switchEndPoint",
  openEndPoint = "Nocalhost.openEndPoint",
  homeWebView = "Nocalhost.homeWebView",
  connect = "Nocalhost.connect",
  installApp = "Nocalhost.installApp",
  uninstallApp = "Nocalhost.uninstallApp",
  loadResource = "Nocalhost.loadResource",
  log = "Nocalhost.log",
  portForward = "Nocalhost.portForward",
  exec = "Nocalhost.exec",
}

export const DEFAULT_INTERVAL_MS = 3000;
export const LOG_TAIL_COUNT = 3000;
