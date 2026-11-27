import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertOctagon, Download, Image as ImageIcon, KeyRound, Mail, MessageSquare, Paperclip, Pencil, Plus, RefreshCw, Send, ShieldAlert, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../../services/api';
import { clearSavedCredentials } from '../../../lib/credentialVault';
import { formatCurrency } from '../../../lib/utils';
import { Button, Card, Input, Select, StatusBadge } from '../../../components/ui/primitives';

export function AdminEventSettingsPage() {
  const { data, refetch } = useQuery({
    queryKey: ['admin-event'],
    queryFn: async () => (await api.get('/event')).data.data,
  });
  const [name, setName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [doorsOpenTime, setDoorsOpenTime] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [venueCity, setVenueCity] = useState('');

  useEffect(() => {
    if (data) {
      setName(data.name || '');
      setSubtitle(data.subtitle || '');
      setDescription(data.description || '');
      setDoorsOpenTime(data.doorsOpenTime || '');
      setSupportPhone(data.contact?.phone || '');
      setSupportEmail(data.contact?.email || '');
      setVenueName(data.venue?.name || '');
      setVenueAddress(data.venue?.address || '');
      setVenueCity(data.venue?.city || '');
    }
  }, [data]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.patch('/event', {
        name,
        subtitle,
        description,
        doorsOpenTime,
        contact: { ...(data?.contact || {}), phone: supportPhone, email: supportEmail },
        venue: { ...(data?.venue || {}), name: venueName, address: venueAddress, city: venueCity },
      });
      toast.success('Event configuration saved');
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    }
  };

  return (
    <Card className="max-w-3xl p-5 sm:p-6">
      <h2 className="text-lg font-bold">Event Configuration (Reusable Deployment Config)</h2>
      <form onSubmit={save} className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium">Event Name</label>
          <Input required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium">Subtitle</label>
          <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium">Description</label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Doors Open Time</label>
          <Input value={doorsOpenTime} onChange={(e) => setDoorsOpenTime(e.target.value)} placeholder="5:00 PM IST" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Venue City</label>
          <Input value={venueCity} onChange={(e) => setVenueCity(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Venue Name</label>
          <Input required value={venueName} onChange={(e) => setVenueName(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Venue Address</label>
          <Input value={venueAddress} onChange={(e) => setVenueAddress(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Support Phone</label>
          <Input value={supportPhone} onChange={(e) => setSupportPhone(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Support Email</label>
          <Input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit">Save Configuration</Button>
        </div>
      </form>
    </Card>
  );
}

export function AdminTicketTypesPage() {
  const { data, refetch } = useQuery({
    queryKey: ['admin-ticket-types'],
    queryFn: async () => (await api.get('/ticket-types')).data.data,
  });
  const [form, setForm] = useState({ code: '', name: '', price: '499', capacity: '200', description: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', price: '0', capacity: '1', description: '', isActive: true });

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/ticket-types', {
        code: form.code.toUpperCase(),
        name: form.name,
        price: Number(form.price),
        capacity: Number(form.capacity),
        description: form.description,
      });
      toast.success('Ticket category created');
      setForm({ code: '', name: '', price: '499', capacity: '200', description: '' });
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Creation failed');
    }
  };

  const startEdit = (tt: Record<string, unknown>) => {
    setEditingId(String(tt.id));
    setEditForm({
      name: String(tt.name || ''),
      price: String(tt.price ?? 0),
      capacity: String(tt.capacity ?? 1),
      description: String(tt.description || ''),
      isActive: Boolean(tt.isActive),
    });
  };

  const saveEdit = async (id: string) => {
    try {
      await api.patch(`/ticket-types/${id}`, {
        name: editForm.name,
        price: Number(editForm.price),
        capacity: Number(editForm.capacity),
        description: editForm.description,
        isActive: editForm.isActive,
      });
      toast.success('Ticket category updated');
      setEditingId(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const remove = async (id: string, name: string) => {
    if (!window.confirm(`Delete ticket category "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/ticket-types/${id}`);
      toast.success('Ticket category deleted');
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <h2 className="text-base font-bold">Add Ticket Category</h2>
        <form onSubmit={create} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Input required placeholder="CODE (e.g. VIP)" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
          <Input required placeholder="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input required type="number" min="0" placeholder="Price ₹" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
          <Input required type="number" min="1" placeholder="Capacity" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} />
          <Input placeholder="Description (optional)" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <Button type="submit" className="sm:col-span-2 lg:col-span-1"><Plus className="h-4 w-4" /> Create</Button>
        </form>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {(data || []).map((tt: Record<string, unknown>) => {
          const id = String(tt.id);
          const isEditing = editingId === id;
          return (
            <Card key={id} className="p-5 space-y-3">
              {isEditing ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-stone-500">{String(tt.code)}</span>
                    <label className="flex items-center gap-2 text-xs font-medium">
                      <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.checked }))} />
                      Active
                    </label>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Input placeholder="Name" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
                    <Input type="number" min="0" placeholder="Price" value={editForm.price} onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))} />
                    <Input type="number" min="1" placeholder="Capacity" value={editForm.capacity} onChange={(e) => setEditForm((f) => ({ ...f, capacity: e.target.value }))} />
                  </div>
                  <Input placeholder="Description" value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveEdit(id)}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{String(tt.name)}</span>
                        <StatusBadge status={tt.isActive ? 'ACTIVE' : 'SUSPENDED'} />
                      </div>
                      <div className="font-mono text-xs text-stone-500">{String(tt.code)}</div>
                    </div>
                    <div className="text-lg font-bold text-amber-800">{formatCurrency(Number(tt.price))}</div>
                  </div>
                  {Boolean(tt.description) && <p className="text-xs text-stone-600">{String(tt.description)}</p>}
                  <div className="text-xs text-stone-600">
                    Sold: <strong>{Number(tt.soldQuantity)}</strong> • Reserved: <strong>{Number(tt.reservedQuantity)}</strong> • Available: <strong>{Number(tt.availableQuantity)}</strong> / {Number(tt.capacity)}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => startEdit(tt)}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => remove(id, String(tt.name))}>
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                </>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export function AdminRegistrationFormsPage() {
  const { data: event, refetch } = useQuery({
    queryKey: ['admin-event'],
    queryFn: async () => (await api.get('/event')).data.data,
  });
  const [newField, setNewField] = useState({
    key: '',
    label: '',
    type: 'text',
    placeholder: '',
    options: '',
    required: false,
  });
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editField, setEditField] = useState({
    label: '',
    type: 'text',
    placeholder: '',
    options: '',
    required: false,
    enabled: true,
  });

  const persistFields = async (next: Record<string, unknown>[], successMsg: string) => {
    try {
      await api.put('/event/registration-fields', { fields: next });
      toast.success(successMsg);
      refetch();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
      return false;
    }
  };

  const addField = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = newField.key.trim().replace(/[^a-zA-Z0-9_]/g, '_');
    const existing = (event?.registrationFields || []) as Record<string, unknown>[];
    if (!cleanKey) {
      toast.error('Enter a valid field key');
      return;
    }
    if (existing.some((f) => f.key === cleanKey)) {
      toast.error(`Field key "${cleanKey}" already exists`);
      return;
    }
    const created = {
      key: cleanKey,
      label: newField.label.trim(),
      type: newField.type,
      required: newField.required,
      placeholder: newField.placeholder.trim() || undefined,
      options:
        newField.type === 'select'
          ? newField.options.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
      displayOrder: existing.length + 1,
      enabled: true,
    };
    const ok = await persistFields([...existing, created], 'Registration field added');
    if (ok) {
      setNewField({ key: '', label: '', type: 'text', placeholder: '', options: '', required: false });
    }
  };

  const toggleRequired = async (key: string) => {
    const next = (event?.registrationFields || []).map((f: Record<string, unknown>) =>
      f.key === key ? { ...f, required: !f.required } : f,
    );
    await persistFields(next, 'Registration field updated');
  };

  const toggleEnabled = async (key: string) => {
    const next = (event?.registrationFields || []).map((f: Record<string, unknown>) =>
      f.key === key ? { ...f, enabled: !(f.enabled !== false) } : f,
    );
    await persistFields(next, 'Field visibility updated');
  };

  const startEdit = (f: Record<string, unknown>) => {
    setEditingKey(String(f.key));
    setEditField({
      label: String(f.label || ''),
      type: String(f.type || 'text'),
      placeholder: String(f.placeholder || ''),
      options: Array.isArray(f.options) ? (f.options as string[]).join(', ') : '',
      required: Boolean(f.required),
      enabled: f.enabled !== false,
    });
  };

  const saveEdit = async (key: string) => {
    const next = (event?.registrationFields || []).map((f: Record<string, unknown>) =>
      f.key === key
        ? {
            ...f,
            label: editField.label.trim(),
            type: editField.type,
            placeholder: editField.placeholder.trim() || undefined,
            options:
              editField.type === 'select'
                ? editField.options.split(',').map((s) => s.trim()).filter(Boolean)
                : undefined,
            required: editField.required,
            enabled: editField.enabled,
          }
        : f,
    );
    const ok = await persistFields(next, 'Registration field saved');
    if (ok) setEditingKey(null);
  };

  const removeField = async (key: string, label: string) => {
    const existing = (event?.registrationFields || []) as Record<string, unknown>[];
    if (existing.length <= 1) {
      toast.error('At least one registration field must remain configured');
      return;
    }
    if (!window.confirm(`Delete registration field "${label}"?`)) return;
    const next = existing.filter((f) => f.key !== key);
    await persistFields(next, 'Registration field deleted');
  };

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <h2 className="text-base font-bold">Add Registration Field</h2>
        <form onSubmit={addField} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Input required placeholder="Key (e.g. gotra)" value={newField.key} onChange={(e) => setNewField((f) => ({ ...f, key: e.target.value }))} />
          <Input required placeholder="Field Label" value={newField.label} onChange={(e) => setNewField((f) => ({ ...f, label: e.target.value }))} />
          <Select value={newField.type} onChange={(e) => setNewField((f) => ({ ...f, type: e.target.value }))}>
            <option value="text">Text</option>
            <option value="phone">Phone</option>
            <option value="email">Email</option>
            <option value="number">Number</option>
            <option value="select">Dropdown Select</option>
            <option value="textarea">Textarea</option>
            <option value="checkbox">Checkbox</option>
          </Select>
          <Input placeholder={newField.type === 'select' ? 'Options: Opt1, Opt2' : 'Placeholder'} value={newField.type === 'select' ? newField.options : newField.placeholder} onChange={(e) => setNewField((f) => (newField.type === 'select' ? { ...f, options: e.target.value } : { ...f, placeholder: e.target.value }))} />
          <label className="flex items-center gap-2 rounded-xl border border-stone-200 px-3 text-xs font-medium">
            <input type="checkbox" checked={newField.required} onChange={(e) => setNewField((f) => ({ ...f, required: e.target.checked }))} />
            Required
          </label>
          <Button type="submit"><Plus className="h-4 w-4" /> Add Field</Button>
        </form>
      </Card>

      <Card className="p-5 sm:p-6 space-y-4">
        <h2 className="text-lg font-bold">Configured Registration Fields</h2>
        <div className="space-y-2.5">
          {(event?.registrationFields || []).map((f: Record<string, unknown>) => {
            const key = String(f.key);
            const isEditing = editingKey === key;
            return (
              <div key={key} className="rounded-xl border border-stone-200 p-4 text-sm">
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Input placeholder="Label" value={editField.label} onChange={(e) => setEditField((ef) => ({ ...ef, label: e.target.value }))} />
                      <Select value={editField.type} onChange={(e) => setEditField((ef) => ({ ...ef, type: e.target.value }))}>
                        <option value="text">Text</option>
                        <option value="phone">Phone</option>
                        <option value="email">Email</option>
                        <option value="number">Number</option>
                        <option value="select">Dropdown Select</option>
                        <option value="textarea">Textarea</option>
                        <option value="checkbox">Checkbox</option>
                      </Select>
                      <Input placeholder={editField.type === 'select' ? 'Comma options' : 'Placeholder'} value={editField.type === 'select' ? editField.options : editField.placeholder} onChange={(e) => setEditField((ef) => (editField.type === 'select' ? { ...ef, options: e.target.value } : { ...ef, placeholder: e.target.value }))} />
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      <label className="flex items-center gap-1.5">
                        <input type="checkbox" checked={editField.required} onChange={(e) => setEditField((ef) => ({ ...ef, required: e.target.checked }))} />
                        Required
                      </label>
                      <label className="flex items-center gap-1.5">
                        <input type="checkbox" checked={editField.enabled} onChange={(e) => setEditField((ef) => ({ ...ef, enabled: e.target.checked }))} />
                        Enabled
                      </label>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveEdit(key)}>Save</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingKey(null)}>Cancel</Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{String(f.label)}</span>
                        <StatusBadge status={f.enabled === false ? 'SUSPENDED' : 'ACTIVE'} />
                      </div>
                      <div className="font-mono text-xs text-stone-500">key: {key} • type: {String(f.type)}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => toggleRequired(key)}>
                        {f.required ? 'Required' : 'Optional'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toggleEnabled(key)}>
                        {f.enabled === false ? 'Enable' : 'Disable'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => startEdit(f)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => removeField(key, String(f.label))}>
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

export function AdminGatesPage() {
  const { data, refetch } = useQuery({
    queryKey: ['admin-gates'],
    queryFn: async () => (await api.get('/gates')).data.data,
  });
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ code: '', name: '', description: '', isActive: true });

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/gates', { code: code.toUpperCase(), name, description: description || undefined });
      toast.success('Gate created');
      setCode('');
      setName('');
      setDescription('');
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  };

  const startEdit = (g: Record<string, unknown>) => {
    setEditingId(String(g.id));
    setEditForm({
      code: String(g.code || ''),
      name: String(g.name || ''),
      description: String(g.description || ''),
      isActive: Boolean(g.isActive),
    });
  };

  const saveEdit = async (id: string) => {
    try {
      await api.patch(`/gates/${id}`, {
        code: editForm.code.toUpperCase(),
        name: editForm.name,
        description: editForm.description,
        isActive: editForm.isActive,
      });
      toast.success('Gate updated');
      setEditingId(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      await api.patch(`/gates/${id}`, { isActive: !isActive });
      toast.success(!isActive ? 'Gate activated' : 'Gate suspended');
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Status update failed');
    }
  };

  const remove = async (id: string, gateName: string) => {
    if (!window.confirm(`Delete gate "${gateName}"? Assigned staff/device links will be cleared.`)) return;
    try {
      await api.delete(`/gates/${id}`);
      toast.success('Gate deleted');
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <h2 className="text-base font-bold">Create Entry Gate</h2>
        <form onSubmit={create} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input required placeholder="GATE-C" value={code} onChange={(e) => setCode(e.target.value)} />
          <Input required placeholder="Gate Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Button type="submit" className="min-h-[42px]"><Plus className="h-4 w-4" /> Add Gate</Button>
        </form>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {(data || []).map((g: Record<string, unknown>) => {
          const id = String(g.id);
          const isEditing = editingId === id;
          return (
            <Card key={id} className="p-5 space-y-3">
              {isEditing ? (
                <div className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input required placeholder="Code" value={editForm.code} onChange={(e) => setEditForm((f) => ({ ...f, code: e.target.value }))} />
                    <Input required placeholder="Name" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
                  </div>
                  <Input placeholder="Description" value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
                  <label className="flex items-center gap-2 text-xs font-medium">
                    <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.checked }))} />
                    Active Gate
                  </label>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveEdit(id)}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold">{String(g.name)}</div>
                    <StatusBadge status={g.isActive ? 'ACTIVE' : 'SUSPENDED'} />
                  </div>
                  <div className="font-mono text-xs text-stone-500">{String(g.code)}</div>
                  {Boolean(g.description) && <p className="text-xs text-stone-600">{String(g.description)}</p>}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => startEdit(g)}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toggleActive(id, Boolean(g.isActive))}>
                      {g.isActive ? 'Disable' : 'Enable'}
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => remove(id, String(g.name))}>
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                </>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export function AdminStaffPage() {
  const { data: staff, refetch } = useQuery({
    queryKey: ['admin-staff'],
    queryFn: async () => (await api.get('/staff')).data.data,
  });
  const { data: gates } = useQuery({
    queryKey: ['admin-gates'],
    queryFn: async () => (await api.get('/gates')).data.data,
  });
  const [form, setForm] = useState({ name: '', email: '', password: '', gateId: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', gateId: '', status: 'ACTIVE' });

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/staff', {
        name: form.name,
        email: form.email,
        password: form.password,
        assignedGateIds: form.gateId ? [form.gateId] : [],
        permissions: ['SCAN_TICKETS', 'MANUAL_LOOKUP', 'VIEW_RECENT_SCANS', 'VIEW_ASSIGNED_GATES', 'MANAGE_DEVICE_HEARTBEAT'],
      });
      toast.success('Staff account provisioned');
      setForm({ name: '', email: '', password: '', gateId: '' });
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  };

  const toggleStatus = async (id: string, current: string) => {
    try {
      await api.patch(`/staff/${id}`, { status: current === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' });
      toast.success('Staff status updated');
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Status update failed');
    }
  };

  const startEdit = (s: Record<string, unknown>) => {
    const gateList = (s.assignedGateIds as string[]) || [];
    setEditingId(String(s.id));
    setEditForm({
      name: String(s.name || ''),
      email: String(s.email || ''),
      gateId: gateList[0] ? String(gateList[0]) : '',
      status: String(s.status || 'ACTIVE'),
    });
  };

  const saveEdit = async (id: string) => {
    try {
      await api.patch(`/staff/${id}`, {
        name: editForm.name,
        email: editForm.email,
        assignedGateIds: editForm.gateId ? [editForm.gateId] : [],
        status: editForm.status,
      });
      toast.success('Staff account updated');
      setEditingId(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const resetPassword = async (id: string, staffName: string) => {
    const newPassword = window.prompt(`Enter new password for ${staffName} (min 8 characters):`);
    if (!newPassword) return;
    try {
      await api.post(`/staff/${id}/reset-password`, { newPassword });
      toast.success('Staff password reset');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Password reset failed');
    }
  };

  const remove = async (id: string, staffName: string) => {
    if (!window.confirm(`Delete staff account "${staffName}"? Active sessions will be revoked.`)) return;
    try {
      await api.delete(`/staff/${id}`);
      toast.success('Staff account deleted');
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <h2 className="text-base font-bold">Provision Restricted Staff Account</h2>
        <form onSubmit={create} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Input required placeholder="Full Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input required type="email" placeholder="Staff Email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          <Input required type="password" placeholder="Password (min 8)" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          <Select value={form.gateId} onChange={(e) => setForm((f) => ({ ...f, gateId: e.target.value }))}>
            <option value="">Assign Gate...</option>
            {(gates || []).map((g: Record<string, unknown>) => (
              <option key={String(g.id)} value={String(g.id)}>{String(g.name)}</option>
            ))}
          </Select>
          <Button type="submit" className="sm:col-span-2 lg:col-span-1"><Plus className="h-4 w-4" /> Create Staff</Button>
        </form>
      </Card>

      {editingId && (
        <Card className="border-amber-300 bg-amber-50/40 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">Edit Staff Account</h3>
            <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input placeholder="Full Name" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
            <Input type="email" placeholder="Staff Email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
            <Select value={editForm.gateId} onChange={(e) => setEditForm((f) => ({ ...f, gateId: e.target.value }))}>
              <option value="">No Gate Assigned</option>
              {(gates || []).map((g: Record<string, unknown>) => (
                <option key={String(g.id)} value={String(g.id)}>{String(g.name)}</option>
              ))}
            </Select>
            <Select value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
            </Select>
          </div>
          <Button size="sm" onClick={() => saveEdit(editingId)}>Save Staff Changes</Button>
        </Card>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-stone-500">
            <tr>
              <th className="px-4 py-3">Staff</th>
              <th className="px-4 py-3">Gates</th>
              <th className="px-4 py-3">Valid Scans</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {(staff || []).map((s: Record<string, unknown>) => {
              const id = String(s.id);
              return (
                <tr key={id}>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{String(s.name)}</div>
                    <div className="text-xs text-stone-500">{String(s.email)}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">{(s.assignedGateIds as string[]).length} gate(s)</td>
                  <td className="px-4 py-3">{Number((s.stats as Record<string, unknown>)?.totalScans ?? 0)}</td>
                  <td className="px-4 py-3"><StatusBadge status={String(s.status)} /></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => startEdit(s)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toggleStatus(id, String(s.status))}>
                        {s.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => resetPassword(id, String(s.name))}>
                        <KeyRound className="h-3.5 w-3.5" /> Reset PW
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => remove(id, String(s.name))}>
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export function AdminDevicesPage() {
  const { data, refetch } = useQuery({
    queryKey: ['admin-devices'],
    queryFn: async () => (await api.get('/devices')).data.data,
  });
  const { data: gates } = useQuery({
    queryKey: ['admin-gates'],
    queryFn: async () => (await api.get('/gates')).data.data,
  });
  const [deviceCode, setDeviceCode] = useState('');
  const [name, setName] = useState('');
  const [assignedGateId, setAssignedGateId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', assignedGateId: '', status: 'ACTIVE' });

  const registerDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/devices', {
        deviceCode: deviceCode.toUpperCase(),
        name,
        assignedGateId: assignedGateId || undefined,
      });
      toast.success('Device registered');
      setDeviceCode('');
      setName('');
      setAssignedGateId('');
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  };

  const toggle = async (id: string, status: string) => {
    try {
      await api.patch(`/devices/${id}`, { status: status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' });
      toast.success('Device status updated');
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Status update failed');
    }
  };

  const startEdit = (d: Record<string, unknown>) => {
    setEditingId(String(d._id));
    setEditForm({
      name: String(d.name || ''),
      assignedGateId: d.assignedGateId ? String(d.assignedGateId) : '',
      status: String(d.status || 'ACTIVE'),
    });
  };

  const saveEdit = async (id: string) => {
    try {
      await api.patch(`/devices/${id}`, {
        name: editForm.name,
        assignedGateId: editForm.assignedGateId || null,
        status: editForm.status,
      });
      toast.success('Device updated');
      setEditingId(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const remove = async (id: string, code: string) => {
    if (!window.confirm(`Delete scanner device "${code}"?`)) return;
    try {
      await api.delete(`/devices/${id}`);
      toast.success('Device deleted');
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const gateNameById = new Map(((gates || []) as Record<string, unknown>[]).map((g) => [String(g.id), String(g.name)]));

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <h2 className="text-base font-bold">Authorize Scanner Device</h2>
        <form onSubmit={registerDevice} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input required placeholder="SCAN-GATEB-01" value={deviceCode} onChange={(e) => setDeviceCode(e.target.value)} />
          <Input required placeholder="Device Label" value={name} onChange={(e) => setName(e.target.value)} />
          <Select value={assignedGateId} onChange={(e) => setAssignedGateId(e.target.value)}>
            <option value="">Assign Gate (optional)</option>
            {(gates || []).map((g: Record<string, unknown>) => (
              <option key={String(g.id)} value={String(g.id)}>{String(g.name)}</option>
            ))}
          </Select>
          <Button type="submit" className="min-h-[42px]"><Plus className="h-4 w-4" /> Authorize Device</Button>
        </form>
      </Card>

      {editingId && (
        <Card className="border-amber-300 bg-amber-50/40 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">Edit Scanner Device</h3>
            <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input placeholder="Device Label" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
            <Select value={editForm.assignedGateId} onChange={(e) => setEditForm((f) => ({ ...f, assignedGateId: e.target.value }))}>
              <option value="">Unassigned</option>
              {(gates || []).map((g: Record<string, unknown>) => (
                <option key={String(g.id)} value={String(g.id)}>{String(g.name)}</option>
              ))}
            </Select>
            <Select value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
            </Select>
          </div>
          <Button size="sm" onClick={() => saveEdit(editingId)}>Save Device</Button>
        </Card>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-stone-500">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Gate</th>
              <th className="px-4 py-3">Last Heartbeat</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {(data || []).map((d: Record<string, unknown>) => {
              const id = String(d._id);
              return (
                <tr key={id}>
                  <td className="px-4 py-3 font-mono text-xs font-bold">{String(d.deviceCode)}</td>
                  <td className="px-4 py-3">{String(d.name)}</td>
                  <td className="px-4 py-3 text-xs">{d.assignedGateId ? gateNameById.get(String(d.assignedGateId)) || 'Assigned' : '—'}</td>
                  <td className="px-4 py-3 text-xs">{d.lastHeartbeatAt ? new Date(String(d.lastHeartbeatAt)).toLocaleString('en-IN') : 'Never'}</td>
                  <td className="px-4 py-3"><StatusBadge status={String(d.status)} /></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => startEdit(d)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toggle(id, String(d.status))}>
                        {d.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => remove(id, String(d.deviceCode))}>
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export function AdminPromoCodesPage() {
  const { data, refetch } = useQuery({
    queryKey: ['admin-promos'],
    queryFn: async () => (await api.get('/promo-codes')).data.data,
  });
  const [form, setForm] = useState({ code: '', discountType: 'PERCENTAGE', discountValue: '10', totalUsageLimit: '100', description: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ discountType: 'PERCENTAGE', discountValue: '10', totalUsageLimit: '', description: '', isActive: true });

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/promo-codes', {
        code: form.code.toUpperCase(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        totalUsageLimit: form.totalUsageLimit ? Number(form.totalUsageLimit) : null,
        description: form.description || undefined,
      });
      toast.success('Promo code created');
      setForm({ code: '', discountType: 'PERCENTAGE', discountValue: '10', totalUsageLimit: '100', description: '' });
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  };

  const startEdit = (p: Record<string, unknown>) => {
    setEditingId(String(p._id));
    setEditForm({
      discountType: String(p.discountType || 'PERCENTAGE'),
      discountValue: String(p.discountValue ?? '10'),
      totalUsageLimit: p.totalUsageLimit ? String(p.totalUsageLimit) : '',
      description: String(p.description || ''),
      isActive: Boolean(p.isActive),
    });
  };

  const saveEdit = async (id: string) => {
    try {
      await api.patch(`/promo-codes/${id}`, {
        discountType: editForm.discountType,
        discountValue: Number(editForm.discountValue),
        totalUsageLimit: editForm.totalUsageLimit ? Number(editForm.totalUsageLimit) : null,
        description: editForm.description,
        isActive: editForm.isActive,
      });
      toast.success('Promo code updated');
      setEditingId(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      await api.patch(`/promo-codes/${id}`, { isActive: !isActive });
      toast.success(!isActive ? 'Promo code enabled' : 'Promo code disabled');
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Toggle failed');
    }
  };

  const remove = async (id: string, code: string) => {
    if (!window.confirm(`Delete promo code "${code}"?`)) return;
    try {
      await api.delete(`/promo-codes/${id}`);
      toast.success('Promo code deleted');
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <h2 className="text-base font-bold">Create Promo Code</h2>
        <form onSubmit={create} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Input required placeholder="CODE" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
          <Select value={form.discountType} onChange={(e) => setForm((f) => ({ ...f, discountType: e.target.value }))}>
            <option value="PERCENTAGE">Percentage (%)</option>
            <option value="FIXED">Fixed (₹)</option>
          </Select>
          <Input required type="number" min="1" placeholder="Value" value={form.discountValue} onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))} />
          <Input type="number" min="1" placeholder="Total Limit" value={form.totalUsageLimit} onChange={(e) => setForm((f) => ({ ...f, totalUsageLimit: e.target.value }))} />
          <Input placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <Button type="submit" className="sm:col-span-2 lg:col-span-1"><Plus className="h-4 w-4" /> Create Promo</Button>
        </form>
      </Card>

      {editingId && (
        <Card className="border-amber-300 bg-amber-50/40 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">Edit Promo Code</h3>
            <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Select value={editForm.discountType} onChange={(e) => setEditForm((f) => ({ ...f, discountType: e.target.value }))}>
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="FIXED">Fixed (₹)</option>
            </Select>
            <Input type="number" min="1" placeholder="Value" value={editForm.discountValue} onChange={(e) => setEditForm((f) => ({ ...f, discountValue: e.target.value }))} />
            <Input type="number" min="1" placeholder="Total Limit (empty=∞)" value={editForm.totalUsageLimit} onChange={(e) => setEditForm((f) => ({ ...f, totalUsageLimit: e.target.value }))} />
            <Input placeholder="Description" value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
            <label className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 text-xs font-medium">
              <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.checked }))} />
              Active
            </label>
          </div>
          <Button size="sm" onClick={() => saveEdit(editingId)}>Save Promo Changes</Button>
        </Card>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-stone-500">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Discount</th>
              <th className="px-4 py-3">Usage</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {(data || []).map((p: Record<string, unknown>) => {
              const id = String(p._id);
              return (
                <tr key={id}>
                  <td className="px-4 py-3">
                    <div className="font-mono font-bold">{String(p.code)}</div>
                    {Boolean(p.description) && <div className="text-xs text-stone-500">{String(p.description)}</div>}
                  </td>
                  <td className="px-4 py-3">{String(p.discountValue)} {p.discountType === 'PERCENTAGE' ? '%' : '₹'}</td>
                  <td className="px-4 py-3">{Number(p.usedCount)} / {p.totalUsageLimit ? String(p.totalUsageLimit) : '∞'}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.isActive ? 'ACTIVE' : 'SUSPENDED'} /></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => startEdit(p)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toggleActive(id, Boolean(p.isActive))}>
                        {p.isActive ? 'Disable' : 'Enable'}
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => remove(id, String(p.code))}>
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export function AdminNotificationsPage() {
  const [channelFilter, setChannelFilter] = useState<'ALL' | 'WHATSAPP' | 'EMAIL'>('ALL');
  const [audience, setAudience] = useState<'ALL_ACTIVE' | 'CHECKED_IN' | 'NOT_CHECKED_IN' | 'TICKET_TYPE'>('ALL_ACTIVE');
  const [ticketTypeId, setTicketTypeId] = useState('');
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<{
    filename: string;
    mimeType: string;
    dataUrl: string;
    sizeBytes: number;
  } | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [sending, setSending] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ['admin-notifications', channelFilter],
    queryFn: async () => {
      const qs = channelFilter === 'ALL' ? '' : `?channel=${channelFilter}`;
      return (await api.get(`/notifications${qs}`)).data;
    },
  });

  const { data: ticketTypes } = useQuery({
    queryKey: ['admin-ticket-types'],
    queryFn: async () => (await api.get('/ticket-types')).data.data,
  });

  const { data: preview, refetch: refetchPreview } = useQuery({
    queryKey: ['admin-notifications-preview', audience, ticketTypeId],
    queryFn: async () => {
      const params = new URLSearchParams({ audience });
      if (audience === 'TICKET_TYPE' && ticketTypeId) params.set('ticketTypeId', ticketTypeId);
      return (await api.get(`/notifications/recipients-preview?${params.toString()}`)).data.data;
    },
  });

  const retry = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/retry`);
      toast.success('Notification retried');
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Retry failed');
    }
  };

  const applyQuickTemplate = (preset: 'gates' | 'reminder' | 'parking') => {
    if (preset === 'gates') {
      setSubject('Gates Open at 4:30 PM — Night of Devotion');
      setMessage('Namaste {{name}},\nGates for Night of Devotion open at 4:30 PM today at Exhibition Grounds, Rajahmundry. Please keep your QR pass ({{ticketId}}) ready at the gate.');
    } else if (preset === 'reminder') {
      setSubject('Sacred Evening Reminder — Nirantaram Sanatanam');
      setMessage('Namaste {{name}},\nWe warmly await your presence for Night of Devotion (Booking {{bookingRef}}). Reach 30 minutes early for smooth darshan & seating.');
    } else {
      setSubject('Parking & VIP Gate Entry Advisory');
      setMessage('Namaste {{name}},\nDedicated parking and separate Regular/VIP QR entry lanes are active beside GAIL Office, A.V. Apparao Road.');
    }
  };

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) {
      toast.error('Please upload a PNG, JPG, WEBP, or GIF image');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error('Image must be 4 MB or smaller');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) {
        toast.error('Could not read selected image');
        return;
      }
      setAttachmentFile({
        filename: file.name,
        mimeType: file.type,
        dataUrl,
        sizeBytes: file.size,
      });
      setAttachmentUrl('');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const sendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    const channels: Array<'WHATSAPP' | 'EMAIL'> = [];
    if (sendWhatsApp) channels.push('WHATSAPP');
    if (sendEmail) channels.push('EMAIL');

    if (channels.length === 0) {
      toast.error('Select at least WhatsApp or Email channel');
      return;
    }
    if (audience === 'TICKET_TYPE' && !ticketTypeId) {
      toast.error('Select a ticket category for this audience');
      return;
    }

    const attachmentPayload = attachmentFile
      ? {
          filename: attachmentFile.filename,
          mimeType: attachmentFile.mimeType,
          dataUrl: attachmentFile.dataUrl,
        }
      : attachmentUrl.trim()
        ? {
            filename: attachmentUrl.trim().split('/').pop()?.split('?')[0] || 'flyer.png',
            url: attachmentUrl.trim(),
          }
        : undefined;

    if (
      !window.confirm(
        `Send this broadcast${attachmentPayload ? ' with image attachment' : ''} via ${channels.join(' & ')} to ${preview?.attendeeCount ?? 0} confirmed attendee(s)?`,
      )
    ) {
      return;
    }

    setSending(true);
    try {
      const res = await api.post('/notifications/broadcast', {
        channels,
        audience,
        ticketTypeId: audience === 'TICKET_TYPE' ? ticketTypeId : undefined,
        subject,
        message,
        ...(attachmentPayload ? { attachment: attachmentPayload } : {}),
      });
      const stats = res.data.data;
      toast.success(
        `Dispatched${stats.attachment ? ` (${stats.attachment.filename})` : ''}! WhatsApp sent: ${stats.whatsapp.sent}/${stats.whatsapp.attempted} • Email sent: ${stats.email.sent}/${stats.email.attempted}`,
      );
      setSubject('');
      setMessage('');
      setAttachmentFile(null);
      setAttachmentUrl('');
      refetch();
      refetchPreview();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Broadcast send failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Compose & Broadcast Card */}
      <Card className="p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-stone-900">Send Message to Attendees (WhatsApp &amp; Email)</h2>
            <p className="text-xs text-stone-500">
              Compose an announcement and deliver directly to confirmed attendees. Supports{' '}
              <code className="rounded bg-stone-100 px-1 py-0.5 text-[11px]">{'{{name}}'}</code>,{' '}
              <code className="rounded bg-stone-100 px-1 py-0.5 text-[11px]">{'{{ticketId}}'}</code>,{' '}
              <code className="rounded bg-stone-100 px-1 py-0.5 text-[11px]">{'{{bookingRef}}'}</code>.
            </p>
          </div>
          {preview && (
            <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-800">
                WhatsApp Mode: {String(preview.whatsappMode)}
              </span>
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-sky-800">
                Email Mode: {String(preview.emailMode)}
              </span>
            </div>
          )}
        </div>

        <form onSubmit={sendBroadcast} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-700">Target Audience</label>
              <Select
                value={audience}
                onChange={(e) => setAudience(e.target.value as 'ALL_ACTIVE' | 'CHECKED_IN' | 'NOT_CHECKED_IN' | 'TICKET_TYPE')}
              >
                <option value="ALL_ACTIVE">All Confirmed Attendees</option>
                <option value="NOT_CHECKED_IN">Not Yet Checked-In</option>
                <option value="CHECKED_IN">Already Checked-In Guests</option>
                <option value="TICKET_TYPE">By Ticket Category</option>
              </Select>
            </div>

            {audience === 'TICKET_TYPE' && (
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-700">Ticket Category</label>
                <Select value={ticketTypeId} onChange={(e) => setTicketTypeId(e.target.value)}>
                  <option value="">Select Category...</option>
                  {(ticketTypes || []).map((tt: Record<string, unknown>) => (
                    <option key={String(tt.id)} value={String(tt.id)}>{String(tt.name)}</option>
                  ))}
                </Select>
              </div>
            )}

            <div className="sm:col-span-2 flex flex-wrap items-end gap-3">
              <label className="flex min-h-[42px] cursor-pointer items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3.5 text-xs font-semibold text-stone-800">
                <input
                  type="checkbox"
                  checked={sendWhatsApp}
                  onChange={(e) => setSendWhatsApp(e.target.checked)}
                />
                <MessageSquare className="h-4 w-4 text-emerald-700" />
                Send WhatsApp ({preview?.uniqueWhatsAppCount ?? 0})
              </label>

              <label className="flex min-h-[42px] cursor-pointer items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3.5 text-xs font-semibold text-stone-800">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                />
                <Mail className="h-4 w-4 text-sky-700" />
                Send Email ({preview?.uniqueEmailCount ?? 0})
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-stone-500">Quick Templates:</span>
            <button type="button" onClick={() => applyQuickTemplate('gates')} className="rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 font-medium hover:bg-amber-50">
              Gates Open Update
            </button>
            <button type="button" onClick={() => applyQuickTemplate('reminder')} className="rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 font-medium hover:bg-amber-50">
              Event Reminder
            </button>
            <button type="button" onClick={() => applyQuickTemplate('parking')} className="rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 font-medium hover:bg-amber-50">
              Parking &amp; Entry Info
            </button>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-stone-700">Message Title / Email Subject</label>
            <Input
              required
              minLength={2}
              placeholder="e.g. Important Entry Update — Night of Devotion"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-stone-700">Message Body (WhatsApp &amp; Email Content)</label>
            <textarea
              required
              minLength={5}
              rows={4}
              placeholder="Namaste {{name}}, write your message to all attendees..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/20"
            />
          </div>

          <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50/70 p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-amber-700" />
                <span className="text-xs font-semibold text-stone-800">
                  Image Attachment (Optional — attached to Email &amp; WhatsApp)
                </span>
              </div>
              {(attachmentFile || attachmentUrl.trim()) && (
                <button
                  type="button"
                  onClick={() => {
                    setAttachmentFile(null);
                    setAttachmentUrl('');
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 hover:bg-red-100"
                >
                  <X className="h-3 w-3" />
                  Remove Image
                </button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:border-amber-500 hover:bg-amber-50/40">
                <Paperclip className="h-3.5 w-3.5 text-amber-700" />
                <span>{attachmentFile ? `Selected: ${attachmentFile.filename}` : 'Upload Poster / Image (PNG, JPG, WEBP ≤ 4 MB)'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={handleImagePick}
                />
              </label>

              <Input
                type="url"
                placeholder="Or paste public image URL (https://...)"
                value={attachmentUrl}
                onChange={(e) => {
                  setAttachmentUrl(e.target.value);
                  if (e.target.value.trim()) setAttachmentFile(null);
                }}
              />
            </div>

            {(attachmentFile?.dataUrl || attachmentUrl.trim()) && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 bg-white p-2.5">
                <img
                  src={attachmentFile?.dataUrl || attachmentUrl.trim()}
                  alt="Attachment preview"
                  className="h-20 w-20 rounded-lg border border-stone-200 object-cover"
                />
                <div className="text-xs text-stone-700 space-y-0.5">
                  <div className="font-semibold">
                    {attachmentFile ? attachmentFile.filename : 'External Image URL'}
                  </div>
                  <div className="text-[11px] text-stone-500">
                    {attachmentFile
                      ? `${attachmentFile.mimeType} • ${(attachmentFile.sizeBytes / 1024).toFixed(1)} KB`
                      : attachmentUrl.trim()}
                  </div>
                  <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    <Paperclip className="h-3 w-3" />
                    Attached to WhatsApp &amp; Email
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-stone-500">
              Matching active attendees: <strong>{preview?.attendeeCount ?? 0}</strong>
            </span>
            <Button type="submit" disabled={sending || !preview?.attendeeCount}>
              <Send className="h-4 w-4" />
              {sending ? 'Sending Broadcast...' : 'Send Broadcast Message'}
            </Button>
          </div>
        </form>
      </Card>

      {/* 2. Delivery Logs Table */}
      <Card className="overflow-x-auto">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 px-4 py-3">
          <h3 className="text-sm font-bold text-stone-900">Message &amp; Ticket Delivery Logs</h3>
          <div className="flex gap-1.5 text-xs">
            {(['ALL', 'WHATSAPP', 'EMAIL'] as const).map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => setChannelFilter(ch)}
                className={`rounded-lg px-2.5 py-1 font-semibold ${
                  channelFilter === ch ? 'bg-amber-700 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                {ch}
              </button>
            ))}
          </div>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-stone-500">
            <tr>
              <th className="px-4 py-3">Channel</th>
              <th className="px-4 py-3">Template / Subject</th>
              <th className="px-4 py-3">Recipient</th>
              <th className="px-4 py-3">Booking</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {(data?.data || []).map((n: Record<string, unknown>) => (
              <tr key={String(n._id)}>
                <td className="px-4 py-3 font-semibold">{String(n.channel)}</td>
                <td className="px-4 py-3 text-xs">
                  <div className="font-semibold text-stone-800">{String(n.subject || n.templateType)}</div>
                  <div className="max-w-xs truncate text-stone-500">{String(n.messagePreview)}</div>
                  {Boolean(n.hasAttachment) && (
                    <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                      <Paperclip className="h-3 w-3" />
                      {String(n.attachmentName || 'Image attached')}
                      {Number(n.attachmentCount || 0) > 1 ? ` (+${Number(n.attachmentCount) - 1})` : ''}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">{String(n.recipient)}</td>
                <td className="px-4 py-3 font-mono text-xs">{String(n.bookingReference || '—')}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={String(n.status)} />
                  {Boolean(n.lastError) && (
                    <div className="mt-1 max-w-[180px] truncate text-[10px] text-red-600">{String(n.lastError)}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Button size="sm" variant="outline" onClick={() => retry(String(n._id))}>Resend</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export function AdminReportsPage() {
  const download = async (type: string) => {
    try {
      const res = await api.get(`/reports/export/${type}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8;' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `eventflow-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Exported ${type} CSV`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Report export failed');
    }
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {[
        { type: 'bookings', title: 'Bookings & Revenue Ledger (CSV)' },
        { type: 'attendees', title: 'Attendee Roster (CSV)' },
        { type: 'checkins', title: 'Gate Check-in Audit Trail (CSV)' },
        { type: 'payments', title: 'Payment & Refund Reconciliation (CSV)' },
      ].map((r) => (
        <Card key={r.type} className="flex items-center justify-between p-6">
          <div>
            <h3 className="font-bold text-stone-900">{r.title}</h3>
            <p className="text-xs text-stone-500">Live MongoDB export</p>
          </div>
          <Button variant="outline" onClick={() => download(r.type)}>
            <Download className="h-4 w-4" /> Export
          </Button>
        </Card>
      ))}
    </div>
  );
}

export function AdminSupportPage() {
  const { data, refetch } = useQuery({
    queryKey: ['admin-support'],
    queryFn: async () => (await api.get('/support')).data,
  });
  const [form, setForm] = useState({
    category: 'TICKET_ISSUE',
    subject: '',
    description: '',
    priority: 'MEDIUM',
    bookingReference: '',
    contactName: '',
    contactMobile: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ status: 'OPEN', priority: 'MEDIUM', resolution: '' });

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/support', {
        ...form,
        bookingReference: form.bookingReference.trim() || undefined,
      });
      toast.success('Support ticket created');
      setForm({
        category: 'TICKET_ISSUE',
        subject: '',
        description: '',
        priority: 'MEDIUM',
        bookingReference: '',
        contactName: '',
        contactMobile: '',
      });
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Creation failed');
    }
  };

  const resolve = async (id: string) => {
    const resolution = window.prompt('Resolution summary:');
    if (!resolution) return;
    try {
      await api.patch(`/support/${id}`, { status: 'RESOLVED', resolution });
      toast.success('Support ticket resolved');
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Resolve failed');
    }
  };

  const startEdit = (s: Record<string, unknown>) => {
    setEditingId(String(s._id));
    setEditForm({
      status: String(s.status || 'OPEN'),
      priority: String(s.priority || 'MEDIUM'),
      resolution: String(s.resolution || ''),
    });
  };

  const saveEdit = async (id: string) => {
    try {
      await api.patch(`/support/${id}`, editForm);
      toast.success('Support ticket updated');
      setEditingId(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const remove = async (id: string, refCode: string) => {
    if (!window.confirm(`Delete support ticket "${refCode}"?`)) return;
    try {
      await api.delete(`/support/${id}`);
      toast.success('Support ticket deleted');
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <h2 className="text-base font-bold">Log Support Ticket</h2>
        <form onSubmit={create} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input required placeholder="Category (e.g. TICKET_ISSUE)" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
          <Input required placeholder="Subject" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
          <Select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="URGENT">URGENT</option>
          </Select>
          <Input placeholder="Booking Ref (optional)" value={form.bookingReference} onChange={(e) => setForm((f) => ({ ...f, bookingReference: e.target.value }))} />
          <Input required placeholder="Contact Name" value={form.contactName} onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))} />
          <Input required placeholder="Contact Mobile" value={form.contactMobile} onChange={(e) => setForm((f) => ({ ...f, contactMobile: e.target.value }))} />
          <Input required minLength={10} className="sm:col-span-2" placeholder="Issue details (min 10 chars)" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <Button type="submit" className="sm:col-span-2 lg:col-span-4 w-full sm:w-auto justify-self-start"><Plus className="h-4 w-4" /> Create Ticket</Button>
        </form>
      </Card>

      {editingId && (
        <Card className="border-amber-300 bg-amber-50/40 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">Update Support Ticket</h3>
            <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Select value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}>
              <option value="OPEN">OPEN</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="CLOSED">CLOSED</option>
            </Select>
            <Select value={editForm.priority} onChange={(e) => setEditForm((f) => ({ ...f, priority: e.target.value }))}>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="URGENT">URGENT</option>
            </Select>
            <Input placeholder="Resolution note" value={editForm.resolution} onChange={(e) => setEditForm((f) => ({ ...f, resolution: e.target.value }))} />
          </div>
          <Button size="sm" onClick={() => saveEdit(editingId)}>Save Ticket</Button>
        </Card>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-stone-500">
            <tr>
              <th className="px-4 py-3">Ref</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {(data?.data || []).map((s: Record<string, unknown>) => {
              const id = String(s._id);
              return (
                <tr key={id}>
                  <td className="px-4 py-3 font-mono text-xs font-bold">{String(s.reference)}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{String(s.subject)}</div>
                    <div className="text-xs text-stone-500">{String(s.category)}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">{String(s.contactName)} • {String(s.contactMobile)}</td>
                  <td className="px-4 py-3"><StatusBadge status={String(s.priority)} /></td>
                  <td className="px-4 py-3"><StatusBadge status={String(s.status)} /></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => startEdit(s)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      {s.status !== 'RESOLVED' && (
                        <Button size="sm" variant="outline" onClick={() => resolve(id)}>Resolve</Button>
                      )}
                      <Button size="sm" variant="danger" onClick={() => remove(id, String(s.reference))}>
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export function AdminAuditLogsPage() {
  const { data } = useQuery({
    queryKey: ['admin-audit'],
    queryFn: async () => (await api.get('/audit')).data,
  });

  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-stone-500">
          <tr>
            <th className="px-4 py-3">Timestamp</th>
            <th className="px-4 py-3">Actor</th>
            <th className="px-4 py-3">Action</th>
            <th className="px-4 py-3">Entity</th>
            <th className="px-4 py-3">Result</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {(data?.data || []).map((a: Record<string, unknown>) => (
            <tr key={String(a._id)}>
              <td className="px-4 py-3 text-xs text-stone-500">{new Date(String(a.createdAt)).toLocaleString('en-IN')}</td>
              <td className="px-4 py-3 text-xs">{String(a.actorEmail || a.actorRole)}</td>
              <td className="px-4 py-3 font-mono text-xs font-bold">{String(a.action)}</td>
              <td className="px-4 py-3 text-xs">{String(a.entityType)} {a.entityReference ? `(${a.entityReference})` : ''}</td>
              <td className="px-4 py-3"><StatusBadge status={String(a.result)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

export function AdminEmergencyPage() {
  const [announcement, setAnnouncement] = useState('');
  const [banner, setBanner] = useState('');

  const runEmergency = async (action: string, extra?: Record<string, string>) => {
    if (!window.confirm(`Confirm emergency action: ${action}?`)) return;
    try {
      await api.post('/system/emergency', { action, confirm: true, ...extra });
      toast.success(`Executed ${action}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Emergency action failed');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-red-300 bg-red-50/60 p-6">
        <div className="flex items-center gap-3 text-red-900">
          <AlertOctagon className="h-6 w-6 text-red-600" />
          <div>
            <h2 className="text-lg font-bold">Emergency Operations Controls</h2>
            <p className="text-xs">Every action requires confirmation and is permanently recorded in the audit log.</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="danger" onClick={() => runEmergency('PAUSE_SALES')}>Pause Ticket Sales</Button>
          <Button variant="outline" onClick={() => runEmergency('RESUME_SALES')}>Resume Ticket Sales</Button>
          <Button variant="danger" onClick={() => runEmergency('DISABLE_CHECKOUT')}>Disable Checkout</Button>
          <Button variant="outline" onClick={() => runEmergency('ENABLE_CHECKOUT')}>Enable Checkout</Button>
          <Button variant="danger" onClick={() => runEmergency('SUSPEND_ALL_STAFF')}>Suspend All Staff</Button>
          <Button variant="danger" onClick={() => runEmergency('DISABLE_ALL_DEVICES')}>Disable All Scanners</Button>
        </div>
      </Card>

      <Card className="p-6 space-y-3">
        <h3 className="font-bold">Broadcast Public Event Announcement / Banner</h3>
        <Input placeholder="Top banner notice..." value={banner} onChange={(e) => setBanner(e.target.value)} />
        <Input placeholder="Hero emergency announcement..." value={announcement} onChange={(e) => setAnnouncement(e.target.value)} />
        <Button onClick={() => runEmergency('SET_ANNOUNCEMENT', { banner, announcement })}>
          <ShieldAlert className="h-4 w-4" /> Publish Notice
        </Button>
      </Card>
    </div>
  );
}

export function AdminSystemSettingsPage() {
  const { data, refetch } = useQuery({
    queryKey: ['admin-system-status'],
    queryFn: async () => (await api.get('/system/status')).data.data,
  });
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const changeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match');
      return;
    }
    setChangingPassword(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      clearSavedCredentials('admin');
      toast.success('Admin password changed! Please sign in with your new password.');
      window.location.href = '/admin/login';
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const reconcile = async () => {
    try {
      const res = await api.post('/system/reconcile-inventory');
      toast.success(`Reconciled inventory (expired ${res.data.data.expiredReservations} stale reservations)`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Inventory reconciliation failed');
    }
  };

  const recoverTickets = async () => {
    try {
      const res = await api.post('/system/recover-tickets');
      toast.success(`Recovered ${res.data.data.recoveredCount} booking(s)`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ticket recovery failed');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6 space-y-3">
        <h2 className="text-lg font-bold">System Modes &amp; Adapters</h2>
        {data && (
          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl bg-stone-50 p-3"><strong>Payment:</strong> {data.modes.payment}</div>
            <div className="rounded-xl bg-stone-50 p-3"><strong>WhatsApp:</strong> {data.modes.whatsapp}</div>
            <div className="rounded-xl bg-stone-50 p-3"><strong>Email:</strong> {data.modes.email}</div>
            <div className="rounded-xl bg-stone-50 p-3"><strong>Storage:</strong> {data.modes.storage}</div>
            <div className="rounded-xl bg-stone-50 p-3"><strong>Queue:</strong> {data.modes.queue}</div>
            <div className="rounded-xl bg-stone-50 p-3"><strong>Failed Ticket Gen:</strong> {data.recovery.failedTicketGenerations}</div>
          </div>
        )}
      </Card>

      <Card className="p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-amber-700" />
          <div>
            <h3 className="text-base font-bold text-stone-900">Change Admin Password</h3>
            <p className="text-xs text-stone-500">
              Update your Admin account password. To change Staff passwords, use the Staff &amp; Access tab.
            </p>
          </div>
        </div>
        <form onSubmit={changeAdminPassword} className="grid gap-3 sm:grid-cols-3">
          <Input
            required
            type="password"
            placeholder="Current Password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <Input
            required
            minLength={8}
            type="password"
            placeholder="New Password (min 8 chars)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input
            required
            minLength={8}
            type="password"
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <div className="sm:col-span-3 flex justify-end">
            <Button type="submit" disabled={changingPassword}>
              {changingPassword ? 'Updating Password...' : 'Update Admin Password'}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:flex-wrap sm:p-6">
        <Button variant="outline" onClick={reconcile}>
          <RefreshCw className="h-4 w-4" /> Reconcile Inventory & Expire Reservations
        </Button>
        <Button onClick={recoverTickets}>
          Recover Failed Paid Booking Tickets
        </Button>
      </Card>
    </div>
  );
}
