/**
 * Theme Toggle Component
 * Quick toggle between light and dark modes
 */

import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
  className?: string;
}

export function ThemeToggle({ 
  variant = 'ghost', 
  size = 'icon', 
  showLabel = false,
  className 
}: ThemeToggleProps) {
  const { preferences, updatePreference, currentTheme } = useTheme();

  const icons = {
    light: Sun,
    dark: Moon,
    system: Monitor,
  };

  const labels = {
    light: 'Light mode',
    dark: 'Dark mode',
    system: 'System preference',
  };

  const Icon = icons[preferences.mode];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size={size}
          className={cn(
            'theme-transition',
            showLabel && size !== 'icon' && 'gap-2',
            className
          )}
        >
          <Icon className="h-4 w-4" />
          {showLabel && (
            <span className="hidden sm:inline-block">
              {labels[preferences.mode]}
            </span>
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {Object.entries(labels).map(([mode, label]) => {
          const IconComponent = icons[mode as keyof typeof icons];
          return (
            <DropdownMenuItem
              key={mode}
              onClick={() => updatePreference('mode', mode as any)}
              className={cn(
                'flex items-center gap-2 cursor-pointer',
                preferences.mode === mode && 'bg-accent'
              )}
            >
              <IconComponent className="h-4 w-4" />
              <span>{label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Simple Theme Toggle Button
 * Just switches between light and dark (no system option)
 */
export function SimpleThemeToggle({ className }: { className?: string }) {
  const { currentTheme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={cn('theme-transition', className)}
    >
      {currentTheme === 'dark' ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}