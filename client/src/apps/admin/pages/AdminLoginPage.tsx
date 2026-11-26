import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../../providers/AuthProvider';
import { Button, Card, Input } from '../../../components/ui/primitives';

const ADMIN_SAVED_KEY = 'efo_saved_admin_login';

function loadSavedAdminEmail(): string {
  try {
    const raw = localStorage.getItem(ADMIN_SAVED_KEY);
    if (!raw) return '';
    return String(JSON.parse(raw).email || '');
  } catch {
    return '';
  }
}

export function AdminLoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(loadSavedAdminEmail);
  const [password, setPassword] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [loading, setLoading] = useState(false);

  if (user && user.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const signedIn = await login(email, password, 'admin');
      if (rememberDevice) {
        localStorage.setItem(
          ADMIN_SAVED_KEY,
          JSON.stringify({ email: signedIn.email, name: signedIn.name, savedAt: new Date().toISOString() }),
        );
      } else {
        localStorage.removeItem(ADMIN_SAVED_KEY);
      }
      toast.success('Authenticated as EventFlow Administrator');
      navigate('/admin/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Admin login failed');
    } finally {
      setLoading(false);
    }
  };

  const clearSaved = () => {
    localStorage.removeItem(ADMIN_SAVED_KEY);
    setEmail('');
    setPassword('');
    toast.success('Saved login details cleared from this device');
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
          <div className="flex items-center justify-between text-xs text-stone-600">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
                className="rounded border-stone-300 text-amber-700"
              />
              Remember login on this device
            </label>
            {Boolean(email) && (
              <button type="button" onClick={clearSaved} className="text-amber-700 hover:underline">
                Clear saved
              </button>
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
