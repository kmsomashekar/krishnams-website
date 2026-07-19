import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

// --- VISUAL BADGE STYLE MAPS ---
const STATUS_STYLES = {
  SCHEDULED: 'bg-blue-50 text-blue-700 border-blue-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200'
};

// --- HUMAN-READABLE LOCALIZED DATE/TIME HELPERS ---
function formatHumanDateTime(isoString) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '—';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; 

  return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
}

function convertISOToDateTimeLocal(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  
  const tzoffset = date.getTimezoneOffset() * 60000;
  const localISOTime = (new Date(date.getTime() - tzoffset)).toISOString().slice(0, 16);
  return localISOTime;
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
async function fetchGlobalInterviews() {
  const res = await fetch('/api/v1/interviews');
  return handleResponse(res, 'Failed to retrieve the global interview inventory list.');
}

async function fetchInterviewDetail(id) {
  const res = await fetch(`/api/v1/interviews/${id}`);
  return handleResponse(res, 'Failed to fetch comprehensive interview specification details.');
}

async function updateInterview({ id, payload }) {
  const res = await fetch(`/api/v1/interviews/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleResponse(res, 'Failed to save updated interview configurations.');
}

async function patchInterviewStatus({ id, status }) {
  const res = await fetch(`/api/v1/interviews/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  return handleResponse(res, 'Failed to update interview status lifecycle context.');
}

export default function Interviews() {
  const queryClient = useQueryClient();

  // --- STATE FOR FILTERING, SEARCH, MODALS ---
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [timeFilter, setTimeFilter] = useState('ALL');
  
  const [selectedInterviewId, setSelectedInterviewId] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  const [editForm, setEditForm] = useState({
    round_number: 1,
    round_title: '',
    status: 'SCHEDULED',
    interview_date: '',
    interviewer_names: '',
    preparation_notes: '',
    questions_asked: '',
    feedback_notes: ''
  });
  
  const [actionError, setActionError] = useState(null);

  // --- REACT QUERY PIPELINE ---
  const { 
    data: globalListData, 
    isLoading: isListLoading, 
    isError: isListError, 
    error: listError 
  } = useQuery({
    queryKey: ['interviews'],
    queryFn: fetchGlobalInterviews
  });

  const interviewsList = globalListData?.interviews || [];

  const {
    data: activeDetail,
    isLoading: isDetailLoading,
    isError: isDetailError,
    error: detailError
  } = useQuery({
    queryKey: ['interview', selectedInterviewId],
    queryFn: () => fetchInterviewDetail(selectedInterviewId),
    enabled: !!selectedInterviewId
  });

  const updateMutation = useMutation({
    mutationFn: updateInterview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      queryClient.invalidateQueries({ queryKey: ['interview', selectedInterviewId] });
      setIsEditMode(false);
      setActionError(null);
    },
    onError: (err) => {
      setActionError(err.message);
    }
  });

  const statusPatchMutation = useMutation({
    mutationFn: patchInterviewStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      queryClient.invalidateQueries({ queryKey: ['interview', selectedInterviewId] });
      setActionError(null);
    },
    onError: (err) => {
      setActionError(err.message);
    }
  });

  // --- COMPUTE SUMMARY STATS FROM LIST ---
  const nowTime = new Date();
  const totalCount = interviewsList.length;
  
  const upcomingCount = interviewsList.filter(iv => 
    iv.status === 'SCHEDULED' && iv.interview_date && new Date(iv.interview_date) > nowTime
  ).length;
  
  const completedCount = interviewsList.filter(iv => iv.status === 'COMPLETED').length;
  const cancelledCount = interviewsList.filter(iv => iv.status === 'CANCELLED').length;

  // --- CLIENT SIDE TEXT SEARCH & DROPDOWN FILTERING ---
  const filteredInterviews = interviewsList.filter(iv => {
    const companyName = (iv.company?.name || '').toLowerCase();
    const jobTitle = (iv.opportunity?.job_title || '').toLowerCase();
    const roundTitle = (iv.round_title || '').toLowerCase();
    const interviewerName = (iv.interviewer_names || '').toLowerCase();
    const cleanSearch = searchQuery.toLowerCase();

    const matchesSearch = companyName.includes(cleanSearch) || 
                          jobTitle.includes(cleanSearch) || 
                          roundTitle.includes(cleanSearch) || 
                          interviewerName.includes(cleanSearch);

    const matchesStatus = statusFilter === 'ALL' || iv.status === statusFilter;
    
    let matchesTime = true;
    if (timeFilter === 'UPCOMING') {
      matchesTime = iv.interview_date && new Date(iv.interview_date) > nowTime;
    } else if (timeFilter === 'PAST') {
      matchesTime = iv.interview_date && new Date(iv.interview_date) <= nowTime;
    }

    return matchesSearch && matchesStatus && matchesTime;
  });

  // --- SELECTION CONTROL HANDLERS ---
  const handleOpenDetails = (id) => {
    setSelectedInterviewId(id);
    setIsEditMode(false);
    setActionError(null);
    setIsDetailOpen(true);
  };

  const handleStartEdit = () => {
    if (!activeDetail) return;
    setEditForm({
      round_number: activeDetail.round_number || 1,
      round_title: activeDetail.round_title || '',
      status: activeDetail.status || 'SCHEDULED',
      interview_date: convertISOToDateTimeLocal(activeDetail.interview_date),
      interviewer_names: activeDetail.interviewer_names || '',
      preparation_notes: activeDetail.preparation_notes || '',
      questions_asked: activeDetail.questions_asked || '',
      feedback_notes: activeDetail.feedback_notes || ''
    });
    setActionError(null);
    setIsEditMode(true);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    setActionError(null);

    const parsedRound = parseInt(editForm.round_number, 10);
    if (isNaN(parsedRound) || parsedRound < 1) {
      setActionError('Round number must be a valid integer structure >= 1.');
      return;
    }

    if (!editForm.round_title.trim()) {
      setActionError('Round title parameter configuration is required.');
      return;
    }

    if (!editForm.interview_date) {
      setActionError('Interview scheduled date and time is required.');
      return;
    }

    const payload = {
      round_number: parsedRound,
      round_title: editForm.round_title.trim(),
      status: editForm.status,
      interview_date: new Date(editForm.interview_date).toISOString(),
      interviewer_names: editForm.interviewer_names.trim() || null,
      preparation_notes: editForm.preparation_notes.trim() || null,
      questions_asked: editForm.questions_asked.trim() || null,
      feedback_notes: editForm.feedback_notes.trim() || null
    };

    updateMutation.mutate({ id: selectedInterviewId, payload });
  };

  const handleQuickStatusUpdate = (status) => {
    setActionError(null);
    statusPatchMutation.mutate({ id: selectedInterviewId, status });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Interviews</h1>
        <p className="text-slate-500 text-sm mt-1">Prepare, track, and document every interview round.</p>
      </div>

      {/* Summary Matrix Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Interviews</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</div>
        </div>
        <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm">
          <div className="text-xs font-semibold text-blue-500 uppercase tracking-wider">Upcoming</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{upcomingCount}</div>
        </div>
        <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm">
          <div className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">Completed</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{completedCount}</div>
        </div>
        <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm">
          <div className="text-xs font-semibold text-rose-500 uppercase tracking-wider">Cancelled</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{cancelledCount}</div>
        </div>
      </div>

      {/* Control Filter Toolbar */}
      <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-xs">
          <input
            type="text"
            placeholder="Search company, role, interviewer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 rounded-md border border-slate-300 text-sm focus:border-indigo-500 focus:outline-none font-medium"
          />
        </div>

        <div className="flex flex-wrap w-full md:w-auto items-center gap-3 justify-end">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto rounded-md border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-700 bg-white focus:outline-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="w-full sm:w-auto rounded-md border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-700 bg-white focus:outline-indigo-500"
          >
            <option value="ALL">All Timeline Views</option>
            <option value="UPCOMING">Upcoming Rounds</option>
            <option value="PAST">Past Rounds</option>
          </select>
        </div>
      </div>

      {/* Core Presentation Layer Grid List */}
      {isListLoading ? (
        <div className="flex flex-col justify-center items-center min-h-[300px] space-y-3 bg-white border border-slate-200 rounded-xl">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 text-xs font-medium">Loading interviews inventory database...</p>
        </div>
      ) : isListError ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-6 rounded-xl flex items-start space-x-3 shadow-sm">
          <div>
            <h3 className="font-bold text-sm">Unable to load interviews</h3>
            <p className="text-xs opacity-95 mt-1">{listError?.message || 'A network runtime error occurred.'}</p>
          </div>
        </div>
      ) : filteredInterviews.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm space-y-2">
          <p className="text-slate-700 font-bold text-sm">No interviews scheduled yet.</p>
          <p className="text-slate-400 text-xs max-w-sm mx-auto font-medium">
            Interviews created from an Opportunity profile pipeline module will appear tracked inside this grid.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs whitespace-nowrap md:whitespace-normal">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 w-40">Date &amp; Time</th>
                  <th className="py-3 px-4 w-48">Company</th>
                  <th className="py-3 px-4">Target Role</th>
                  <th className="py-3 px-4 w-48">Round</th>
                  <th className="py-3 px-4 w-44">Interviewer</th>
                  <th className="py-3 px-4 w-28">Status</th>
                  <th className="py-3 px-4 w-24 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredInterviews.map((iv) => {
                  const badgeClass = STATUS_STYLES[iv.status] || STATUS_STYLES.SCHEDULED;
                  const isUpcomingScheduled = iv.status === 'SCHEDULED' && iv.interview_date && new Date(iv.interview_date) > nowTime;
                  
                  return (
                    <tr 
                      key={iv.id} 
                      className={`hover:bg-slate-50/60 transition-colors ${
                        isUpcomingScheduled ? 'bg-indigo-50/10' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {formatHumanDateTime(iv.interview_date)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="max-w-[180px] truncate">
                          <span className="font-bold text-slate-900 truncate">{iv.company?.name || 'Company unavailable'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="max-w-[200px] truncate">
                          <span className="text-slate-800 font-semibold truncate">{iv.opportunity?.job_title || 'Untitled Position'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="max-w-[180px]">
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Round {iv.round_number || 1}</div>
                          <div className="text-slate-700 truncate font-semibold mt-0.5">{iv.round_title || 'Interview'}</div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        <div className="max-w-[160px] truncate">
                          <span className="truncate">{iv.interviewer_names || 'Not specified'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider border uppercase whitespace-nowrap ${badgeClass}`}>
                          {iv.status === 'SCHEDULED' ? 'Scheduled' : iv.status === 'COMPLETED' ? 'Completed' : 'Cancelled'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(iv.id)}
                          className="px-2.5 py-1 rounded text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors inline-flex items-center"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* COMPREHENSIVE VIEW & EDIT CONTROL DIALOG INTERFACE MODAL */}
      {isDetailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header Banner */}
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-slate-900">
                  {isEditMode ? 'Edit Interview Parameters' : 'Interview Document Workspace'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg transition-colors"
              >
                ×
              </button>
            </div>

            {/* Error Component Overlay inside form block container */}
            {actionError && (
              <div className="mx-6 mt-4 bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-lg text-xs font-semibold shrink-0">
                {actionError}
              </div>
            )}

            {/* Content Core Body Area */}
            <div className="p-6 overflow-y-auto flex-1 text-xs">
              {isDetailLoading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-2">
                  <div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  <p className="text-slate-500 text-[11px] font-medium">Extracting complete specification data block...</p>
                </div>
              ) : isDetailError || !activeDetail ? (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-lg">
                  <h4 className="font-bold">Unable to load details</h4>
                  <p className="opacity-95 mt-1">{detailError?.message || 'Data sync error encountered.'}</p>
                </div>
              ) : !isEditMode ? (
                
                // --- VIEW SUB-PANEL PRESENTATION LAYER ---
                <div className="space-y-6">
                  {/* Company & Role Meta Badge Banner Info */}
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Corporate Alignment</h4>
                      <div className="text-sm font-extrabold text-slate-900 mt-0.5">{activeDetail.company?.name || 'Company unavailable'}</div>
                      <div className="text-slate-600 text-xs font-semibold mt-0.5">{activeDetail.opportunity?.job_title || 'Untitled Position'}</div>
                    </div>
                    <Link
                      to={`/opportunities/${activeDetail.opportunity_id}`}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors shadow-sm inline-flex items-center self-start sm:self-auto"
                    >
                      View Opportunity →
                    </Link>
                  </div>

                  {/* Core Scheduling Detail Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-medium text-slate-700">
                    <div>
                      <span className="block font-bold text-slate-400 text-[10px] uppercase tracking-wider">Round Specifications</span>
                      <span className="text-slate-900 font-bold block text-xs mt-1">
                        Round {activeDetail.round_number} — {activeDetail.round_title || 'Interview'}
                      </span>
                    </div>
                    <div>
                      <span className="block font-bold text-slate-400 text-[10px] uppercase tracking-wider">Status Badge</span>
                      <div className="mt-1 flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide ${STATUS_STYLES[activeDetail.status]}`}>
                          {activeDetail.status === 'SCHEDULED' ? 'Scheduled' : activeDetail.status === 'COMPLETED' ? 'Completed' : 'Cancelled'}
                        </span>
                        
                        {/* Quick Status Modifiers for Scheduled Items */}
                        {activeDetail.status === 'SCHEDULED' && (
                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={() => handleQuickStatusUpdate('COMPLETED')}
                              className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded text-[9px] font-bold"
                            >
                              Mark Completed
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickStatusUpdate('CANCELLED')}
                              className="px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded text-[9px] font-bold"
                            >
                              Mark Cancelled
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="block font-bold text-slate-400 text-[10px] uppercase tracking-wider">Date &amp; Time Timeline Configuration</span>
                      <span className="text-slate-900 font-semibold block text-xs mt-0.5">
                        {formatHumanDateTime(activeDetail.interview_date)}
                      </span>
                    </div>
                    <div>
                      <span className="block font-bold text-slate-400 text-[10px] uppercase tracking-wider">Interviewer Name Structure</span>
                      <span className="text-slate-900 font-semibold block text-xs mt-0.5">
                        {activeDetail.interviewer_names || '—'}
                      </span>
                    </div>
                  </div>

                  {/* Comprehensive Large Text Field Areas */}
                  <div className="space-y-4 pt-4 border-t border-slate-100 font-medium">
                    <div>
                      <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Preparation Notes</h5>
                      {activeDetail.preparation_notes ? (
                        <p className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-slate-800 whitespace-pre-wrap leading-relaxed">
                          {activeDetail.preparation_notes}
                        </p>
                      ) : (
                        <p className="text-slate-400 italic">No preparation notes added.</p>
                      )}
                    </div>

                    <div>
                      <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Questions Asked</h5>
                      {activeDetail.questions_asked ? (
                        <p className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-slate-800 whitespace-pre-wrap leading-relaxed">
                          {activeDetail.questions_asked}
                        </p>
                      ) : (
                        <p className="text-slate-400 italic">No questions recorded yet.</p>
                      )}
                    </div>

                    <div>
                      <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Feedback Notes</h5>
                      {activeDetail.feedback_notes ? (
                        <p className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-slate-800 whitespace-pre-wrap leading-relaxed">
                          {activeDetail.feedback_notes}
                        </p>
                      ) : (
                        <p className="text-slate-400 italic">No feedback recorded yet.</p>
                      )}
                    </div>
                  </div>

                  {/* Non-destructive Trigger Bar */}
                  <div className="pt-4 border-t border-slate-150 flex justify-end">
                    <button
                      type="button"
                      onClick={handleStartEdit}
                      className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded transition-colors shadow-sm inline-flex items-center"
                    >
                      Edit Interview
                    </button>
                  </div>
                </div>
              ) : (
                
                // --- ACTIVE EDIT SUB-PANEL PIPELINE ---
                <form onSubmit={handleEditSubmit} className="space-y-4 font-medium">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Round Number *</label>
                      <input
                        type="number"
                        min="1"
                        required
                        disabled={updateMutation.isPending}
                        value={editForm.round_number}
                        onChange={(e) => setEditForm({ ...editForm, round_number: e.target.value })}
                        className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs focus:outline-indigo-500 disabled:bg-slate-50"
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
                        <option value="SCHEDULED">Scheduled</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Round Title *</label>
                    <input
                      type="text"
                      required
                      disabled={updateMutation.isPending}
                      value={editForm.round_title}
                      onChange={(e) => setEditForm({ ...editForm, round_title: e.target.value })}
                      className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs focus:outline-indigo-500 disabled:bg-slate-50"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Date &amp; Time *</label>
                      <input
                        type="datetime-local"
                        required
                        disabled={updateMutation.isPending}
                        value={editForm.interview_date}
                        onChange={(e) => setEditForm({ ...editForm, interview_date: e.target.value })}
                        className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs focus:outline-indigo-500 disabled:bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Interviewer Name(s)</label>
                      <input
                        type="text"
                        disabled={updateMutation.isPending}
                        value={editForm.interviewer_names}
                        onChange={(e) => setEditForm({ ...editForm, interviewer_names: e.target.value })}
                        className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs focus:outline-indigo-500 disabled:bg-slate-50"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Preparation Notes</label>
                      <textarea
                        rows="3"
                        disabled={updateMutation.isPending}
                        value={editForm.preparation_notes}
                        onChange={(e) => setEditForm({ ...editForm, preparation_notes: e.target.value })}
                        className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs focus:outline-indigo-500 resize-none disabled:bg-slate-50"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Questions Asked</label>
                      <textarea
                        rows="3"
                        disabled={updateMutation.isPending}
                        value={editForm.questions_asked}
                        onChange={(e) => setEditForm({ ...editForm, questions_asked: e.target.value })}
                        className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs focus:outline-indigo-500 resize-none disabled:bg-slate-50"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Feedback Notes</label>
                      <textarea
                        rows="3"
                        disabled={updateMutation.isPending}
                        value={editForm.feedback_notes}
                        onChange={(e) => setEditForm({ ...editForm, feedback_notes: e.target.value })}
                        className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs focus:outline-indigo-500 resize-none disabled:bg-slate-50"
                      />
                    </div>
                  </div>

                  {/* Form Action Confirm Box */}
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