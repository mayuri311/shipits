/**
 * Theme Settings Component
 * Comprehensive theme customization interface
 */

import React, { useState } from 'react';
import { 
  Palette, 
  Sun, 
  Moon, 
  Monitor, 
  Eye, 
  Type, 
  RotateCcw,
  Check,
  Accessibility,
  Zap
} from 'lucide-react';
import { useTheme, type AccentColor, type ThemePreset } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const ACCENT_COLORS: Record<AccentColor, { color: string; name: string }> = {
  blue: { color: 'hsl(207, 90%, 54%)', name: 'Ocean Blue' },
  purple: { color: 'hsl(262, 83%, 58%)', name: 'Royal Purple' },
  green: { color: 'hsl(142, 76%, 36%)', name: 'Forest Green' },
  orange: { color: 'hsl(25, 95%, 53%)', name: 'Sunset Orange' },
  red: { color: 'hsl(0, 84%, 60%)', name: 'Cherry Red' },
  pink: { color: 'hsl(336, 75%, 40%)', name: 'Rose Pink' },
};

interface ThemeSettingsProps {
  onClose?: () => void;
}

export function ThemeSettings({ onClose }: ThemeSettingsProps) {
  const { 
    preferences, 
    currentTheme,
    presets,
    updatePreference, 
    resetToDefaults 
  } = useTheme();
  
  const [activeTab, setActiveTab] = useState('appearance');

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all theme settings to defaults?')) {
      resetToDefaults();
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto theme-transition">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Theme Settings
            </CardTitle>
            <CardDescription>
              Customize the appearance and accessibility of your interface
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            {onClose && (
              <Button
                variant="default"
                size="sm"
                onClick={onClose}
              >
                Done
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="colors">Colors</TabsTrigger>
            <TabsTrigger value="accessibility">Accessibility</TabsTrigger>
            <TabsTrigger value="presets">Presets</TabsTrigger>
          </TabsList>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Theme Mode</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Choose your preferred color scheme
                </p>
                <RadioGroup
                  value={preferences.mode}
                  onValueChange={(value) => updatePreference('mode', value as any)}
                  className="grid grid-cols-3 gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="light" id="light" />
                    <Label htmlFor="light" className="flex items-center gap-2 cursor-pointer">
                      <Sun className="h-4 w-4" />
                      Light
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dark" id="dark" />
                    <Label htmlFor="dark" className="flex items-center gap-2 cursor-pointer">
                      <Moon className="h-4 w-4" />
                      Dark
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="system" id="system" />
                    <Label htmlFor="system" className="flex items-center gap-2 cursor-pointer">
                      <Monitor className="h-4 w-4" />
                      System
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              <div>
                <Label className="text-base font-semibold">Font Size</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Adjust the base font size for better readability
                </p>
                <Select
                  value={preferences.fontSize}
                  onValueChange={(value) => updatePreference('fontSize', value as any)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small (14px)</SelectItem>
                    <SelectItem value="medium">Medium (16px)</SelectItem>
                    <SelectItem value="large">Large (18px)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* Colors Tab */}
          <TabsContent value="colors" className="space-y-6 mt-6">
            <div>
              <Label className="text-base font-semibold">Accent Color</Label>
              <p className="text-sm text-muted-foreground mb-4">
                Choose a color that reflects your personality
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(ACCENT_COLORS).map(([color, { color: colorValue, name }]) => (
                  <button
                    key={color}
                    onClick={() => updatePreference('accentColor', color as AccentColor)}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border-2 transition-all hover:scale-105',
                      preferences.accentColor === color
                        ? 'border-current shadow-lg'
                        : 'border-transparent hover:border-border'
                    )}
                  >
                    <div
                      className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: colorValue }}
                    />
                    <div className="flex-1 text-left">
                      <div className="font-medium text-sm">{name}</div>
                    </div>
                    {preferences.accentColor === color && (
                      <Check className="h-4 w-4 text-current" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Accessibility Tab */}
          <TabsContent value="accessibility" className="space-y-6 mt-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    High Contrast Mode
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Increase contrast for better visibility
                  </p>
                </div>
                <Switch
                  checked={preferences.highContrast}
                  onCheckedChange={(checked) => updatePreference('highContrast', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Reduce Motion
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Minimize animations and transitions
                  </p>
                </div>
                <Switch
                  checked={preferences.reducedMotion}
                  onCheckedChange={(checked) => updatePreference('reducedMotion', checked)}
                />
              </div>

              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Accessibility className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Accessibility Features</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Screen reader compatible</li>
                        <li>• Keyboard navigation support</li>
                        <li>• Focus indicators</li>
                        <li>• WCAG 2.1 AA compliant colors</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Presets Tab */}
          <TabsContent value="presets" className="space-y-6 mt-6">
            <div>
              <Label className="text-base font-semibold">Theme Presets</Label>
              <p className="text-sm text-muted-foreground mb-4">
                Choose from carefully crafted color schemes
              </p>
              <div className="grid gap-4">
                {presets.map((preset) => (
                  <PresetCard
                    key={preset.id}
                    preset={preset}
                    isSelected={preferences.preset === preset.id}
                    onSelect={() => updatePreference('preset', preset.id)}
                    currentTheme={currentTheme}
                  />
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface PresetCardProps {
  preset: ThemePreset;
  isSelected: boolean;
  onSelect: () => void;
  currentTheme: 'light' | 'dark';
}

function PresetCard({ preset, isSelected, onSelect, currentTheme }: PresetCardProps) {
  const colors = preset.colors[currentTheme];
  
  return (
    <button
      onClick={onSelect}
      className={cn(
        'flex items-center gap-4 p-4 rounded-lg border-2 transition-all hover:scale-[1.02] text-left',
        isSelected
          ? 'border-primary shadow-lg'
          : 'border-border hover:border-muted-foreground'
      )}
    >
      <div className="flex gap-1">
        {Object.entries(colors)
          .slice(0, 4)
          .map(([property, color], index) => (
            <div
              key={property}
              className="w-4 h-8 border border-white/20"
              style={{ 
                backgroundColor: color,
                borderRadius: index === 0 ? '4px 0 0 4px' : index === 3 ? '0 4px 4px 0' : '0'
              }}
            />
          ))}
      </div>
      <div className="flex-1">
        <h4 className="font-semibold">{preset.name}</h4>
        <p className="text-sm text-muted-foreground">{preset.description}</p>
      </div>
      {isSelected && <Check className="h-5 w-5 text-primary" />}
    </button>
  );
}