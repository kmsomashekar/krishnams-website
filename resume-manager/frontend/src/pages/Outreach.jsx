import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const CHANNEL_LABELS = {
  LINKEDIN: 'LinkedIn',
  WHATSAPP: 'WhatsApp',
  EMAIL: 'Email',
  PHONE: 'Phone',
  REFERRAL: 'Referral',
  OTHER: 'Other'
};

async function fetchOutreach() {
  const res = await fetch('/api/v1/outreach');
  if (!res.ok) throw new Error('Failed to fetch outreach logs');
  const body = await res.json();
  if (!body.success) throw new Error(body.error?.message || 'Failed to load outreach logs');
  return body.data.outreach || [];
}

async function createOutreach(payload) {
  const res = await fetch('/api/v1/outreach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.error?.message || 'Failed to create outreach entry');
  return body.data;
}

async function updateOutreach({ id, ...payload }) {
  const res = await fetch(`/api/v1/outreach/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.error?.message || 'Failed to update outreach entry');
  return body.data;
}

async function deleteOutreach(id) {
  const res = await fetch(`/api/v1/outreach/${id}`, {
    method: 'DELETE'
  });
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.error?.message || 'Failed to delete outreach entry');
  return body.data;
}

export default function Outreach() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    contact_date: new Date().toISOString().split('T')[0],
    person_name: '',
    company: '',
    email: '',
    channel: 'LINKEDIN',
    notes: ''
  });

  const { data: outreachList = [], isLoading, isError, error } = useQuery({
    queryKey: ['outreach'],
    queryFn: fetchOutreach
  });

  const createMutation = useMutation({
    mutationFn: createOutreach,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outreach'] });
      queryClient.invalidateQueries({ queryKey: ['outreach-summary'] });
      closeModal();
    },
    onError: (err) => setErrorMsg(err.message)
  });

  const updateMutation = useMutation({
    mutationFn: updateOutreach,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outreach'] });
      queryClient.invalidateQueries({ queryKey: ['outreach-summary'] });
      closeModal();
    },
    onError: (err) => setErrorMsg(err.message)
  });

  const deleteMutation = useMutation({
    mutationFn: deleteOutreach,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outreach'] });
      queryClient.invalidateQueries({ queryKey: ['outreach-summary'] });
    },
    onError: (err) => alert(err.message)
  });

  const openAddModal = () => {
    setEditingRecord(null);
    setFormData({
      contact_date: new Date().toISOString().split('T')[0],
      person_name: '',
      company: '',
      email: '',
      channel: 'LINKEDIN',
      notes: ''
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (record) => {
    setEditingRecord(record);
    setFormData({
      contact_date: record.contact_date || '',
      person_name: record.person_name || '',
      company: record.company || '',
      email: record.email || '',
      channel: record.channel || 'LINKEDIN',
      notes: record.notes || ''
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
    setErrorMsg('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Optional email format validation
    if (formData.email && formData.email.trim().length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        setErrorMsg('Please enter a valid email address format.');
        return;
      }
    }

    const payload = {
      ...formData,
      company: formData.company ? formData.company.trim() : null,
      email: formData.email ? formData.email.trim() : null,
      notes: formData.notes ? formData.notes.trim() : null
    };

    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[400px] space-y-3">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 text-sm font-medium">Loading outreach log...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-lg shadow-sm">
        <h3 className="text-base font-semibold mb-1">Unable to load outreach log</h3>
        <p className="text-sm opacity-90">{error?.message || 'An error occurred.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Outreach Log</h1>
          <p className="text-slate-500 text-sm mt-1">Track networking and informal outreach activities</p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 shadow-sm transition-colors"
        >
          + Add Outreach
        </button>
      </div>

      {/* Table */}
      {outreachList.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center shadow-sm">
          <h3 className="text-lg font-medium text-slate-900">No outreach records yet</h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto mt-2">
            Log your networking interactions, messages, and calls to keep track of your outreach.
          </p>
          <div className="mt-6">
            <button
              onClick={openAddModal}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-500 shadow-sm transition-colors"
            >
              Add First Outreach
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                  <th className="py-3.5 px-4 md:px-6">Date</th>
                  <th className="py-3.5 px-4">Person</th>
                  <th className="py-3.5 px-4">Company</th>
                  <th className="py-3.5 px-4">Channel</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Notes</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {outreachList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-4 md:px-6 font-medium text-slate-900 whitespace-nowrap">
                      {item.contact_date}
                    </td>
                    <td className="py-4 px-4 font-semibold text-slate-900">
                      {item.person_name}
                    </td>
                    <td className="py-4 px-4 text-slate-600">
                      {item.company || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full bg-indigo-50 text-indigo-700">
                        {CHANNEL_LABELS[item.channel] || item.channel}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-600">
                      {item.email ? (
                        <a href={`mailto:${item.email}`} className="text-indigo-600 hover:underline">
                          {item.email}
                        </a>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-slate-600 max-w-xs truncate" title={item.notes || ''}>
                      {item.notes || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-4 px-4 text-right space-x-3 whitespace-nowrap">
                      <button
                        onClick={() => openEditModal(item)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete outreach record for ${item.person_name}?`)) {
                            deleteMutation.mutate(item.id);
                          }
                        }}
                        className="text-xs font-semibold text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 max-w-lg w-full p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingRecord ? 'Edit Outreach Entry' : 'Add Outreach Entry'}
              </h3>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg text-sm">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Contact Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.contact_date}
                    onChange={(e) => setFormData({ ...formData, contact_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Channel *
                  </label>
                  <select
                    value={formData.channel}
                    onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                  >
                    <option value="LINKEDIN">LinkedIn</option>
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="EMAIL">Email</option>
                    <option value="PHONE">Phone</option>
                    <option value="REFERRAL">Referral</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Person Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.person_name}
                  onChange={(e) => setFormData({ ...formData, person_name: e.target.value })}
                  placeholder="e.g. Jane Doe"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Company (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="e.g. Acme Corp"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="jane@example.com"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Summary of conversation or next steps..."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}