import { Browser, Page } from "puppeteer-core";

declare namespace NodeJS {
  interface Global {
    __BROWSER__: Browser;
    page: Page;
  }
}
