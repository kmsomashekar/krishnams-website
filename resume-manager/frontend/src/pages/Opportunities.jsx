import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Valid backend status values
const VALID_STATUSES = [
  { value: 'CONSIDERING', label: 'Considering' },
  { value: 'APPLIED', label: 'Applied' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'INTERVIEWING', label: 'Interviewing' },
  { value: 'OFFER', label: 'Offer' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'NO_RESPONSE', label: 'No Response' }
];

// Single-pass API response parser
async function handleResponse(res, defaultErrorText) {
  let body = null;
  try {
    body = await res.json();
  } catch (_) {
    if (!res.ok) throw new Error(defaultErrorText);
    throw new Error('Invalid server response format.');
  }

  if (!res.ok || !body?.success) {
    throw new Error(body?.error?.message || defaultErrorText);
  }

  return body.data;
}

async function fetchOpportunities() {
  const res = await fetch('/api/v1/opportunities');
  return handleResponse(res, 'Failed to load opportunities.');
}

async function fetchCompanies() {
  const res = await fetch('/api/v1/companies');
  return handleResponse(res, 'Failed to load companies.');
}

async function updateOpportunityStatus({ id, status }) {
  const res = await fetch(`/api/v1/opportunities/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  return handleResponse(res, 'Failed to update opportunity status.');
}

async function createCompany(payload) {
  const res = await fetch('/api/v1/companies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleResponse(res, 'Failed to create new company.');
}

async function createOpportunity(payload) {
  const res = await fetch('/api/v1/opportunities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleResponse(res, 'Failed to create new opportunity.');
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'CONSIDERING': return 'bg-slate-100 text-slate-800 border-slate-200';
    case 'APPLIED': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'UNDER_REVIEW': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'INTERVIEWING': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'OFFER': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'REJECTED': return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'NO_RESPONSE': return 'bg-zinc-100 text-zinc-600 border-zinc-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

export default function Opportunities() {
  const queryClient = useQueryClient();

  // Search & Filters State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  
  // Modals & Feedback UI State
  const [isOppModalOpen, setIsOppModalOpen] = useState(false);
  const [isCompModalOpen, setIsCompModalOpen] = useState(false);
  const [mutationError, setMutationError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Tracks the ID of the specific opportunity row updating its status
  const [updatingOppId, setUpdatingOppId] = useState(null);

  // Form States
  const [oppForm, setOppForm] = useState({
    company_id: '',
    job_title: '',
    priority: 3,
    application_url: '',
    date_identified: '',
    date_applied: '',
    notes: ''
  });

  const [compForm, setCompForm] = useState({
    name: '',
    website: '',
    location: '',
    notes: ''
  });

  // Queries
  const {
    data: oppData,
    isLoading: isOppLoading,
    isError: isOppError,
    error: oppError
  } = useQuery({
    queryKey: ['opportunities'],
    queryFn: fetchOpportunities
  });

  const {
    data: compData,
    isLoading: isCompLoading,
    isError: isCompError,
    error: compError
  } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    enabled: isOppModalOpen
  });

  const opportunitiesList = oppData?.opportunities || [];
  const companiesList = compData?.companies || [];

  // Central Cache Management Function
  const invalidateDashboardAndLists = () => {
    queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] === 'opportunity-details'
    });
  };

  // Mutations
  const statusMutation = useMutation({
    mutationFn: updateOpportunityStatus,
    onSuccess: () => {
      invalidateDashboardAndLists();
      showSuccess('Opportunity status updated successfully.');
    },
    onError: (err) => {
      setMutationError(err.message);
    },
    onSettled: () => {
      setUpdatingOppId(null);
    }
  });

  const companyMutation = useMutation({
    mutationFn: createCompany,
    onSuccess: (newCompany) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setOppForm((prev) => ({ ...prev, company_id: newCompany.id }));
      setIsCompModalOpen(false);
      setCompForm({ name: '', website: '', location: '', notes: '' });
      showSuccess('Company added successfully.');
    },
    onError: (err) => {
      setMutationError(err.message);
    }
  });

  const opportunityMutation = useMutation({
    mutationFn: createOpportunity,
    onSuccess: () => {
      invalidateDashboardAndLists();
      setIsOppModalOpen(false);
      resetOpportunityForm();
      showSuccess('Opportunity created successfully.');
    },
    onError: (err) => {
      setMutationError(err.message);
    }
  });

  // Action Triggers
  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setMutationError(null);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const resetOpportunityForm = () => {
    setOppForm({
      company_id: '',
      job_title: '',
      priority: 3,
      application_url: '',
      date_identified: '',
      date_applied: '',
      notes: ''
    });
    setMutationError(null);
  };

  const handleStatusChange = (id, newStatus) => {
    setMutationError(null);
    setUpdatingOppId(id);
    statusMutation.mutate({ id, status: newStatus });
  };

  const handleCompanySubmit = (e) => {
    e.preventDefault();
    setMutationError(null);
    if (!compForm.name.trim()) {
      setMutationError('Company name is required.');
      return;
    }
    companyMutation.mutate({
      name: compForm.name.trim(),
      website: compForm.website.trim() || undefined,
      location: compForm.location.trim() || undefined,
      notes: compForm.notes.trim() || undefined
    });
  };

  const handleOpportunitySubmit = (e) => {
    e.preventDefault();
    setMutationError(null);
    
    if (!oppForm.company_id) {
      setMutationError('Please select or add a company.');
      return;
    }
    if (!oppForm.job_title.trim()) {
      setMutationError('Job title is required.');
      return;
    }

    // Explicit client-side validation for priority input bounds
    const parsedPriority = parseInt(oppForm.priority, 10);
    if (isNaN(parsedPriority) || parsedPriority < 1 || parsedPriority > 5) {
      setMutationError('Priority must be between 1 and 5.');
      return;
    }

    const payload = {
      company_id: oppForm.company_id,
      job_title: oppForm.job_title.trim(),
      priority: parsedPriority,
      application_url: oppForm.application_url.trim() || undefined,
      date_identified: oppForm.date_identified || undefined,
      date_applied: oppForm.date_applied || undefined,
      notes: oppForm.notes.trim() || undefined
    };

    opportunityMutation.mutate(payload);
  };

  // List processing calculations
  const filteredOpportunities = opportunitiesList
    .filter((op) => {
      const matchSearch = 
        (op.company_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (op.job_title || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || op.status === statusFilter;
      const matchPriority = priorityFilter === 'ALL' || String(op.priority) === priorityFilter;

      return matchSearch && matchStatus && matchPriority;
    })
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  const totalCount = opportunitiesList.length;
  const consideringCount = opportunitiesList.filter(o => o.status === 'CONSIDERING').length;
  const appliedCount = opportunitiesList.filter(o => o.status === 'APPLIED').length;
  const interviewingCount = opportunitiesList.filter(o => o.status === 'INTERVIEWING').length;
  const offerCount = opportunitiesList.filter(o => o.status === 'OFFER').length;

  if (isOppLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[400px] space-y-3">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 text-sm font-medium">Loading opportunities...</p>
      </div>
    );
  }

  if (isOppError) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-lg shadow-sm">
        <h3 className="text-base font-semibold mb-1">Unable to load opportunities</h3>
        <p className="text-sm opacity-90">{oppError?.message || 'An error occurred while loading your opportunities.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Opportunities</h1>
          <p className="text-slate-500 text-sm mt-1">Track and manage your job opportunities</p>
        </div>
        <button
          onClick={() => { resetOpportunityForm(); setIsOppModalOpen(true); }}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-500 shadow-sm transition-colors self-start sm:self-auto"
        >
          + Add Opportunity
        </button>
      </div>

      {/* Global Status Banner Messages */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-md text-sm shadow-sm">
          {successMessage}
        </div>
      )}
      {mutationError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-md text-sm shadow-sm">
          {mutationError}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</div>
        </div>
        <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Considering</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{consideringCount}</div>
        </div>
        <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Applied</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{appliedCount}</div>
        </div>
        <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Interviewing</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{interviewingCount}</div>
        </div>
        <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Offers</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{offerCount}</div>
        </div>
      </div>

      {/* Search and Filters Configuration Panel */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Search</label>
          <input
            type="text"
            placeholder="Search company or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none bg-white"
          >
            <option value="ALL">All Statuses</option>
            {VALID_STATUSES.map(st => <option key={st.value} value={st.value}>{st.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Priority</label>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none bg-white"
          >
            <option value="ALL">All Priorities</option>
            {[1, 2, 3, 4, 5].map(num => <option key={num} value={String(num)}>Priority {num}</option>)}
          </select>
        </div>
      </div>

      {/* Main Opportunities List Component Workspace */}
      {totalCount === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center shadow-sm">
          <h3 className="text-lg font-medium text-slate-900">No opportunities yet</h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto mt-2">
            Add your first opportunity to start tracking your job search.
          </p>
          <button
            onClick={() => { resetOpportunityForm(); setIsOppModalOpen(true); }}
            className="mt-6 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-500 shadow-sm transition-colors"
          >
            + Add Opportunity
          </button>
        </div>
      ) : filteredOpportunities.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center shadow-sm">
          <h3 className="text-base font-semibold text-slate-800">No matching opportunities</h3>
          <p className="text-slate-500 text-sm mt-1">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          {/* Desktop Table Layout View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                  <th className="py-3 px-4 lg:px-6">Company &amp; Role</th>
                  <th className="py-3 px-4 w-48">Status</th>
                  <th className="py-3 px-4 text-center w-24">Priority</th>
                  <th className="py-3 px-4 w-32">Date Applied</th>
                  <th className="py-3 px-4 w-40">Last Updated</th>
                  <th className="py-3 px-4 text-center w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredOpportunities.map((op) => {
                  const isCurrentRowUpdating = updatingOppId === op.id;
                  return (
                    <tr key={op.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-4 px-4 lg:px-6">
                        <Link to={`/opportunities/${op.id}`} className="group block">
                          <span className="font-semibold text-indigo-600 group-hover:underline block">{op.company_name}</span>
                          <span className="text-slate-500 text-xs mt-0.5 block">{op.job_title}</span>
                        </Link>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          <select
                            value={op.status}
                            disabled={updatingOppId !== null}
                            onChange={(e) => handleStatusChange(op.id, e.target.value)}
                            className={`w-full rounded border px-2 py-1 text-xs font-semibold focus:outline-indigo-500 ${getStatusBadgeClass(op.status)} ${isCurrentRowUpdating ? 'opacity-60' : ''}`}
                          >
                            {VALID_STATUSES.map(st => (
                              <option key={st.value} value={st.value} className="bg-white text-slate-900 font-normal">
                                {st.label}
                              </option>
                            ))}
                          </select>
                          {isCurrentRowUpdating && (
                            <div className="w-3 h-3 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin shrink-0"></div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center text-slate-700 font-medium">
                        {op.priority !== null && op.priority !== undefined ? `P-${op.priority}` : '—'}
                      </td>
                      <td className="py-4 px-4 text-slate-600">
                        {op.date_applied ? op.date_applied : '—'}
                      </td>
                      <td className="py-4 px-4 text-slate-400 text-xs">
                        {new Date(op.updated_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Link to={`/opportunities/${op.id}`} className="text-xs font-medium text-slate-500 hover:text-indigo-600 underline">
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Layout Card List View */}
          <div className="block md:hidden divide-y divide-slate-100">
            {filteredOpportunities.map((op) => {
              const isCurrentRowUpdating = updatingOppId === op.id;
              return (
                <div key={op.id} className="p-4 space-y-3 hover:bg-slate-50/40">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <Link to={`/opportunities/${op.id}`} className="font-semibold text-indigo-600 text-base block">
                        {op.company_name}
                      </Link>
                      <span className="text-slate-600 text-sm font-medium">{op.job_title}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded whitespace-nowrap">
                      {op.priority !== null && op.priority !== undefined ? `P-${op.priority}` : '—'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 pt-1">
                    <div>
                      <span className="block font-medium text-slate-400">Date Applied</span>
                      <span className="text-slate-700 font-medium">{op.date_applied || '—'}</span>
                    </div>
                    <div>
                      <span className="block font-medium text-slate-400">Last Updated</span>
                      <span>{new Date(op.updated_at).toLocaleDateString(undefined, { dateStyle: 'short' })}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 pt-1">
                    <div className="flex items-center space-x-2 w-full max-w-[180px]">
                      <select
                        value={op.status}
                        disabled={updatingOppId !== null}
                        onChange={(e) => handleStatusChange(op.id, e.target.value)}
                        className={`w-full rounded border px-2.5 py-1 text-xs font-semibold focus:outline-indigo-500 ${getStatusBadgeClass(op.status)} ${isCurrentRowUpdating ? 'opacity-60' : ''}`}
                      >
                        {VALID_STATUSES.map(st => (
                          <option key={st.value} value={st.value} className="bg-white text-slate-900 font-normal">
                            {st.label}
                          </option>
                        ))}
                      </select>
                      {isCurrentRowUpdating && (
                        <div className="w-3 h-3 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin shrink-0"></div>
                      )}
                    </div>
                    <Link to={`/opportunities/${op.id}`} className="text-xs font-semibold text-indigo-600 hover:underline">
                      View →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ADD OPPORTUNITY DIALOG MODAL LAYOUT */}
      {isOppModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col my-8">
            <div className="px-6 py-4 border-b border-slate-150 bg-slate-50 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900">Add Opportunity</h3>
              <button 
                onClick={() => { if (!opportunityMutation.isPending) setIsOppModalOpen(false); }}
                disabled={opportunityMutation.isPending}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold disabled:opacity-40"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleOpportunitySubmit} className="p-6 space-y-4 flex-1 overflow-y-auto max-h-[70vh]">
              {/* Company Picker Selection & Inline Load Handling */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Company *</label>
                  <button
                    type="button"
                    onClick={() => { setMutationError(null); setIsCompModalOpen(true); }}
                    disabled={opportunityMutation.isPending}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 underline disabled:opacity-50"
                  >
                    + Add New Company
                  </button>
                </div>

                {isCompLoading ? (
                  <select disabled className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-slate-50 text-slate-400 focus:outline-none">
                    <option>Loading companies...</option>
                  </select>
                ) : isCompError ? (
                  <div className="space-y-1">
                    <select disabled className="w-full rounded-md border border-rose-300 px-3 py-2 text-sm bg-rose-50 text-rose-600 focus:outline-none">
                      <option>Unable to load companies</option>
                    </select>
                    <p className="text-xs text-rose-600 font-medium">{compError?.message || 'Error occurred during retrieval.'}</p>
                  </div>
                ) : companiesList.length === 0 ? (
                  <div className="space-y-1">
                    <select
                      value={oppForm.company_id}
                      onChange={(e) => setOppForm({ ...oppForm, company_id: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none bg-white"
                      required
                    >
                      <option value="">No companies exist yet</option>
                    </select>
                    <p className="text-xs text-indigo-600 font-medium">Please select "+ Add New Company" to create one.</p>
                  </div>
                ) : (
                  <select
                    value={oppForm.company_id}
                    disabled={opportunityMutation.isPending}
                    onChange={(e) => setOppForm({ ...oppForm, company_id: e.target.value })}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none bg-white"
                    required
                  >
                    <option value="">-- Choose Existing Company --</option>
                    {companiesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Job Title *</label>
                <input
                  type="text"
                  required
                  disabled={opportunityMutation.isPending}
                  value={oppForm.job_title}
                  onChange={(e) => setOppForm({ ...oppForm, job_title: e.target.value })}
                  placeholder="e.g. Head of IT Operations"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Priority</label>
                  <select
                    value={oppForm.priority}
                    disabled={opportunityMutation.isPending}
                    onChange={(e) => setOppForm({ ...oppForm, priority: e.target.value })}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none bg-white disabled:bg-slate-50"
                  >
                    {[1, 2, 3, 4, 5].map(num => <option key={num} value={num}>Priority {num}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Application URL</label>
                  <input
                    type="url"
                    disabled={opportunityMutation.isPending}
                    value={oppForm.application_url}
                    onChange={(e) => setOppForm({ ...oppForm, application_url: e.target.value })}
                    placeholder="https://example.com/careers/job"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Date Identified</label>
                  <input
                    type="date"
                    disabled={opportunityMutation.isPending}
                    value={oppForm.date_identified}
                    onChange={(e) => setOppForm({ ...oppForm, date_identified: e.target.value })}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Date Applied</label>
                  <input
                    type="date"
                    disabled={opportunityMutation.isPending}
                    value={oppForm.date_applied}
                    onChange={(e) => setOppForm({ ...oppForm, date_applied: e.target.value })}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Notes</label>
                <textarea
                  rows="3"
                  disabled={opportunityMutation.isPending}
                  value={oppForm.notes}
                  onChange={(e) => setOppForm({ ...oppForm, notes: e.target.value })}
                  placeholder="Add any useful notes about this opportunity..."
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none resize-none disabled:bg-slate-50"
                />
              </div>

              <div className="pt-4 border-t border-slate-150 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsOppModalOpen(false)}
                  disabled={opportunityMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={opportunityMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-500 shadow-sm transition-colors disabled:opacity-60"
                >
                  {opportunityMutation.isPending ? 'Saving...' : 'Save Opportunity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INLINE ADD NEW COMPANY MODAL ACTION OVERLAY */}
      {isCompModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-150 bg-slate-50 flex justify-between items-center">
              <h4 className="text-sm font-bold text-slate-900">Add New Company</h4>
              <button 
                onClick={() => { if (!companyMutation.isPending) setIsCompModalOpen(false); }}
                disabled={companyMutation.isPending}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold disabled:opacity-40"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCompanySubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  disabled={companyMutation.isPending}
                  value={compForm.name}
                  onChange={(e) => setCompForm({ ...compForm, name: e.target.value })}
                  placeholder="e.g. Example Company"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Website URL</label>
                <input
                  type="url"
                  disabled={companyMutation.isPending}
                  value={compForm.website}
                  onChange={(e) => setCompForm({ ...compForm, website: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Location</label>
                <input
                  type="text"
                  disabled={companyMutation.isPending}
                  value={compForm.location}
                  onChange={(e) => setCompForm({ ...compForm, location: e.target.value })}
                  placeholder="e.g. Bengaluru, India or Remote"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Company Notes</label>
                <textarea
                  rows="2"
                  disabled={companyMutation.isPending}
                  value={compForm.notes}
                  onChange={(e) => setCompForm({ ...compForm, notes: e.target.value })}
                  placeholder="Add any useful notes about this company..."
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none resize-none disabled:bg-slate-50"
                />
              </div>

              <div className="pt-3 border-t border-slate-150 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCompModalOpen(false)}
                  disabled={companyMutation.isPending}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={companyMutation.isPending}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-500 shadow-sm transition-colors disabled:opacity-60"
                >
                  {companyMutation.isPending ? 'Creating...' : 'Add Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}