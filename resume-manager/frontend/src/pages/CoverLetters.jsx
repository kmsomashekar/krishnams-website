import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// --- VISUAL BADGE STYLE MAPS ---
const STATUS_STYLES = {
  DRAFT: 'bg-slate-100 text-slate-800 border-slate-200',
  FINAL: 'bg-emerald-50 text-emerald-700 border-emerald-200'
};

// --- HUMAN-READABLE LOCALIZED DATE HELPER ---
function formatHumanDate(isoString) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '—';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

// --- SINGLE-PASS API RESPONSE PARSER ---
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

// --- API ACTIONS ---
async function fetchGlobalCoverLetters() {
  const res = await fetch('/api/v1/cover-letters');
  return handleResponse(res, 'Failed to retrieve the cover letters list.');
}

async function fetchCoverLetterDetail(id) {
  const res = await fetch(`/api/v1/cover-letters/${id}`);
  return handleResponse(res, 'Failed to fetch complete cover letter details.');
}

async function fetchCompaniesList() {
  const res = await fetch('/api/v1/companies');
  return handleResponse(res, 'Failed to retrieve the companies index.');
}

async function createCoverLetter(payload) {
  const res = await fetch('/api/v1/cover-letters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleResponse(res, 'Failed to create new cover letter.');
}

async function updateCoverLetter({ id, payload }) {
  const res = await fetch(`/api/v1/cover-letters/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleResponse(res, 'Failed to update cover letter.');
}

async function deleteCoverLetter(id) {
  const res = await fetch(`/api/v1/cover-letters/${id}`, {
    method: 'DELETE'
  });
  return handleResponse(res, 'Failed to delete cover letter.');
}

export default function CoverLetters() {
  const queryClient = useQueryClient();

  // --- STATE FOR FILTERING, SEARCH, AND MODALS ---
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [selectedLetterId, setSelectedLetterId] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // --- FORM STATES ---
  const [addForm, setAddForm] = useState({
    company_id: '',
    title: '',
    content: '',
    status: 'DRAFT'
  });

  const [editForm, setEditForm] = useState({
    title: '',
    content: '',
    status: 'DRAFT'
  });

  const [actionError, setActionError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // --- REACT QUERY PIPELINE ---
  const {
    data: globalListData,
    isLoading: isListLoading,
    isError: isListError,
    error: listError
  } = useQuery({
    queryKey: ['cover-letters'],
    queryFn: fetchGlobalCoverLetters
  });

  const coverLettersList = globalListData?.cover_letters || [];

  const {
    data: companiesData,
    isLoading: isCompaniesLoading
  } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompaniesList,
    enabled: isAddOpen
  });

  const companiesList = companiesData?.companies || [];

  const {
    data: activeDetail,
    isLoading: isDetailLoading,
    isError: isDetailError,
    error: detailError
  } = useQuery({
    queryKey: ['cover-letter-details', selectedLetterId],
    queryFn: () => fetchCoverLetterDetail(selectedLetterId),
    enabled: !!selectedLetterId && isDetailOpen
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createCoverLetter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cover-letters'] });
      setIsAddOpen(false);
      triggerSuccess('Cover letter added successfully.');
    },
    onError: (err) => {
      setActionError(err.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: updateCoverLetter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cover-letters'] });
      queryClient.invalidateQueries({ queryKey: ['cover-letter-details', selectedLetterId] });
      setIsEditMode(false);
      triggerSuccess('Cover letter updated successfully.');
    },
    onError: (err) => {
      setActionError(err.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCoverLetter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cover-letters'] });
      setIsDetailOpen(false);
      triggerSuccess('Cover letter deleted successfully.');
    },
    onError: (err) => {
      alert(`Deletion failed: ${err.message}`);
    }
  });

  // --- FEEDBACK CONTROL HELPERS ---
  const triggerSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // --- COMPUTE SUMMARY STATS FROM LIST ---
  const totalCount = coverLettersList.length;
  const draftCount = coverLettersList.filter(cl => cl.status === 'DRAFT').length;
  const finalCount = coverLettersList.filter(cl => cl.status === 'FINAL').length;

  // Filter out companies that already have an existing cover letter mapping
  const existingCompanyIds = new Set(coverLettersList.map(cl => cl.company_id));
  const availableCompanies = companiesList.filter(c => !existingCompanyIds.has(c.id));

  // --- CLIENT SIDE FILTERING ---
  const filteredCoverLetters = coverLettersList.filter(cl => {
    const companyName = (cl.company?.name || '').toLowerCase();
    const letterTitle = (cl.title || '').toLowerCase();
    const cleanSearch = searchQuery.toLowerCase();

    const matchesSearch = companyName.includes(cleanSearch) || letterTitle.includes(cleanSearch);
    const matchesStatus = statusFilter === 'ALL' || cl.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // --- INTERFACE BOUNDARY HANDLERS ---
  const handleOpenAddModal = () => {
    setAddForm({ company_id: '', title: '', content: '', status: 'DRAFT' });
    setActionError(null);
    setIsAddOpen(true);
  };

  const handleCompanySelectChange = (e) => {
    const compId = e.target.value;
    const selectedComp = companiesList.find(c => c.id === compId);
    const defaultTitle = selectedComp ? `Cover Letter - ${selectedComp.name}` : '';
    
    setAddForm(prev => ({
      ...prev,
      company_id: compId,
      title: defaultTitle
    }));
  };

  const handleOpenDetails = (id) => {
    setSelectedLetterId(id);
    setIsEditMode(false);
    setActionError(null);
    setIsDetailOpen(true);
  };

  const handleStartEdit = () => {
    if (!activeDetail) return;
    setEditForm({
      title: activeDetail.title || '',
      content: activeDetail.content || '',
      status: activeDetail.status || 'DRAFT'
    });
    setActionError(null);
    setIsEditMode(true);
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    setActionError(null);

    if (!addForm.company_id) {
      setActionError('Selecting a target company is required.');
      return;
    }
    if (!addForm.title.trim()) {
      setActionError('Cover letter title is required.');
      return;
    }

    createMutation.mutate({
      company_id: addForm.company_id,
      title: addForm.title.trim(),
      content: addForm.content.trim(),
      status: addForm.status
    });
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    setActionError(null);

    if (!editForm.title.trim()) {
      setActionError('Cover letter title is required.');
      return;
    }

    updateMutation.mutate({
      id: selectedLetterId,
      payload: {
        title: editForm.title.trim(),
        content: editForm.content.trim(),
        status: editForm.status
      }
    });
  };

  const handleDeleteClick = (id, title) => {
    if (window.confirm(`Delete this cover letter? This action cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  };

  if (isListLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[300px] space-y-3 bg-white border border-slate-200 rounded-xl">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 text-xs font-medium">Loading cover letters profile registry...</p>
      </div>
    );
  }

  if (isListError) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-6 rounded-xl shadow-sm">
        <h3 className="font-bold text-sm">Unable to load cover letters</h3>
        <p className="text-xs opacity-95 mt-1">{listError?.message || 'A network error disrupted database retrieval processes.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cover Letters</h1>
          <p className="text-slate-500 text-sm mt-1">Manage one tailored cover letter for each company.</p>
        </div>
        <button
          type="button"
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-500 shadow-sm transition-colors self-start sm:self-auto"
        >
          + Add Cover Letter
        </button>
      </div>

      {/* Operation Context Toast Signals */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-md text-sm shadow-sm">
          {successMessage}
        </div>
      )}

      {/* Summary Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Cover Letters</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</div>
        </div>
        <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm">
          <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Draft</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{draftCount}</div>
        </div>
        <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm">
          <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Final</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{finalCount}</div>
        </div>
      </div>

      {/* Search and Filters Segment Controls */}
      <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="w-full sm:max-w-xs">
          <input
            type="text"
            placeholder="Search company or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 rounded-md border border-slate-300 text-sm focus:border-indigo-500 focus:outline-none font-medium"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-auto rounded-md border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-700 bg-white focus:outline-indigo-500"
        >
          <option value="ALL">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="FINAL">Final</option>
        </select>
      </div>

      {/* Primary Listings Data Canvas */}
      {totalCount === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm space-y-3">
          <p className="text-slate-700 font-bold text-sm">No cover letters yet.</p>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-500 transition-colors"
          >
            + Add Cover Letter
          </button>
        </div>
      ) : filteredCoverLetters.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
          <p className="text-slate-500 text-sm font-medium">No matching cover letters found.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs whitespace-nowrap sm:whitespace-normal">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Company Name</th>
                  <th className="py-3 px-4">Document Title</th>
                  <th className="py-3 px-4 w-28">Status</th>
                  <th className="py-3 px-4 w-36">Last Updated</th>
                  <th className="py-3 px-4 w-40 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredCoverLetters.map((cl) => (
                  <tr key={cl.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {cl.company?.name || 'Company unavailable'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-800 font-semibold truncate max-w-xs">
                      {cl.title}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider border uppercase ${STATUS_STYLES[cl.status] || STATUS_STYLES.DRAFT}`}>
                        {cl.status === 'FINAL' ? 'Final' : 'Draft'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {formatHumanDate(cl.updated_at)}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleOpenDetails(cl.id)}
                        className="px-2.5 py-1 rounded text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                      >
                        View / Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(cl.id, cl.title)}
                        className="px-2.5 py-1 rounded text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
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

      {/* FORM MODAL PANEL 1: ADD COVER LETTER */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-xl rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-3.5 border-b border-slate-150 bg-slate-50 flex justify-between items-center shrink-0">
              <h3 className="text-sm font-bold text-slate-900">Create Cover Letter</h3>
              <button
                type="button"
                onClick={() => { if (!createMutation.isPending) setIsAddOpen(false); }}
                disabled={createMutation.isPending}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm disabled:opacity-40"
              >
                ×
              </button>
            </div>

            {actionError && (
              <div className="mx-5 mt-4 bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-lg text-xs font-semibold shrink-0">
                {actionError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Target Company *</label>
                {isCompaniesLoading ? (
                  <select disabled className="w-full rounded border border-slate-300 px-2.5 py-1.5 bg-slate-50 text-slate-400">
                    <option>Loading companies index...</option>
                  </select>
                ) : availableCompanies.length === 0 ? (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded text-[11px] font-medium">
                    Every company already has a cover letter.
                  </div>
                ) : (
                  <select
                    required
                    disabled={createMutation.isPending}
                    value={addForm.company_id}
                    onChange={handleCompanySelectChange}
                    className="w-full rounded border border-slate-300 px-2.5 py-1.5 focus:outline-indigo-500 bg-white"
                  >
                    <option value="">-- Choose Corporate Target Profile --</option>
                    {availableCompanies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  disabled={createMutation.isPending || !addForm.company_id}
                  placeholder="e.g. Cover Letter - Toradex"
                  value={addForm.title}
                  onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-1.5 focus:outline-indigo-500 disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Status Lifecycle Context</label>
                <select
                  disabled={createMutation.isPending || !addForm.company_id}
                  value={addForm.status}
                  onChange={(e) => setAddForm({ ...addForm, status: e.target.value })}
                  className="w-full rounded border border-slate-300 px-2.5 py-1.5 focus:outline-indigo-500 bg-white disabled:bg-slate-50"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="FINAL">Final</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Document Content Context</label>
                <textarea
                  rows="10"
                  disabled={createMutation.isPending || !addForm.company_id}
                  placeholder="Add any useful notes or append the complete body copy details here..."
                  value={addForm.content}
                  onChange={(e) => setAddForm({ ...addForm, content: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-1.5 focus:outline-indigo-500 font-mono text-slate-800 resize-none disabled:bg-slate-50"
                />
              </div>

              <div className="pt-3 border-t border-slate-150 flex justify-end space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  disabled={createMutation.isPending}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || !addForm.company_id}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded hover:bg-indigo-500 shadow-sm transition-colors disabled:opacity-40"
                >
                  {createMutation.isPending ? 'Saving...' : 'Save Cover Letter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FORM MODAL PANEL 2: VIEW / EDIT SPECIFICATIONS */}
      {isDetailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
              <h3 className="text-sm font-bold text-slate-900">
                {isEditMode ? 'Edit Cover Letter Parameters' : 'Cover Letter Workspace View'}
              </h3>
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ×
              </button>
            </div>

            {actionError && (
              <div className="mx-6 mt-4 bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-lg text-xs font-semibold shrink-0">
                {actionError}
              </div>
            )}

            <div className="p-6 overflow-y-auto flex-1 text-xs">
              {isDetailLoading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-2">
                  <div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  <p className="text-slate-500 text-[11px] font-medium">Extracting specification data block details...</p>
                </div>
              ) : isDetailError || !activeDetail ? (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-lg">
                  <h4 className="font-bold">Unable to load cover letter data</h4>
                  <p className="opacity-95 mt-1">{detailError?.message || 'Data alignment sync mismatch.'}</p>
                </div>
              ) : !isEditMode ? (
                
                // --- VIEW SUB-PANEL PRESENTATION MODE ---
                <div className="space-y-5">
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Corporate Association</h4>
                    <div className="text-sm font-extrabold text-slate-900 mt-0.5">{activeDetail.company?.name || 'Company unavailable'}</div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-medium text-slate-700">
                    <div>
                      <span className="block font-bold text-slate-400 text-[10px] uppercase tracking-wider">Document Title</span>
                      <span className="text-slate-900 font-bold block text-sm mt-1">{activeDetail.title}</span>
                    </div>
                    <div>
                      <span className="block font-bold text-slate-400 text-[10px] uppercase tracking-wider">Status Badge</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase mt-1 tracking-wide ${STATUS_STYLES[activeDetail.status] || STATUS_STYLES.DRAFT}`}>
                        {activeDetail.status === 'FINAL' ? 'Final' : 'Draft'}
                      </span>
                    </div>
                    <div>
                      <span className="block font-bold text-slate-400 text-[10px] uppercase tracking-wider">Created</span>
                      <span className="text-slate-900 font-semibold block mt-0.5">{formatHumanDate(activeDetail.created_at)}</span>
                    </div>
                    <div>
                      <span className="block font-bold text-slate-400 text-[10px] uppercase tracking-wider">Last Updated</span>
                      <span className="text-slate-900 font-semibold block mt-0.5">{formatHumanDate(activeDetail.updated_at)}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 space-y-1.5 font-medium">
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Document Body Context</h5>
                    {activeDetail.content ? (
                      <p className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-slate-800 whitespace-pre-wrap leading-relaxed font-mono text-[11px]">
                        {activeDetail.content}
                      </p>
                    ) : (
                      <p className="text-slate-400 italic">No content content text available.</p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-150 flex justify-end">
                    <button
                      type="button"
                      onClick={handleStartEdit}
                      className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded transition-colors shadow-sm"
                    >
                      Edit Cover Letter
                    </button>
                  </div>
                </div>
              ) : (
                
                // --- EDIT MUTATION WORKSPACE FORM MODE ---
                <form onSubmit={handleEditSubmit} className="space-y-4 font-medium">
                  <div className="bg-slate-100 border border-slate-200 p-3 rounded-lg block text-slate-600 text-xs">
                    <span className="font-bold block text-[10px] text-slate-400 uppercase tracking-wider">Target Corporate Alignment (Read-Only)</span>
                    <span className="text-slate-900 font-bold mt-0.5 block">{activeDetail.company?.name || 'Company unavailable'}</span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Document Title *</label>
                    <input
                      type="text"
                      required
                      disabled={updateMutation.isPending}
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs focus:outline-indigo-500 disabled:bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Status Context *</label>
                    <select
                      value={editForm.status}
                      disabled={updateMutation.isPending}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs focus:outline-indigo-500 bg-white disabled:bg-slate-50"
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="FINAL">Final</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Document Content Context</label>
                    <textarea
                      rows="12"
                      disabled={updateMutation.isPending}
                      value={editForm.content}
                      onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                      className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs focus:outline-indigo-500 font-mono text-slate-800 resize-none disabled:bg-slate-50"
                    />
                  </div>

                  <div className="pt-3 border-t border-slate-150 flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => { setIsEditMode(false); setActionError(null); }}
                      disabled={updateMutation.isPending}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updateMutation.isPending}
                      className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded hover:bg-indigo-500 shadow-sm transition-colors"
                    >
                      {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}