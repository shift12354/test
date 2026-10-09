import { palette, type ThemeColors } from '@life/shared';
import { createContext, useContext } from 'react';

export const ThemeContext = createContext<ThemeColors>(palette.dark);
export const useColors = () => useContext(ThemeContext);
