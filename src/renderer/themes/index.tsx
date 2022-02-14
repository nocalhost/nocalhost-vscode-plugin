import React, { useContext } from "react";
import {
  createMuiTheme,
  ThemeProvider,
  ThemeOptions,
  Theme,
} from "@material-ui/core/styles";
import { CssBaseline, PaletteType } from "@material-ui/core";
import { store } from "../store/store";
import light from "./light";
import dark from "./dark";

export interface CustomThemeOptions extends ThemeOptions {
  scrollBar: {
    width: number;
    backgroundColor: string;
  };
  scrollBarThumb: {
    backgroundColor: string;
    hoverColor: string;
    borderRadius: number;
  };
}

interface CustomThemes {
  light: CustomThemeOptions;
  dark: CustomThemeOptions;
}

const themes: CustomThemes = {
  light,
  dark,
};

const getTheme = (theme: "light" | "dark"): Theme => {
  const themeOptions: CustomThemeOptions = themes[theme];
  return createMuiTheme({
    ...themeOptions,
    overrides: {
      MuiCssBaseline: {
        "@global": {
          "*": {
            margin: 0,
            padding: 0,
          },
          body: {
            backgroundColor: "unset",
            color: "var(--vscode-editor-foreground)",
          },
        },
      },
    },
  });
};

export const CustomTheme = (props: { children: JSX.Element }) => {
  const {
    state: { theme },
  } = useContext(store);
  const { children } = props;
  const currentTheme: Theme = getTheme(theme as PaletteType);

  return (
    <ThemeProvider theme={currentTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
};
