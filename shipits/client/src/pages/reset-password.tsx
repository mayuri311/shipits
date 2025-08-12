import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { authApi } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function ResetPasswordPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [token, setToken] = useState<string>('');
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const t = url.searchParams.get('token') || '';
    setToken(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast({ title: 'Invalid link', variant: 'destructive' });
      return;
    }
    if (pw1.length < 6) {
      toast({ title: 'Password too short', description: 'Must be at least 6 characters', variant: 'destructive' });
      return;
    }
    if (pw1 !== pw2) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await authApi.confirmPasswordReset(token, pw1, pw2);
      if (res.success) {
        toast({ title: 'Password reset', description: 'You can now log in with your new password.' });
        navigate('/');
      } else {
        throw new Error(res.error || 'Reset failed');
      }
    } catch (err: any) {
      toast({ title: 'Reset failed', description: err?.message || 'Please try again', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="max-w-md w-full bg-white dark:bg-neutral-900 rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
        <p className="text-muted-foreground mt-2">Enter and confirm your new password.</p>
        <div className="mt-6 space-y-4">
          <div>
            <Label htmlFor="pw1">New password</Label>
            <Input id="pw1" type="password" value={pw1} onChange={(e) => setPw1(e.target.value)} minLength={6} required />
          </div>
          <div>
            <Label htmlFor="pw2">Confirm new password</Label>
            <Input id="pw2" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} minLength={6} required />
          </div>
          <Button type="submit" className="w-full bg-maroon hover:bg-maroon/90" disabled={submitting}>
            {submitting ? 'Resetting...' : 'Reset password'}
          </Button>
        </div>
      </form>
    </div>
  );
}


