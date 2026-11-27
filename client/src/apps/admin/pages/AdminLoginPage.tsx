import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Lock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../../providers/AuthProvider';
import { Button, Card, Input } from '../../../components/ui/primitives';
import {
  clearSavedCredentials,
  CREDENTIAL_VALIDITY_DAYS,
  loadEncryptedCredentials,
} from '../../../lib/credentialVault';

export function AdminLoginPage() {
  const { user, loading: authLoading, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [savedUntil, setSavedUntil] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    loadEncryptedCredentials('admin').then((vault) => {
      if (!active || !vault) return;
      setEmail(vault.email || '');
      setPassword(vault.password || '');
      setSavedUntil(vault.expiresAt);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!authLoading && user && user.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password, 'admin', undefined, rememberDevice);
      toast.success('Authenticated as EventFlow Administrator');
      navigate('/admin/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Admin login failed');
    } finally {
      setLoading(false);
    }
  };

  const clearSaved = () => {
    clearSavedCredentials('admin');
    setEmail('');
    setPassword('');
    setSavedUntil(null);
    toast.success('Encrypted login details cleared from this device');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 px-4">
      <Card className="w-full max-w-md p-8 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-700 text-white">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-stone-900">EventFlow OS Admin</h1>
            <p className="text-xs text-stone-500">Single-Admin Control Plane</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} autoComplete="on" className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-700">Admin Email</label>
            <Input
              required
              name="email"
              type="email"
              autoComplete="username"
              placeholder="admin@eventflowos.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-700">Password</label>
            <Input
              required
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 text-xs text-stone-600">
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="rounded border-stone-300 text-amber-700"
                />
                Save login &amp; encrypted password ({CREDENTIAL_VALIDITY_DAYS} days)
              </label>
              {(Boolean(email) || savedUntil) && (
                <button type="button" onClick={clearSaved} className="shrink-0 text-amber-700 hover:underline">
                  Clear saved
                </button>
              )}
            </div>
            {savedUntil && (
              <p className="flex items-center gap-1 text-[11px] text-emerald-700">
                <Lock className="h-3 w-3" />
                Encrypted credentials saved locally until {new Date(savedUntil).toLocaleDateString('en-IN')}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? 'Signing In...' : 'Sign In to Admin Console'}
          </Button>
        </form>

        <div className="mt-6 flex justify-between border-t border-stone-100 pt-4 text-xs text-stone-500">
          <span>No public admin signup permitted</span>
          <Link to="/" className="font-medium text-amber-700 hover:underline">
            Back to Event Site
          </Link>
        </div>
      </Card>
    </div>
  );
}
