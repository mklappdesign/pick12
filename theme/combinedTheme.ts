import { DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native';
import {
  adaptNavigationTheme,
  MD3DarkTheme,
  MD3LightTheme,
  type MD3Theme,
} from 'react-native-paper';

const { LightTheme, DarkTheme } = adaptNavigationTheme({
  reactNavigationLight: NavigationDefaultTheme,
  reactNavigationDark: NavigationDarkTheme,
});

const md3LightBase: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
  },
};

const md3DarkBase: MD3Theme = {
  ...MD3DarkTheme,
  mode: 'adaptive',
  colors: {
    ...MD3DarkTheme.colors,
  },
};

function combine(md3: MD3Theme, adapted: typeof LightTheme): MD3Theme {
  const { fonts: _navFonts, colors: adaptedColors, ...adaptedRest } = adapted;
  return {
    ...md3,
    ...adaptedRest,
    fonts: md3.fonts,
    colors: {
      ...md3.colors,
      ...adaptedColors,
    },
  };
}

function combineDark(md3: MD3Theme, adapted: typeof DarkTheme): MD3Theme {
  const { fonts: _navFonts, colors: adaptedColors, ...adaptedRest } = adapted;
  return {
    ...md3,
    ...adaptedRest,
    fonts: md3.fonts,
    colors: {
      ...md3.colors,
      ...adaptedColors,
    },
  };
}

export const combinedLightTheme = combine(md3LightBase, LightTheme);

export const combinedDarkTheme = combineDark(md3DarkBase, DarkTheme);

export function getCombinedTheme(dark: boolean): MD3Theme {
  return dark ? combinedDarkTheme : combinedLightTheme;
}
