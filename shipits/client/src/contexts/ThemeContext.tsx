/**
 * Theme Context
 * Manages theme preferences, dark mode, and custom colors
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

// Theme types
export type ThemeMode = 'light' | 'dark' | 'system';
export type AccentColor = 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'pink';

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  colors: {
    light: Record<string, string>;
    dark: Record<string, string>;
  };
}

export interface ThemePreferences {
  mode: ThemeMode;
  accentColor: AccentColor;
  preset: string;
  customColors?: Record<string, string>;
  fontSize: 'small' | 'medium' | 'large';
  reducedMotion: boolean;
  highContrast: boolean;
}

interface ThemeContextType {
  preferences: ThemePreferences;
  currentTheme: 'light' | 'dark';
  isSystemDark: boolean;
  presets: ThemePreset[];
  updatePreference: <K extends keyof ThemePreferences>(
    key: K,
    value: ThemePreferences[K]
  ) => void;
  resetToDefaults: () => void;
  toggleTheme: () => void;
}

// Default theme preferences
const DEFAULT_PREFERENCES: ThemePreferences = {
  mode: 'system',
  accentColor: 'blue',
  preset: 'default',
  fontSize: 'medium',
  reducedMotion: false,
  highContrast: false,
};

// Predefined theme presets
const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'default',
    name: 'Default',
    description: 'The standard ShipIts theme',
    colors: {
      light: {
        '--primary': 'hsl(207, 90%, 54%)',
        '--primary-foreground': 'hsl(211, 100%, 99%)',
        '--accent': 'hsl(60, 4.8%, 95.9%)',
        '--accent-foreground': 'hsl(24, 9.8%, 10%)',
      },
      dark: {
        '--primary': 'hsl(207, 90%, 54%)',
        '--primary-foreground': 'hsl(211, 100%, 99%)',
        '--accent': 'hsl(240, 3.7%, 15.9%)',
        '--accent-foreground': 'hsl(0, 0%, 98%)',
      },
    },
  },
  {
    id: 'high-contrast',
    name: 'High Contrast',
    description: 'Enhanced contrast for better accessibility',
    colors: {
      light: {
        '--background': 'hsl(0, 0%, 100%)',
        '--foreground': 'hsl(0, 0%, 0%)',
        '--primary': 'hsl(0, 0%, 0%)',
        '--primary-foreground': 'hsl(0, 0%, 100%)',
        '--accent': 'hsl(0, 0%, 95%)',
        '--accent-foreground': 'hsl(0, 0%, 0%)',
        '--border': 'hsl(0, 0%, 0%)',
      },
      dark: {
        '--background': 'hsl(0, 0%, 0%)',
        '--foreground': 'hsl(0, 0%, 100%)',
        '--primary': 'hsl(0, 0%, 100%)',
        '--primary-foreground': 'hsl(0, 0%, 0%)',
        '--accent': 'hsl(0, 0%, 10%)',
        '--accent-foreground': 'hsl(0, 0%, 100%)',
        '--border': 'hsl(0, 0%, 100%)',
      },
    },
  },
  {
    id: 'sepia',
    name: 'Sepia',
    description: 'Warm, eye-friendly sepia tones',
    colors: {
      light: {
        '--background': 'hsl(48, 25%, 95%)',
        '--foreground': 'hsl(30, 20%, 15%)',
        '--primary': 'hsl(35, 60%, 45%)',
        '--primary-foreground': 'hsl(48, 25%, 95%)',
        '--accent': 'hsl(45, 20%, 88%)',
        '--accent-foreground': 'hsl(30, 20%, 15%)',
        '--border': 'hsl(40, 15%, 80%)',
      },
      dark: {
        '--background': 'hsl(30, 15%, 8%)',
        '--foreground': 'hsl(48, 20%, 85%)',
        '--primary': 'hsl(35, 60%, 55%)',
        '--primary-foreground': 'hsl(30, 15%, 8%)',
        '--accent': 'hsl(30, 10%, 15%)',
        '--accent-foreground': 'hsl(48, 20%, 85%)',
        '--border': 'hsl(30, 10%, 20%)',
      },
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Cool blue ocean-inspired theme',
    colors: {
      light: {
        '--background': 'hsl(200, 15%, 98%)',
        '--foreground': 'hsl(200, 15%, 10%)',
        '--primary': 'hsl(200, 90%, 45%)',
        '--primary-foreground': 'hsl(200, 15%, 98%)',
        '--accent': 'hsl(200, 20%, 92%)',
        '--accent-foreground': 'hsl(200, 15%, 10%)',
      },
      dark: {
        '--background': 'hsl(200, 15%, 5%)',
        '--foreground': 'hsl(200, 15%, 95%)',
        '--primary': 'hsl(200, 90%, 55%)',
        '--primary-foreground': 'hsl(200, 15%, 5%)',
        '--accent': 'hsl(200, 10%, 12%)',
        '--accent-foreground': 'hsl(200, 15%, 95%)',
      },
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Natural green forest theme',
    colors: {
      light: {
        '--background': 'hsl(120, 10%, 98%)',
        '--foreground': 'hsl(120, 10%, 10%)',
        '--primary': 'hsl(120, 60%, 35%)',
        '--primary-foreground': 'hsl(120, 10%, 98%)',
        '--accent': 'hsl(120, 15%, 92%)',
        '--accent-foreground': 'hsl(120, 10%, 10%)',
      },
      dark: {
        '--background': 'hsl(120, 10%, 5%)',
        '--foreground': 'hsl(120, 10%, 95%)',
        '--primary': 'hsl(120, 60%, 45%)',
        '--primary-foreground': 'hsl(120, 10%, 5%)',
        '--accent': 'hsl(120, 8%, 12%)',
        '--accent-foreground': 'hsl(120, 10%, 95%)',
      },
    },
  },
];

// Accent color definitions
const ACCENT_COLORS: Record<AccentColor, { light: string; dark: string }> = {
  blue: { light: 'hsl(207, 90%, 54%)', dark: 'hsl(207, 90%, 54%)' },
  purple: { light: 'hsl(262, 83%, 58%)', dark: 'hsl(262, 83%, 58%)' },
  green: { light: 'hsl(142, 76%, 36%)', dark: 'hsl(142, 76%, 36%)' },
  orange: { light: 'hsl(25, 95%, 53%)', dark: 'hsl(25, 95%, 53%)' },
  red: { light: 'hsl(0, 84%, 60%)', dark: 'hsl(0, 84%, 60%)' },
  pink: { light: 'hsl(336, 75%, 40%)', dark: 'hsl(336, 75%, 40%)' },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user, updateUser } = useAuth();
  const [preferences, setPreferences] = useState<ThemePreferences>(DEFAULT_PREFERENCES);
  const [isSystemDark, setIsSystemDark] = useState(false);

  // Determine current theme
  const currentTheme = preferences.mode === 'system' 
    ? (isSystemDark ? 'dark' : 'light')
    : preferences.mode === 'dark' ? 'dark' : 'light';

  // Listen to system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsSystemDark(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsSystemDark(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Load user preferences on auth change
  useEffect(() => {
    if (user?.themePreferences) {
      setPreferences({ ...DEFAULT_PREFERENCES, ...user.themePreferences });
    } else {
      // Load from localStorage for non-authenticated users
      const saved = localStorage.getItem('theme-preferences');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
        } catch (error) {
          console.error('Failed to parse saved theme preferences:', error);
          // On parse error, fall back to defaults
          setPreferences(DEFAULT_PREFERENCES);
        }
      } else {
        // No saved preferences - use defaults (system theme mode)
        setPreferences(DEFAULT_PREFERENCES);
      }
    }
  }, [user]);

  // Apply theme changes to document
  useEffect(() => {
    applyTheme();
  }, [preferences, currentTheme]);

  const applyTheme = () => {
    const root = document.documentElement;
    
    // Apply theme mode class
    root.classList.remove('light', 'dark');
    root.classList.add(currentTheme);

    // Apply preset colors
    const preset = THEME_PRESETS.find(p => p.id === preferences.preset) || THEME_PRESETS[0];
    const colors = preset.colors[currentTheme];
    
    Object.entries(colors).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });

    // Apply accent color
    const accentColor = ACCENT_COLORS[preferences.accentColor];
    root.style.setProperty('--primary', accentColor[currentTheme]);

    // Apply custom colors if any
    if (preferences.customColors) {
      Object.entries(preferences.customColors).forEach(([property, value]) => {
        root.style.setProperty(property, value);
      });
    }

    // Apply font size
    const fontSizes = {
      small: '14px',
      medium: '16px',
      large: '18px',
    };
    root.style.setProperty('font-size', fontSizes[preferences.fontSize]);

    // Apply high contrast
    if (preferences.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Apply reduced motion
    if (preferences.reducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
  };

  const updatePreference = <K extends keyof ThemePreferences>(
    key: K,
    value: ThemePreferences[K]
  ) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);

    // Save to user profile if authenticated
    if (user) {
      updateUser({ themePreferences: newPreferences });
    } else {
      // Save to localStorage for non-authenticated users
      localStorage.setItem('theme-preferences', JSON.stringify(newPreferences));
    }
  };

  const resetToDefaults = () => {
    setPreferences(DEFAULT_PREFERENCES);
    
    if (user) {
      updateUser({ themePreferences: DEFAULT_PREFERENCES });
    } else {
      localStorage.removeItem('theme-preferences');
    }
  };

  const toggleTheme = () => {
    const newMode: ThemeMode = preferences.mode === 'light' ? 'dark' : 'light';
    updatePreference('mode', newMode);
  };

  const value: ThemeContextType = {
    preferences,
    currentTheme,
    isSystemDark,
    presets: THEME_PRESETS,
    updatePreference,
    resetToDefaults,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}