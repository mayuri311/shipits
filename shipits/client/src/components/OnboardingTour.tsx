import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { onboardingApi, aiApi } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';

type Step = {
  id: string;
  selector?: string;
  title: string;
  description: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
};

const DEFAULT_STEPS: Step[] = [
  { id: 'welcome', title: 'Welcome to Osprey @ CMU', description: 'Let’s take a quick tour of creating, discussing, and tracking projects.', placement: 'center' },
  { id: 'create-project', selector: 'a[href="/create-project"],button:has(svg[data-lucide="plus"])', title: 'Create Project', description: 'Showcase your work with images, videos, and markdown.', placement: 'bottom' },
  { id: 'forum', selector: 'a[href="/forum"]', title: 'Forum', description: 'Discover and discuss trending and recommended projects.', placement: 'bottom' },
  { id: 'dashboard', selector: 'a[href="/dashboard"],button:has(svg[data-lucide="bar-chart-3"])', title: 'Dashboard', description: 'Track your projects, stats, and notifications in one place.', placement: 'bottom' },
  { id: 'profile', selector: 'a[href^="/profile"]', title: 'Profile & Theme', description: 'Edit your profile and customize the theme to your preference.', placement: 'bottom' },
];

export function OnboardingTour() {
  const { user } = useAuth();
  const { updatePreference } = useTheme();
  const [stepIndex, setStepIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const steps = useMemo(() => DEFAULT_STEPS, []);

  useEffect(() => {
    if (!user) return;
    const completed = (user as any).onboarding?.completed;
    if (!completed) setTimeout(() => setVisible(true), 600);
  }, [user]);

  if (!user || !visible) return null;
  const step = steps[stepIndex];

  const targetEl = step.selector ? document.querySelector(step.selector) as HTMLElement : null;
  const rect = targetEl?.getBoundingClientRect();

  const finish = async () => {
    setVisible(false);
    try { await onboardingApi.completeOnboarding(user._id!.toString(), { stepsCompleted: steps.map(s => s.id), version: 1 }); } catch {}
    // Fire-and-forget AI personalization to suggest theme/layout; ThemeContext will persist when applied elsewhere
    try { 
      const resp = await aiApi.personalizeUI({ usageSignals: [{ name: 'tour_completed', value: 1 }] });
      if ((resp as any).success && (resp as any).data) {
        const s = (resp as any).data;
        if (s.mode) updatePreference('mode', s.mode);
        if (s.preset) updatePreference('preset', s.preset);
        if (s.accentColor) updatePreference('accentColor', s.accentColor);
      }
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-[70] pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />
      {/* Spotlight box */}
      <div
        className="absolute pointer-events-auto"
        style={{
          top: rect ? rect.top + window.scrollY : '30%',
          left: rect ? rect.left + window.scrollX : '50%',
          transform: rect ? undefined : 'translate(-50%, -50%)',
          width: rect ? rect.width : 360,
        }}
      >
        <Card className="shadow-xl">
          <CardContent className="p-4">
            <div className="text-sm font-semibold mb-1">{step.title}</div>
            <div className="text-sm text-gray-600 mb-3">{step.description}</div>
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">Step {stepIndex + 1} / {steps.length}</div>
              <div className="flex gap-2">
                {stepIndex < steps.length - 1 ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setVisible(false)}>Skip</Button>
                    <Button size="sm" onClick={() => setStepIndex((i) => i + 1)}>Next</Button>
                  </>
                ) : (
                  <Button size="sm" onClick={finish}>Finish</Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default OnboardingTour;


