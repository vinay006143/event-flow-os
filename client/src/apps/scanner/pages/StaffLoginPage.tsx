import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { QrCode, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../../providers/AuthProvider';
import { Button, Card, Input } from '../../../components/ui/primitives';

const STAFF_SAVED_KEY = 'efo_saved_staff_login';

function loadSavedStaffDetails(): { email: string; deviceCode: string } {
  try {
    const raw = localStorage.getItem(STAFF_SAVED_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { email?: string; deviceCode?: string };
      return {
        email: String(parsed.email || ''),
        deviceCode: String(parsed.deviceCode || localStorage.getItem('efo_device_code') || 'SCAN-GATEA-01'),
      };
    }
  } catch {
    // ignore parse error
  }
  return { email: '', deviceCode: localStorage.getItem('efo_device_code') || 'SCAN-GATEA-01' };
}

export function StaffLoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const saved = loadSavedStaffDetails();
  const [email, setEmail] = useState(saved.email);
  const [password, setPassword] = useState('');
  const [deviceCode, setDeviceCode] = useState(saved.deviceCode);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [loading, setLoading] = useState(false);

  if (user && user.role === 'staff') {
    return <Navigate to="/staff/scanner" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cleanDevice = deviceCode.trim().toUpperCase();
      const signedIn = await login(email, password, 'staff', cleanDevice || undefined);
      if (cleanDevice) localStorage.setItem('efo_device_code', cleanDevice);
      if (rememberDevice) {
        localStorage.setItem(
          STAFF_SAVED_KEY,
          JSON.stringify({
            email: signedIn.email,
            name: signedIn.name,
            deviceCode: cleanDevice || undefined,
            savedAt: new Date().toISOString(),
          }),
        );
      } else {
        localStorage.removeItem(STAFF_SAVED_KEY);
      }
      toast.success('Signed in to Staff Scanner');
      navigate('/staff/scanner');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const clearSaved = () => {
    localStorage.removeItem(STAFF_SAVED_KEY);
    setEmail('');
    setPassword('');
    toast.success('Saved staff login cleared from this device');
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
          <div className="flex items-center justify-between text-xs text-slate-300">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
                className="rounded border-slate-600 bg-slate-800 text-amber-500"
              />
              Remember details on device
            </label>
            {Boolean(email) && (
              <button type="button" onClick={clearSaved} className="text-amber-400 hover:underline">
                Clear saved
              </button>
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
