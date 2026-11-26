import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Html5Qrcode } from 'html5-qrcode';
import {
  AlertTriangle,
  Camera,
  CameraOff,
  CheckCircle2,
  DoorOpen,
  ImageUp,
  QrCode,
  Search,
  Send,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../../services/api';
import { Button, Input, Select, StatusBadge } from '../../../components/ui/primitives';
import { useAuth } from '../../../providers/AuthProvider';

export function StaffDashboardPage() {
  const { user } = useAuth();
  const { data: gates } = useQuery({
    queryKey: ['staff-gates'],
    queryFn: async () => (await api.get('/gates')).data.data,
  });
  const { data: recent } = useQuery({
    queryKey: ['staff-recent-scans'],
    queryFn: async () => (await api.get('/checkins/recent?limit=5')).data.data,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {user?.name}</h1>
        <p className="text-sm text-slate-400">Assigned gate check-in & lookup operations</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/staff/scanner"
          className="flex items-center justify-between rounded-2xl bg-amber-600 p-6 text-white shadow-lg hover:bg-amber-500"
        >
          <div>
            <div className="text-lg font-bold">Launch QR Scanner</div>
            <div className="text-xs text-amber-100">Fast camera & token check-in</div>
          </div>
          <QrCode className="h-9 w-9" />
        </Link>

        <Link
          to="/staff/manual-lookup"
          className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900 p-6 text-white hover:bg-slate-800"
        >
          <div>
            <div className="text-lg font-bold">Manual Ticket Lookup</div>
            <div className="text-xs text-slate-400">Search by Ticket ID, Name, Mobile</div>
          </div>
          <Search className="h-9 w-9 text-amber-400" />
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Assigned Gates</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(gates || []).map((g: Record<string, unknown>) => (
            <div key={String(g.id)} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="font-bold">{String(g.name)}</div>
              <div className="text-xs text-slate-400">Code: {String(g.code)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Latest Scans</h2>
        <div className="mt-3 space-y-2">
          {(recent || []).map((s: Record<string, unknown>) => (
            <div key={String(s._id)} className="flex items-center justify-between rounded-xl bg-slate-950 px-4 py-3 text-sm">
              <div>
                <div className="font-semibold">{String(s.attendeeName || s.ticketId || 'Unknown')}</div>
                <div className="text-xs text-slate-400">{String(s.message)}</div>
              </div>
              <StatusBadge status={String(s.result)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function StaffGatesPage() {
  const { data: gates } = useQuery({
    queryKey: ['staff-gates'],
    queryFn: async () => (await api.get('/gates')).data.data,
  });
  const [selectedGate, setSelectedGate] = useState(localStorage.getItem('efo_selected_gate') || '');

  const selectGate = (id: string) => {
    setSelectedGate(id);
    localStorage.setItem('efo_selected_gate', id);
    toast.success('Active gate updated');
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Assigned Gates</h1>
      <div className="grid gap-3">
        {(gates || []).map((g: Record<string, unknown>) => {
          const id = String(g.id);
          const active = selectedGate === id;
          return (
            <button
              key={id}
              onClick={() => selectGate(id)}
              className={`flex items-center justify-between rounded-2xl border p-5 text-left ${
                active ? 'border-amber-500 bg-amber-950/40' : 'border-slate-800 bg-slate-900'
              }`}
            >
              <div>
                <div className="flex items-center gap-2 font-bold">
                  <DoorOpen className="h-4 w-4 text-amber-400" /> {String(g.name)}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {String(g.code)} • Check-ins: {Number((g.stats as Record<string, unknown>)?.totalCheckins ?? 0)}
                </div>
              </div>
              {active && <span className="rounded-full bg-amber-600 px-3 py-1 text-xs font-bold">ACTIVE</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function StaffScannerPage() {
  const { data: gates } = useQuery({
    queryKey: ['staff-gates'],
    queryFn: async () => (await api.get('/gates')).data.data,
  });

  const [gateId, setGateId] = useState(localStorage.getItem('efo_selected_gate') || '');
  const [manualToken, setManualToken] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [scanning, setScanning] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');
  const [pendingScan, setPendingScan] = useState<{
    qrToken: string;
    valid: boolean;
    result: string;
    message: string;
    canCheckIn: boolean;
    canCheckOut: boolean;
    recommendedAction: 'CHECK_IN' | 'CHECK_OUT' | null;
    ticket?: Record<string, unknown>;
  } | null>(null);
  const [lastResult, setLastResult] = useState<{
    admitted: boolean;
    result: string;
    message: string;
    ticket?: Record<string, unknown>;
  } | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastTokenRef = useRef<string>('');

  useEffect(() => {
    if (!gateId && gates && gates.length > 0) {
      const firstId = String(gates[0].id);
      setGateId(firstId);
      localStorage.setItem('efo_selected_gate', firstId);
    }
  }, [gates, gateId]);

  const stopCameraSafe = async () => {
    const inst = scannerRef.current;
    scannerRef.current = null;
    if (inst) {
      await inst.stop().catch(() => undefined);
      try {
        inst.clear();
      } catch {
        // ignore clear error
      }
    }
    setCameraActive(false);
  };

  const submitQrToken = async (token: string) => {
    if (!gateId) {
      toast.error('Select a gate first');
      return;
    }
    const cleanToken = token.trim();
    if (!cleanToken || scanning) return;
    setScanning(true);
    try {
      const deviceId = localStorage.getItem('efo_device_code') || undefined;
      const res = await api.post('/checkins/inspect', {
        qrToken: cleanToken,
        gateId,
        deviceId,
      });
      const data = res.data.data;
      if (data.valid) {
        setLastResult(null);
        setPendingScan({ qrToken: cleanToken, ...data });
        setSelectedAction(data.recommendedAction === 'CHECK_OUT' ? 'CHECK_OUT' : 'CHECK_IN');
      } else {
        setPendingScan(null);
        setLastResult({
          admitted: false,
          result: data.result,
          message: data.message,
          ticket: data.ticket,
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Scan verification failed');
    } finally {
      setScanning(false);
    }
  };

  const submitAttendanceAction = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!pendingScan || !gateId || submittingAction) return;
    setSubmittingAction(true);
    try {
      const deviceId = localStorage.getItem('efo_device_code') || undefined;
      const res = await api.post('/checkins/action', {
        qrToken: pendingScan.qrToken,
        action: selectedAction,
        gateId,
        deviceId,
      });
      const outcome = res.data.data;
      setLastResult(outcome);
      setPendingScan(null);
      lastTokenRef.current = '';
      if (outcome.admitted) {
        toast.success(outcome.message);
      } else {
        toast.error(outcome.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update attendee status');
    } finally {
      setSubmittingAction(false);
    }
  };

  const startCameraWithId = async (preferredId?: string) => {
    setCameraError(null);
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      const msg =
        'Camera access requires HTTPS or http://localhost. On a phone over LAN HTTP, use "Scan QR Image" or paste the token below.';
      setCameraError(msg);
      toast.error(msg);
      return;
    }

    setCameraBusy(true);
    try {
      await stopCameraSafe();

      let detected: Array<{ id: string; label: string }> = [];
      try {
        detected = await Html5Qrcode.getCameras();
        setCameras(detected);
      } catch {
        detected = [];
      }

      const rearCamera = detected.find((c) => /back|rear|environment/i.test(c.label));
      const chosenId = preferredId || selectedCameraId || rearCamera?.id || detected[0]?.id || '';
      if (chosenId && chosenId !== selectedCameraId) {
        setSelectedCameraId(chosenId);
      }

      const html5Qr = new Html5Qrcode('qr-reader-region', { verbose: false });
      scannerRef.current = html5Qr;

      const qrConfig = {
        fps: 10,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const edge = Math.max(160, Math.min(260, Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.72)));
          return { width: edge, height: edge };
        },
        aspectRatio: 1.0,
      };

      const onDecoded = (decodedText: string) => {
        if (decodedText !== lastTokenRef.current) {
          lastTokenRef.current = decodedText;
          submitQrToken(decodedText);
          setTimeout(() => {
            lastTokenRef.current = '';
          }, 3000);
        }
      };

      const targets: Array<string | MediaTrackConstraints> = chosenId
        ? [chosenId, { facingMode: 'environment' }, { facingMode: 'user' }]
        : [{ facingMode: 'environment' }, { facingMode: 'user' }];

      let started = false;
      let lastErr: unknown = null;
      for (const target of targets) {
        try {
          await html5Qr.start(target, qrConfig, onDecoded, () => undefined);
          started = true;
          break;
        } catch (err) {
          lastErr = err;
        }
      }

      if (!started) {
        throw lastErr instanceof Error ? lastErr : new Error('Unable to access any camera device');
      }

      setCameraActive(true);
    } catch (err) {
      await stopCameraSafe();
      const rawMsg = err instanceof Error ? err.message : String(err || 'Camera start failed');
      const friendly = /NotAllowedError|Permission/i.test(rawMsg)
        ? 'Camera permission denied. Allow camera access in your browser address bar, then retry.'
        : /NotFoundError|Requested device not found/i.test(rawMsg)
          ? 'No camera hardware detected on this device. Use "Scan QR Image" or paste the QR token below.'
          : /NotReadableError|in use/i.test(rawMsg)
            ? 'Camera is currently in use by another app or tab. Close it and try again.'
            : `Camera error: ${rawMsg}`;
      setCameraError(friendly);
      toast.error(friendly);
    } finally {
      setCameraBusy(false);
    }
  };

  const toggleCamera = async () => {
    if (cameraBusy) return;
    if (cameraActive) {
      await stopCameraSafe();
      return;
    }
    await startCameraWithId();
  };

  const handleScanImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setCameraError(null);
    try {
      if (cameraActive) await stopCameraSafe();
      const fileScanner = new Html5Qrcode('qr-reader-file-temp', { verbose: false });
      try {
        const decodedText = await fileScanner.scanFile(file, false);
        await submitQrToken(decodedText);
      } finally {
        try {
          fileScanner.clear();
        } catch {
          // ignore
        }
      }
    } catch {
      toast.error('Could not read a valid QR code from that image');
    }
  };

  useEffect(() => {
    return () => {
      stopCameraSafe();
    };
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Gate QR Scanner</h1>
        <div className="w-full sm:w-64">
          <Select
            value={gateId}
            onChange={(e) => {
              setGateId(e.target.value);
              localStorage.setItem('efo_selected_gate', e.target.value);
            }}
            className="border-slate-700 bg-slate-900 text-white"
          >
            <option value="">Select Assigned Gate...</option>
            {(gates || []).map((g: Record<string, unknown>) => (
              <option key={String(g.id)} value={String(g.id)}>
                {String(g.name)} ({String(g.code)})
              </option>
            ))}
          </Select>
        </div>
      </div>

      {pendingScan && (
        <form
          onSubmit={submitAttendanceAction}
          className="rounded-2xl border-2 border-amber-400 bg-slate-900 p-5 shadow-xl shadow-amber-500/10 space-y-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-7 w-7 shrink-0 text-emerald-400" />
              <div>
                <div className="text-sm font-extrabold uppercase tracking-wider text-amber-300">
                  Valid QR Pass Verified
                </div>
                <p className="text-xs text-slate-300">{pendingScan.message}</p>
              </div>
            </div>
            {pendingScan.ticket && <StatusBadge status={String(pendingScan.ticket.status)} />}
          </div>

          {pendingScan.ticket && (
            <div className="grid gap-2 rounded-xl border border-slate-800 bg-slate-950 p-3.5 text-xs sm:grid-cols-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400">Attendee</div>
                <div className="mt-0.5 font-bold text-white">{String(pendingScan.ticket.attendeeName)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400">Category</div>
                <div className="mt-0.5 font-semibold text-amber-300">{String(pendingScan.ticket.ticketTypeName)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400">Ticket / Booking</div>
                <div className="mt-0.5 font-mono text-slate-200">{String(pendingScan.ticket.ticketId)}</div>
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-12 sm:items-end">
            <div className="sm:col-span-6">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-amber-200">
                Select Attendee Action
              </label>
              <Select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value as 'CHECK_IN' | 'CHECK_OUT')}
                className="border-amber-400/50 bg-slate-800 font-semibold text-white"
              >
                <option value="CHECK_IN">Check In (Admit Entry)</option>
                <option value="CHECK_OUT">Check Out (Record Exit)</option>
              </Select>
            </div>
            <div className="flex gap-2 sm:col-span-6">
              <Button
                type="submit"
                size="lg"
                disabled={submittingAction}
                className="flex-1 min-h-[44px]"
              >
                {submittingAction
                  ? 'Updating...'
                  : selectedAction === 'CHECK_OUT'
                    ? 'Submit Check Out'
                    : 'Submit Check In'}
              </Button>
              <Button
                type="button"
                size="lg"
                variant="outline"
                onClick={() => {
                  setPendingScan(null);
                  lastTokenRef.current = '';
                }}
                className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
              >
                Cancel
              </Button>
            </div>
          </div>
        </form>
      )}

      {lastResult && (
        <div
          className={`rounded-2xl border-2 p-5 ${
            lastResult.admitted && lastResult.result === 'CHECKED_OUT'
              ? 'border-sky-500 bg-sky-950/80 text-sky-100'
              : lastResult.admitted
                ? 'border-emerald-500 bg-emerald-950/80 text-emerald-100'
                : lastResult.result === 'ALREADY_CHECKED_IN' || lastResult.result === 'NOT_CHECKED_IN'
                  ? 'border-amber-500 bg-amber-950/80 text-amber-100'
                  : 'border-red-500 bg-red-950/80 text-red-100'
          }`}
        >
          <div className="flex items-start gap-3">
            {lastResult.admitted ? (
              <CheckCircle2 className="h-9 w-9 shrink-0 text-emerald-400" />
            ) : lastResult.result === 'ALREADY_CHECKED_IN' ? (
              <AlertTriangle className="h-9 w-9 shrink-0 text-amber-400" />
            ) : (
              <XCircle className="h-9 w-9 shrink-0 text-red-400" />
            )}
            <div className="flex-1">
              <div className="text-lg font-extrabold tracking-wide">{lastResult.result}</div>
              <div className="mt-1 text-sm font-medium">{lastResult.message}</div>
              {lastResult.ticket && (
                <div className="mt-2 rounded-xl bg-black/30 p-3 text-xs space-y-0.5">
                  <div><strong>Attendee:</strong> {String(lastResult.ticket.attendeeName)}</div>
                  <div><strong>Category:</strong> {String(lastResult.ticket.ticketTypeName)}</div>
                  <div className="font-mono"><strong>Ticket:</strong> {String(lastResult.ticket.ticketId)}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        {cameras.length > 1 && (
          <div className="mx-auto mb-3 max-w-sm">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Select Camera Lens
            </label>
            <Select
              value={selectedCameraId}
              onChange={(e) => {
                const nextId = e.target.value;
                setSelectedCameraId(nextId);
                if (cameraActive) {
                  startCameraWithId(nextId);
                }
              }}
              className="border-slate-700 bg-slate-800 text-xs text-white"
            >
              {cameras.map((cam, idx) => (
                <option key={cam.id} value={cam.id}>
                  {cam.label || `Camera ${idx + 1}`}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div className="relative mx-auto mb-4 min-h-[260px] max-w-sm overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
          {/* Keep #qr-reader-region completely free of React children so Html5Qrcode owns its DOM cleanly */}
          <div id="qr-reader-region" className="w-full [&_video]:!w-full [&_video]:!object-cover" />
          <div id="qr-reader-file-temp" className="hidden" />
          {!cameraActive && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center text-xs text-slate-400">
              <Camera className="h-8 w-8 text-slate-600" />
              <span>{cameraBusy ? 'Starting camera stream...' : 'Camera preview paused — tap Start Camera below'}</span>
            </div>
          )}
        </div>

        {cameraError && (
          <div className="mx-auto mb-3 max-w-sm rounded-xl border border-amber-500/40 bg-amber-950/50 px-3.5 py-2.5 text-xs text-amber-200">
            {cameraError}
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            onClick={toggleCamera}
            size="lg"
            disabled={cameraBusy}
            className="w-full"
            variant={cameraActive ? 'danger' : 'primary'}
          >
            {cameraActive ? <CameraOff className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
            {cameraBusy ? 'Starting...' : cameraActive ? 'Stop Camera Scanner' : 'Start Camera Scanner'}
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleScanImageFile}
            className="hidden"
          />
          <Button
            type="button"
            size="lg"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
          >
            <ImageUp className="h-5 w-5 text-amber-400" /> Scan QR Image
          </Button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitQrToken(manualToken);
            setManualToken('');
          }}
          className="mt-5 border-t border-slate-800 pt-4"
        >
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Paste / Hardware Scanner Token Input
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="EFO1...."
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              className="border-slate-700 bg-slate-800 font-mono text-white"
            />
            <Button type="submit" disabled={scanning || !manualToken.trim()} className="min-h-[44px]">
              <Send className="h-4 w-4" /> Validate
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function StaffManualLookupPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(false);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length < 3) {
      toast.error('Enter at least 3 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/checkins/lookup?q=${encodeURIComponent(query.trim())}`);
      setResults(res.data.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setLoading(false);
    }
  };

  const submitManualAction = async (ticketId: string, action: 'CHECK_IN' | 'CHECK_OUT') => {
    const gateId = localStorage.getItem('efo_selected_gate');
    if (!gateId) {
      toast.error('Select an assigned gate first');
      return;
    }
    try {
      const res = await api.post('/checkins/action', {
        ticketId,
        action,
        gateId,
        deviceId: localStorage.getItem('efo_device_code') || undefined,
      });
      if (res.data.data.admitted) {
        toast.success(res.data.data.message);
      } else {
        toast.error(res.data.data.message);
      }
      const updated = await api.get(`/checkins/lookup?q=${encodeURIComponent(query.trim())}`);
      setResults(updated.data.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Manual update failed');
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Manual Ticket Lookup</h1>
      <form onSubmit={search} className="flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder="Ticket ID, Booking Ref, Name, or Mobile (min 3 chars)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border-slate-700 bg-slate-900 text-white"
        />
        <Button type="submit" disabled={loading} className="min-h-[44px]">
          <Search className="h-4 w-4" /> Search
        </Button>
      </form>

      <div className="space-y-3">
        {results.map((t) => (
          <div key={String(t.ticketId)} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold">{String(t.attendeeName)}</span>
                <StatusBadge status={String(t.status)} />
              </div>
              <div className="mt-1 font-mono text-xs text-slate-400">
                {String(t.ticketId)} • {String(t.bookingReference)} • {String(t.maskedMobile)}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {(t.status === 'ISSUED' || t.status === 'CHECKED_OUT') && (
                <Button size="sm" onClick={() => submitManualAction(String(t.ticketId), 'CHECK_IN')}>
                  Check In
                </Button>
              )}
              {t.status === 'CHECKED_IN' && (
                <Button size="sm" variant="outline" onClick={() => submitManualAction(String(t.ticketId), 'CHECK_OUT')}>
                  Check Out
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StaffRecentScansPage() {
  const { data: scans, refetch } = useQuery({
    queryKey: ['staff-recent-scans-full'],
    queryFn: async () => (await api.get('/checkins/recent?limit=30')).data.data,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Recent Scans</h1>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Refresh
        </Button>
      </div>
      <div className="space-y-2">
        {(scans || []).map((s: Record<string, unknown>) => (
          <div key={String(s._id)} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm">
            <div className="min-w-0 flex-1">
              <div className="font-bold truncate">{String(s.attendeeName || s.ticketId || 'Unrecognized QR')}</div>
              <div className="text-xs text-slate-400 break-words">
                {String(s.gateName || '')} • {String(s.message)}
              </div>
            </div>
            <StatusBadge status={String(s.result)} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function StaffDeviceStatusPage() {
  const [deviceCode, setDeviceCode] = useState(localStorage.getItem('efo_device_code') || 'SCAN-GATEA-01');
  const [lastHeartbeat, setLastHeartbeat] = useState<string | null>(null);

  const sendHeartbeat = async () => {
    try {
      const res = await api.post('/devices/heartbeat', {
        deviceCode,
        appVersion: '1.0.0',
        networkType: navigator.onLine ? 'online' : 'offline',
      });
      localStorage.setItem('efo_device_code', deviceCode.toUpperCase());
      setLastHeartbeat(res.data.data.lastHeartbeatAt);
      toast.success('Device heartbeat confirmed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Heartbeat failed');
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Device Status</h1>
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Registered Device Code</label>
          <Input
            value={deviceCode}
            onChange={(e) => setDeviceCode(e.target.value.toUpperCase())}
            className="border-slate-700 bg-slate-800 font-mono text-white"
          />
        </div>
        <Button onClick={sendHeartbeat}>Send Device Heartbeat</Button>
        {lastHeartbeat && (
          <p className="text-xs text-emerald-400">
            Last verified heartbeat: {new Date(lastHeartbeat).toLocaleString('en-IN')}
          </p>
        )}
      </div>
    </div>
  );
}
