import React from "react";
import { AppProvider } from "./store/store";
import AppRouter from "./AppRouter";
import { CustomTheme } from "./themes";

export const AppWrapper = (props: { children: JSX.Element }) => {
  const { children } = props;
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
