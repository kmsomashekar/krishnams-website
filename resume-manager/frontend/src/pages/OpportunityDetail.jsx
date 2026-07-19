import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Status labels for opportunity tracking
const OPPORTUNITY_STATUS_LABELS = {
  CONSIDERING: 'Considering',
  APPLIED: 'Applied',
  UNDER_REVIEW: 'Under Review',
  INTERVIEWING: 'Interviewing',
  OFFER: 'Offer',
  REJECTED: 'Rejected',
  NO_RESPONSE: 'No Response'
};

// Valid interview statuses
const INTERVIEW_STATUS_LABELS = {
  SCHEDULED: 'Scheduled',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
};

// Date formatting helper
function formatDate(dateInput) {
  if (!dateInput) return '—';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

// Date and Time formatting helper
function formatDateTime(dateInput) {
  if (!dateInput) return '—';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

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

async function fetchOpportunityDetail(id) {
  const res = await fetch(`/api/v1/opportunities/${id}`);
  return handleResponse(res, 'Failed to load opportunity details.');
}

async function createInterview({ opportunityId, payload }) {
  const res = await fetch(`/api/v1/opportunities/${opportunityId}/interviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleResponse(res, 'Failed to save interview.');
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

function getInterviewStatusClass(status) {
  switch (status) {
    case 'SCHEDULED': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'COMPLETED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'CANCELLED': return 'bg-rose-50 text-rose-700 border-rose-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

export default function OpportunityDetail() {
  const { id: opportunityId } = useParams();
  const queryClient = useQueryClient();

  // Feedback and form UI states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mutationError, setMutationError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [interviewForm, setInterviewForm] = useState({
    round_number: 1,
    round_title: '',
    status: 'SCHEDULED',
    interview_date: '',
    interviewer_names: ''
  });

  // Opportunity detail query
  const {
    data: opportunity,
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: ['opportunity-details', opportunityId],
    queryFn: () => fetchOpportunityDetail(opportunityId),
    enabled: !!opportunityId
  });

  // Create interview mutation
  const interviewMutation = useMutation({
    mutationFn: createInterview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunity-details', opportunityId] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      setIsModalOpen(false);
      resetInterviewForm();
      showSuccessFeedback('Interview added successfully.');
    },
    onError: (err) => {
      setMutationError(err.message);
    }
  });

  const showSuccessFeedback = (msg) => {
    setSuccessMessage(msg);
    setMutationError(null);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const resetInterviewForm = () => {
    setInterviewForm({
      round_number: 1,
      round_title: '',
      status: 'SCHEDULED',
      interview_date: '',
      interviewer_names: ''
    });
    setMutationError(null);
  };

  const handleModalOpen = () => {
    resetInterviewForm();
    setIsModalOpen(true);
  };

  const handleInterviewSubmit = (e) => {
    e.preventDefault();
    setMutationError(null);

    const parsedRound = parseInt(interviewForm.round_number, 10);
    if (isNaN(parsedRound) || parsedRound < 1) {
      setMutationError('Round Number must be an integer >= 1.');
      return;
    }

    if (!interviewForm.round_title.trim()) {
      setMutationError('Round title is required.');
      return;
    }

    if (!interviewForm.interview_date) {
      setMutationError('Interview date and time are required.');
      return;
    }

    const isoDateString = new Date(interviewForm.interview_date).toISOString();

    const payload = {
      round_number: parsedRound,
      round_title: interviewForm.round_title.trim(),
      status: interviewForm.status,
      interview_date: isoDateString
    };

    if (interviewForm.interviewer_names.trim()) {
      payload.interviewer_names = interviewForm.interviewer_names.trim();
    }

    interviewMutation.mutate({ opportunityId, payload });
  };

  if (!opportunityId) {
    return (
      <div className="bg-amber-50 border border-amber-200 text-amber-800 p-6 rounded-lg shadow-sm">
        <h3 className="text-base font-semibold mb-1">Invalid Opportunity</h3>
        <p className="text-sm">No valid opportunity ID was provided.</p>
        <div className="mt-4">
          <Link to="/opportunities" className="text-sm font-semibold underline hover:text-amber-900">
            ← Back to Opportunities
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[400px] space-y-3">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 text-sm font-medium">Loading opportunity details...</p>
      </div>
    );
  }

  if (isError || !opportunity) {
    return (
      <div className="space-y-4">
        <Link to="/opportunities" className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors inline-block">
          &larr; Back to Opportunities
        </Link>
        <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-lg shadow-sm">
          <h3 className="text-base font-semibold mb-1">Unable to load opportunity</h3>
          <p className="text-sm opacity-90">{error?.message || 'The requested opportunity records could not be loaded.'}</p>
        </div>
      </div>
    );
  }

  const {
    job_title = 'Untitled Position',
    status,
    priority,
    application_url,
    date_identified,
    date_applied,
    notes,
    created_at,
    updated_at,
    company,
    resume_version,
    job_description,
    ats_analysis,
    interviews = []
  } = opportunity;

  // Sort interviews chronologically
  const sortedInterviews = [...interviews].sort(
    (a, b) => new Date(a.interview_date) - new Date(b.interview_date)
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="space-y-2">
        <Link to="/opportunities" className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors inline-flex items-center gap-1">
          &larr; Back to Opportunities
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              {company?.name || 'Company unavailable'}
            </h2>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">{job_title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusBadgeClass(status)}`}>
              {OPPORTUNITY_STATUS_LABELS[status] || status}
            </span>
            <span className="bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap">
              {priority !== null && priority !== undefined ? `P-${priority}` : '—'}
            </span>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-md text-sm shadow-sm">
          {successMessage}
        </div>
      )}

      {/* Main Content Layout Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Columns */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Opportunity Overview */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4">
              Opportunity Overview
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <span className="block font-medium text-slate-400 text-xs uppercase tracking-wider">Status</span>
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold border mt-1 ${getStatusBadgeClass(status)}`}>
                  {OPPORTUNITY_STATUS_LABELS[status] || status}
                </span>
              </div>
              <div>
                <span className="block font-medium text-slate-400 text-xs uppercase tracking-wider">Priority</span>
                <span className="text-slate-800 font-semibold mt-1 block">
                  {priority !== null && priority !== undefined ? `P-${priority}` : '—'}
                </span>
              </div>
              <div>
                <span className="block font-medium text-slate-400 text-xs uppercase tracking-wider">Date Identified</span>
                <span className="text-slate-800 font-semibold mt-0.5 block">
                  {formatDate(date_identified)}
                </span>
              </div>
              <div>
                <span className="block font-medium text-slate-400 text-xs uppercase tracking-wider">Date Applied</span>
                <span className="text-slate-800 font-semibold mt-0.5 block">
                  {formatDate(date_applied)}
                </span>
              </div>
              <div>
                <span className="block font-medium text-slate-400 text-xs uppercase tracking-wider">Application Link</span>
                <div className="mt-0.5 block">
                  {application_url ? (
                    <a
                      href={application_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-500 font-semibold underline inline-flex items-center gap-1"
                    >
                      Open Application Link
                    </a>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </div>
              </div>
              <div className="sm:col-span-2 grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <span className="block font-medium text-slate-400 text-xs uppercase tracking-wider">Created</span>
                  <span className="text-slate-600 text-xs mt-0.5 block font-medium">{formatDate(created_at)}</span>
                </div>
                <div>
                  <span className="block font-medium text-slate-400 text-xs uppercase tracking-wider">Last Updated</span>
                  <span className="text-slate-600 text-xs mt-0.5 block font-medium">{formatDate(updated_at)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 mb-3">
              Notes
            </h3>
            {notes ? (
              <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed font-medium">
                {notes}
              </p>
            ) : (
              <p className="text-slate-400 text-sm font-medium">No notes added.</p>
            )}
          </div>

          {/* Job Description */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4">
              Job Description
            </h3>
            {job_description ? (
              <div className="space-y-4">
                <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed font-medium">
                  {job_description.raw_text && job_description.raw_text.trim() ? job_description.raw_text : "No job description text available."}
                </p>
                <div className="pt-3 border-t border-slate-100">
                  <span className="block font-bold text-slate-400 text-xs uppercase tracking-wider mb-2">
                    Extracted Skills
                  </span>
                  {Array.isArray(job_description.extracted_skills) && job_description.extracted_skills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {job_description.extracted_skills.map((skill, index) => (
                        <span key={index} className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded text-xs font-semibold border border-slate-200">
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-xs font-medium">No extracted skills available.</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-sm font-medium">No job description available.</p>
            )}
          </div>

          {/* ATS Analysis */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4">
              ATS Analysis
            </h3>
            {ats_analysis ? (
              <div className="space-y-5">
                <div className="flex items-center space-x-4">
                  <div className="text-3xl font-extrabold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
                    {ats_analysis.match_score}%
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-800 block">ATS Match Score</span>
                    {ats_analysis.analyzed_at && (
                      <span className="text-xs text-slate-400 block mt-0.5">
                        Analyzed: {formatDateTime(ats_analysis.analyzed_at)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <span className="block font-bold text-slate-400 text-xs uppercase tracking-wider">Missing Keywords</span>
                    {Array.isArray(ats_analysis.missing_keywords) && ats_analysis.missing_keywords.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {ats_analysis.missing_keywords.map((kw, idx) => (
                          <span key={idx} className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded text-xs font-semibold border border-rose-100">
                            {kw}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 text-xs font-medium">No missing keywords identified.</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <span className="block font-bold text-slate-400 text-xs uppercase tracking-wider">Skill Gaps</span>
                    {Array.isArray(ats_analysis.skill_gaps) && ats_analysis.skill_gaps.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {ats_analysis.skill_gaps.map((gap, idx) => (
                          <span key={idx} className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-xs font-semibold border border-amber-100">
                            {gap}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 text-xs font-medium">No skill gaps identified.</p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-1">
                  <span className="block font-bold text-slate-400 text-xs uppercase tracking-wider">Improvement Suggestions</span>
                  <p className="text-slate-700 text-sm leading-relaxed font-medium">
                    {ats_analysis.improvement_suggestions || 'No improvement suggestions available.'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-sm font-medium">No ATS analysis available.</p>
            )}
          </div>
        </div>

        {/* Right Sidebar Columns */}
        <div className="space-y-6">
          
          {/* Company */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 mb-3">
              Company
            </h3>
            {company ? (
              <div className="space-y-3.5 text-xs font-medium">
                <div>
                  <span className="block font-bold text-slate-400 uppercase tracking-wider mb-0.5">Name</span>
                  <span className="text-slate-900 text-sm font-bold">{company.name}</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-400 uppercase tracking-wider mb-0.5">Location</span>
                  <span className="text-slate-700 text-sm font-semibold">{company.location || '—'}</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-400 uppercase tracking-wider mb-0.5">Website</span>
                  {company.website ? (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-500 font-semibold underline break-all block text-sm"
                    >
                      {company.website}
                    </a>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <span className="block font-bold text-slate-400 uppercase tracking-wider mb-1">Company Notes</span>
                  <p className="text-slate-600 leading-normal whitespace-pre-wrap">{company.notes || '—'}</p>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-sm font-medium">Company information is not available.</p>
            )}
          </div>

          {/* Resume Version */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 mb-3">
              Resume Version
            </h3>
            {resume_version ? (
              <div className="space-y-2.5 text-xs font-medium">
                <div>
                  <span className="block font-bold text-slate-400 uppercase tracking-wider mb-0.5">Version Label</span>
                  <span className="text-slate-900 text-sm font-bold block">{resume_version.version_label}</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-400 uppercase tracking-wider mb-0.5">Target Role</span>
                  <span className="text-slate-700 font-semibold block">{resume_version.target_role || '—'}</span>
                </div>
                <p className="text-slate-400 text-[10px] bg-slate-50 p-2 rounded border border-slate-100 mt-2">
                  Resume file access will be available from the Resumes module.
                </p>
              </div>
            ) : (
              <p className="text-slate-400 text-sm font-medium">No resume version linked to this opportunity.</p>
            )}
          </div>

          {/* Interviews */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Interviews
              </h3>
              <button
                type="button"
                onClick={handleModalOpen}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-500 transition-colors bg-indigo-50 px-2 py-1 rounded"
              >
                + Add Interview
              </button>
            </div>

            {sortedInterviews.length === 0 ? (
              <div className="text-center py-6 space-y-1">
                <p className="text-xs font-semibold text-slate-700">No interviews scheduled yet.</p>
                <p className="text-[11px] text-slate-400 max-w-[180px] mx-auto">
                  Add an interview when one is scheduled.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-0.5">
                {sortedInterviews.map((iv) => {
                  const localStatus = INTERVIEW_STATUS_LABELS[iv.status] || iv.status || 'Scheduled';
                  
                  return (
                    <div key={iv.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-slate-800 text-sm truncate">
                          {iv.round_title || 'Interview'}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase whitespace-nowrap border ${getInterviewStatusClass(iv.status)}`}>
                          {localStatus}
                        </span>
                      </div>
                      <div className="pt-1.5 border-t border-slate-200/60 flex flex-col space-y-1 text-slate-500 font-medium">
                        <div>
                          <span className="font-bold text-slate-400 mr-1">Round:</span> {iv.round_number || 1}
                        </div>
                        <div>
                          <span className="font-bold text-slate-400 mr-1">Date/Time:</span> {formatDateTime(iv.interview_date)}
                        </div>
                        <div className="truncate">
                          <span className="font-bold text-slate-400 mr-1">Interviewer(s):</span> 
                          <span className="text-slate-700">{iv.interviewer_names || '—'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Add Interview Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-150 bg-slate-50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900">Add Interview</h3>
              <button
                type="button"
                onClick={() => { if (!interviewMutation.isPending) setIsModalOpen(false); }}
                disabled={interviewMutation.isPending}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm disabled:opacity-40"
              >
                ✕
              </button>
            </div>

            {mutationError && (
              <div className="mx-5 mt-4 bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded text-xs font-semibold shadow-sm">
                {mutationError}
              </div>
            )}

            <form onSubmit={handleInterviewSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Round *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    disabled={interviewMutation.isPending}
                    value={interviewForm.round_number}
                    onChange={(e) => setInterviewForm({ ...interviewForm, round_number: e.target.value })}
                    className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs font-medium focus:outline-indigo-500 disabled:bg-slate-50"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Status *</label>
                  <select
                    value={interviewForm.status}
                    disabled={interviewMutation.isPending}
                    onChange={(e) => setInterviewForm({ ...interviewForm, status: e.target.value })}
                    className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs font-medium focus:outline-indigo-500 bg-white disabled:bg-slate-50"
                  >
                    {Object.entries(INTERVIEW_STATUS_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Round Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Technical Screening, Panel Architecture"
                  disabled={interviewMutation.isPending}
                  value={interviewForm.round_title}
                  onChange={(e) => setInterviewForm({ ...interviewForm, round_title: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs font-medium focus:outline-indigo-500 disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Date &amp; Time *</label>
                <input
                  type="datetime-local"
                  required
                  disabled={interviewMutation.isPending}
                  value={interviewForm.interview_date}
                  onChange={(e) => setInterviewForm({ ...interviewForm, interview_date: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs font-medium focus:outline-indigo-500 disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Interviewer Name(s)</label>
                <input
                  type="text"
                  placeholder="e.g. Hiring Manager, Lead Architect"
                  disabled={interviewMutation.isPending}
                  value={interviewForm.interviewer_names}
                  onChange={(e) => setInterviewForm({ ...interviewForm, interviewer_names: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs font-medium focus:outline-indigo-500 disabled:bg-slate-50"
                />
              </div>

              <div className="pt-3 border-t border-slate-150 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={interviewMutation.isPending}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={interviewMutation.isPending}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-500 shadow-sm transition-colors disabled:opacity-60 flex items-center gap-1"
                >
                  {interviewMutation.isPending ? 'Saving...' : 'Save Interview'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}