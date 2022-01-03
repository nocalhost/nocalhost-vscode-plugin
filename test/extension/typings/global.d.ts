import { Browser, Page } from "puppeteer-core";

declare global {
  const VSCODE__BROWSER__: Readonly<Browser>;
  const VSCODE__PAGE: Readonly<Page>;
}
