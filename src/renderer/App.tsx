import React from "react";
import { AppProvider } from "./store/store";
import AppRouter from "./AppRouter";
import { CustomTheme } from "./themes";
import { initI18n } from "./i18n";

export const AppWrapper = (props: { children: JSX.Element }) => {
  const { children } = props;
  initI18n();
  return (
    <AppProvider>
      <CustomTheme>{children}</CustomTheme>
    </AppProvider>
  );
};

export default function App() {
  return (
    <AppWrapper>
      <AppRouter />
    </AppWrapper>
  );
}
