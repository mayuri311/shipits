/**
 * Theme Demo Component
 * Shows all theme features working together
 */

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sun, Moon, Monitor, Palette, Eye, Type } from 'lucide-react';

export function ThemeDemo() {
  const { preferences, currentTheme, toggleTheme } = useTheme();

  return (
    <Card className="w-full max-w-2xl mx-auto theme-transition">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Theme System Demo
        </CardTitle>
        <CardDescription>
          Experience the comprehensive theming system in action
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Theme Status */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium mb-2">Current Mode</p>
            <Badge variant="secondary" className="gap-1">
              {currentTheme === 'light' ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
              {currentTheme}
            </Badge>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Preference</p>
            <Badge variant="outline" className="gap-1">
              {preferences.mode === 'system' ? <Monitor className="h-3 w-3" /> : 
               preferences.mode === 'light' ? <Sun className="h-3 w-3" /> : 
               <Moon className="h-3 w-3" />}
              {preferences.mode}
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Color Samples */}
        <div>
          <p className="text-sm font-medium mb-3">Color Palette</p>
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-2">
              <div className="h-8 bg-primary rounded border" />
              <p className="text-xs text-center">Primary</p>
            </div>
            <div className="space-y-2">
              <div className="h-8 bg-secondary rounded border" />
              <p className="text-xs text-center">Secondary</p>
            </div>
            <div className="space-y-2">
              <div className="h-8 bg-accent rounded border" />
              <p className="text-xs text-center">Accent</p>
            </div>
            <div className="space-y-2">
              <div className="h-8 bg-muted rounded border" />
              <p className="text-xs text-center">Muted</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Theme Features */}
        <div>
          <p className="text-sm font-medium mb-3">Active Features</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1">
              <Type className="h-3 w-3" />
              Font: {preferences.fontSize}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Palette className="h-3 w-3" />
              Accent: {preferences.accentColor}
            </Badge>
            <Badge variant="outline">
              Preset: {preferences.preset}
            </Badge>
            {preferences.highContrast && (
              <Badge variant="secondary" className="gap-1">
                <Eye className="h-3 w-3" />
                High Contrast
              </Badge>
            )}
            {preferences.reducedMotion && (
              <Badge variant="secondary">
                Reduced Motion
              </Badge>
            )}
          </div>
        </div>

        <Separator />

        {/* Interactive Elements */}
        <div>
          <p className="text-sm font-medium mb-3">Interactive Elements</p>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button size="sm">Primary Button</Button>
              <Button variant="outline" size="sm">Outline</Button>
              <Button variant="secondary" size="sm">Secondary</Button>
              <Button variant="ghost" size="sm">Ghost</Button>
            </div>
            <Button onClick={toggleTheme} className="w-full">
              Toggle Theme Mode
            </Button>
          </div>
        </div>

        {/* Typography Samples */}
        <div>
          <p className="text-sm font-medium mb-3">Typography</p>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Heading 1</h1>
            <h2 className="text-xl font-semibold">Heading 2</h2>
            <h3 className="text-lg font-medium">Heading 3</h3>
            <p className="text-base">Regular paragraph text with normal weight and size.</p>
            <p className="text-sm text-muted-foreground">Muted text for secondary information.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}