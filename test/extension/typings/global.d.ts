import { Browser, Page } from "puppeteer-core";

declare global {
  const __BROWSER__: Readonly<Browser>;
  const page: Readonly<Page>;
}
