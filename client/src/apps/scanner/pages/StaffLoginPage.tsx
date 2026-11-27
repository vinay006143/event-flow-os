import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Lock, QrCode, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../../providers/AuthProvider';
import { Button, Card, Input } from '../../../components/ui/primitives';
import {
  clearSavedCredentials,
  CREDENTIAL_VALIDITY_DAYS,
  loadEncryptedCredentials,
} from '../../../lib/credentialVault';

export function StaffLoginPage() {
  const { user, loading: authLoading, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [deviceCode, setDeviceCode] = useState(
    () => localStorage.getItem('efo_device_code') || 'SCAN-GATEA-01',
  );
  const [rememberDevice, setRememberDevice] = useState(true);
  const [savedUntil, setSavedUntil] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    loadEncryptedCredentials('staff').then((vault) => {
      if (!active || !vault) return;
      setEmail(vault.email || '');
      setPassword(vault.password || '');
      if (vault.deviceCode) setDeviceCode(vault.deviceCode);
      setSavedUntil(vault.expiresAt);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!authLoading && user && user.role === 'staff') {
    return <Navigate to="/staff/scanner" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cleanDevice = deviceCode.trim().toUpperCase();
      await login(email, password, 'staff', cleanDevice || undefined, rememberDevice);
      if (cleanDevice) localStorage.setItem('efo_device_code', cleanDevice);
      toast.success('Signed in to Staff Scanner');
      navigate('/staff/scanner');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const clearSaved = () => {
    clearSavedCredentials('staff');
    setEmail('');
    setPassword('');
    setSavedUntil(null);
    toast.success('Encrypted staff login cleared from this device');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
      <Card className="w-full max-w-md border-slate-800 bg-slate-900 p-8 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-600">
            <QrCode className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Staff Gate Scanner</h1>
            <p className="text-xs text-slate-400">EventFlow OS Operations Portal</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} autoComplete="on" className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Staff Email</label>
            <Input
              required
              name="email"
              type="email"
              autoComplete="username"
              placeholder="staff@eventflowos.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Password</label>
            <Input
              required
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Device Code</label>
            <Input
              name="deviceCode"
              placeholder="SCAN-GATEA-01"
              value={deviceCode}
              onChange={(e) => setDeviceCode(e.target.value.toUpperCase())}
              className="border-slate-700 bg-slate-800 font-mono text-white placeholder:text-slate-500"
            />
          </div>
          <div className="space-y-1.5 text-xs text-slate-300">
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="rounded border-slate-600 bg-slate-800 text-amber-500"
                />
                Save login &amp; encrypted password ({CREDENTIAL_VALIDITY_DAYS} days)
              </label>
              {(Boolean(email) || savedUntil) && (
                <button type="button" onClick={clearSaved} className="shrink-0 text-amber-400 hover:underline">
                  Clear saved
                </button>
              )}
            </div>
            {savedUntil && (
              <p className="flex items-center gap-1 text-[11px] text-emerald-400">
                <Lock className="h-3 w-3" />
                Encrypted credentials saved locally until {new Date(savedUntil).toLocaleDateString('en-IN')}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? 'Signing In...' : 'Open Scanner Console'}
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-400" /> Online verification required
          </span>
          <Link to="/" className="text-amber-400 hover:underline">
            Public Event
          </Link>
        </div>
      </Card>
    </div>
  );
}
