import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// --- DATE FORMATTING UTILITIES ---
function formatDate(dateInput) {
  if (!dateInput) return '—';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

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

// --- API FETCHERS AND MUTATIONS ---
async function fetchResumes() {
  const res = await fetch('/api/v1/resumes');
  return handleResponse(res, 'Failed to load resumes.');
}

async function fetchResumeDetail(id) {
  const res = await fetch(`/api/v1/resumes/${id}`);
  return handleResponse(res, 'Failed to load resume details.');
}

async function fetchVersionDetail({ resumeId, versionId }) {
  const res = await fetch(`/api/v1/resumes/${resumeId}/versions/${versionId}`);
  return handleResponse(res, 'Failed to load version details.');
}

async function createResume(payload) {
  const res = await fetch('/api/v1/resumes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleResponse(res, 'Failed to create resume.');
}

async function updateResume({ id, payload }) {
  const res = await fetch(`/api/v1/resumes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleResponse(res, 'Failed to update resume.');
}

async function createResumeVersion({ resumeId, payload }) {
  const res = await fetch(`/api/v1/resumes/${resumeId}/versions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleResponse(res, 'Failed to create resume version.');
}

async function updateResumeVersion({ resumeId, versionId, payload }) {
  const res = await fetch(`/api/v1/resumes/${resumeId}/versions/${versionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleResponse(res, 'Failed to update resume version.');
}

async function deleteResumeVersionFile({ resumeId, versionId }) {
  const res = await fetch(`/api/v1/resumes/${resumeId}/versions/${versionId}/file`, {
    method: 'DELETE'
  });
  return handleResponse(res, 'Failed to delete resume file.');
}

export default function Resumes() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  // --- SELECTION & SEARCH STATE ---
  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const [selectedVersionId, setSelectedVersionId] = useState(null);
  const [search, setSearch] = useState('');

  // --- MODAL & NOTIFICATION STATE ---
  const [isAddResumeOpen, setIsAddResumeOpen] = useState(false);
  const [isEditResumeOpen, setIsEditResumeOpen] = useState(false);
  const [isAddVersionOpen, setIsAddVersionOpen] = useState(false);
  const [isEditVersionOpen, setIsEditVersionOpen] = useState(false);
  const [isEditAiContextOpen, setIsEditAiContextOpen] = useState(false);
  const [isVersionDetailsOpen, setIsVersionDetailsOpen] = useState(false);
  
  const [modalError, setModalError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // File upload state modifiers
  const [fileActionError, setFileActionError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [targetUploadVersionId, setTargetUploadVersionId] = useState(null);
  const [isReplaceAction, setIsReplaceAction] = useState(false);

  // --- FORM STATES ---
  const [resumeForm, setResumeForm] = useState({ name: '', notes: '' });
  const [versionForm, setVersionForm] = useState({ version_label: '', target_role: '' });
  const [aiContextForm, setAiContextForm] = useState({ version_label: '', ai_context: '' });

  // --- DATA QUERIES ---
  const {
    data: resumesData,
    isLoading: isListLoading,
    isError: isListError,
    error: listError
  } = useQuery({
    queryKey: ['resumes'],
    queryFn: fetchResumes
  });

  const resumesList = resumesData?.resumes || [];

  // Auto-select first resume if there is a list and no current selection exists
  useEffect(() => {
    if (resumesList.length > 0 && !selectedResumeId) {
      setSelectedResumeId(resumesList[0].id);
    }
  }, [resumesList, selectedResumeId]);

  const {
    data: resumeDetail,
    isLoading: isDetailLoading,
    isError: isDetailError,
    error: detailError
  } = useQuery({
    queryKey: ['resume-details', selectedResumeId],
    queryFn: () => fetchResumeDetail(selectedResumeId),
    enabled: !!selectedResumeId
  });

  const {
    data: versionDetail,
    isLoading: isVersionLoading,
    isError: isVersionError,
    error: versionError
  } = useQuery({
    queryKey: ['resume-version-details', selectedResumeId, selectedVersionId],
    queryFn: () => fetchVersionDetail({ resumeId: selectedResumeId, versionId: selectedVersionId }),
    enabled: !!selectedResumeId && !!selectedVersionId && (isVersionDetailsOpen || isEditAiContextOpen)
  });

  // Prepopulate AI Context field once explicit details load
  useEffect(() => {
    if (versionDetail && isEditAiContextOpen) {
      setAiContextForm({
        version_label: versionDetail.version_label || '',
        ai_context: versionDetail.ai_context || ''
      });
    }
  }, [versionDetail, isEditAiContextOpen]);

  // --- DATA MUTATIONS ---
  const createResumeMutation = useMutation({
    mutationFn: createResume,
    onSuccess: (newResume) => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
      if (newResume?.id) {
        setSelectedResumeId(newResume.id);
      }
      setIsAddResumeOpen(false);
      showSuccessFeedback('Resume added successfully.');
    },
    onError: (err) => {
      setModalError(err.message);
    }
  });

  const updateResumeMutation = useMutation({
    mutationFn: updateResume,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
      queryClient.invalidateQueries({ queryKey: ['resume-details', selectedResumeId] });
      setIsEditResumeOpen(false);
      showSuccessFeedback('Resume updated successfully.');
    },
    onError: (err) => {
      setModalError(err.message);
    }
  });

  const createVersionMutation = useMutation({
    mutationFn: createResumeVersion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resume-details', selectedResumeId] });
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
      setIsAddVersionOpen(false);
      showSuccessFeedback('Resume version added successfully.');
    },
    onError: (err) => {
      setModalError(err.message);
    }
  });

  const updateVersionMutation = useMutation({
    mutationFn: updateResumeVersion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resume-details', selectedResumeId] });
      queryClient.invalidateQueries({ queryKey: ['resume-version-details', selectedResumeId, selectedVersionId] });
      setIsEditVersionOpen(false);
      setIsEditAiContextOpen(false);
      showSuccessFeedback('Resume version updated successfully.');
    },
    onError: (err) => {
      setModalError(err.message);
    }
  });

  const saveAiContextMutation = useMutation({
    mutationFn: updateResumeVersion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resume-details', selectedResumeId] });
      queryClient.invalidateQueries({ queryKey: ['resume-version-details', selectedResumeId, selectedVersionId] });
      setIsEditAiContextOpen(false);
      showSuccessFeedback('AI Context saved successfully.');
    },
    onError: (err) => {
      setModalError(err.message);
    }
  });

  const deleteFileMutation = useMutation({
    mutationFn: deleteResumeVersionFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resume-details', selectedResumeId] });
      queryClient.invalidateQueries({ queryKey: ['resume-version-details', selectedResumeId, selectedVersionId] });
      showSuccessFeedback('Resume file deleted successfully.');
    },
    onError: (err) => {
      setFileActionError(err.message);
    }
  });

  // --- ACTION HELPERS ---
  const showSuccessFeedback = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleOpenAddResume = () => {
    setResumeForm({ name: '', notes: '' });
    setModalError(null);
    setIsAddResumeOpen(true);
  };

  const handleOpenEditResume = () => {
    if (!resumeDetail) return;
    setResumeForm({
      name: resumeDetail.name || '',
      notes: resumeDetail.notes || ''
    });
    setModalError(null);
    setIsEditResumeOpen(true);
  };

  const handleOpenAddVersion = () => {
    setVersionForm({ version_label: '', target_role: '' });
    setModalError(null);
    setIsAddVersionOpen(true);
  };

  const handleOpenEditVersion = (version) => {
    setSelectedVersionId(version.id);
    setVersionForm({
      version_label: version.version_label || '',
      target_role: version.target_role || ''
    });
    setModalError(null);
    setIsEditVersionOpen(true);
  };

  const handleOpenEditAiContext = (version) => {
    setSelectedVersionId(version.id);
    setAiContextForm({
      version_label: version.version_label || '',
      ai_context: ''
    });
    setModalError(null);
    setIsEditAiContextOpen(true);
  };

  const handleOpenVersionDetails = (versionId) => {
    setSelectedVersionId(versionId);
    setFileActionError(null);
    setIsVersionDetailsOpen(true);
  };

  const handleResumeSubmit = (e) => {
    e.preventDefault();
    setModalError(null);
    if (!resumeForm.name.trim()) {
      setModalError('Resume Name is required.');
      return;
    }
    createResumeMutation.mutate({
      name: resumeForm.name.trim(),
      notes: resumeForm.notes.trim() || undefined
    });
  };

  const handleResumeUpdateSubmit = (e) => {
    e.preventDefault();
    setModalError(null);
    if (!resumeForm.name.trim()) {
      setModalError('Resume Name must remain non-empty.');
      return;
    }
    updateResumeMutation.mutate({
      id: selectedResumeId,
      payload: {
        name: resumeForm.name.trim(),
        notes: resumeForm.notes.trim() || null
      }
    });
  };

  const handleVersionSubmit = (e) => {
    e.preventDefault();
    setModalError(null);
    if (!versionForm.version_label.trim()) {
      setModalError('Version Label is required.');
      return;
    }

    const payload = {
      version_label: versionForm.version_label.trim()
    };
    if (versionForm.target_role.trim()) {
      payload.target_role = versionForm.target_role.trim();
    }

    createVersionMutation.mutate({
      resumeId: selectedResumeId,
      payload
    });
  };

  const handleVersionUpdateSubmit = (e) => {
    e.preventDefault();
    setModalError(null);
    if (!versionForm.version_label.trim()) {
      setModalError('Version Label is required.');
      return;
    }

    updateVersionMutation.mutate({
      resumeId: selectedResumeId,
      versionId: selectedVersionId,
      payload: {
        version_label: versionForm.version_label.trim(),
        target_role: versionForm.target_role.trim() || null
      }
    });
  };

  const handleAiContextUpdateSubmit = (e) => {
    e.preventDefault();
    setModalError(null);

    const trimmedCtx = aiContextForm.ai_context.trim();
    if (trimmedCtx.length > 100000) {
      setModalError('AI Context content limit cannot exceed 100,000 characters.');
      return;
    }

    saveAiContextMutation.mutate({
      resumeId: selectedResumeId,
      versionId: selectedVersionId,
      payload: {
        ai_context: trimmedCtx.length === 0 ? null : trimmedCtx
      }
    });
  };

  // --- BINARY FILE OPERATION PIPELINES ---
  const handleTriggerUpload = (versionId) => {
    setTargetUploadVersionId(versionId);
    setIsReplaceAction(false);
    setFileActionError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleTriggerReplace = (versionId) => {
    setTargetUploadVersionId(versionId);
    setIsReplaceAction(true);
    setFileActionError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileActionError(null);

    // Client-side validations
    if (file.size === 0) {
      setFileActionError('Selected file structure cannot be empty.');
      return;
    }

    const allowedExtensions = ['.pdf', '.docx'];
    const fileNameLower = file.name.toLowerCase();
    const hasAllowedExt = allowedExtensions.some(ext => fileNameLower.endsWith(ext));
    if (!hasAllowedExt) {
      setFileActionError('Only PDF and DOCX files are allowed.');
      return;
    }

    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (!allowedMimeTypes.includes(file.type)) {
      setFileActionError('Only PDF and DOCX files are allowed.');
      return;
    }

    if (fileNameLower.endsWith('.pdf') && file.type !== 'application/pdf') {
      setFileActionError('Selected file type does not match its extension.');
      return;
    }
    if (fileNameLower.endsWith('.docx') && file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      setFileActionError('Selected file type does not match its extension.');
      return;
    }

    const maxFileBytes = 2 * 1024 * 1024; // 2MB exactly
    if (file.size > maxFileBytes) {
      setFileActionError('Resume file must not exceed 2 MB.');
      return;
    }

    // Deferred confirmation prompt after selection/validation for the replace operation
    if (isReplaceAction) {
      const confirmed = window.confirm('Replace the existing resume file with the selected file?');
      if (!confirmed) {
        if (fileInputRef.current) fileInputRef.current.value = '';
        setTargetUploadVersionId(null);
        setIsReplaceAction(false);
        return;
      }
    }

    setIsUploading(true);
    try {
      const uploadUrl = `/api/v1/resumes/${selectedResumeId}/versions/${targetUploadVersionId}/file`;
      const res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
          'X-File-Name': file.name
        },
        body: file
      });

      await handleResponse(res, 'Failed to complete binary upload processing routines.');
      
      queryClient.invalidateQueries({ queryKey: ['resume-details', selectedResumeId] });
      queryClient.invalidateQueries({ queryKey: ['resume-version-details', selectedResumeId, targetUploadVersionId] });
      showSuccessFeedback('Resume file processed successfully.');
    } catch (err) {
      setFileActionError(err.message);
    } finally {
      setIsUploading(false);
      setTargetUploadVersionId(null);
      setIsReplaceAction(false);
    }
  };

  const handleDownloadFile = async (versionId) => {
    setFileActionError(null);
    try {
      const downloadUrl = `/api/v1/resumes/${selectedResumeId}/versions/${versionId}/file`;
      const response = await fetch(downloadUrl, { method: 'GET' });

      if (!response.ok) {
        let errorMsg = 'Failed to download binary tracking entity asset.';
        try {
          const errBody = await response.json();
          if (errBody?.error?.message) errorMsg = errBody.error.message;
        } catch (_) {}
        throw new Error(errorMsg);
      }

      const blob = await response.blob();
      
      let derivedFileName = 'resume.pdf';
      if (blob.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        derivedFileName = 'resume.docx';
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      if (contentDisposition) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
        if (matches && matches[1]) {
          derivedFileName = matches[1].replace(/['"]/g, '');
        }
      }

      const tempObjUrl = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = tempObjUrl;
      downloadAnchor.download = derivedFileName;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      
      document.body.removeChild(downloadAnchor);
      URL.revokeObjectURL(tempObjUrl);
    } catch (err) {
      alert(`Download failed: ${err.message}`);
    }
  };

  const handleDeleteFileClick = (versionId) => {
    if (window.confirm('Delete this stored resume file? The Resume Version itself will not be deleted.')) {
      deleteFileMutation.mutate({ resumeId: selectedResumeId, versionId });
    }
  };

  // --- FILTERED COMPUTATIONS ---
  const filteredResumes = resumesList.filter((res) => {
    const matchName = (res.name || '').toLowerCase().includes(search.toLowerCase());
    const matchNotes = (res.notes || '').toLowerCase().includes(search.toLowerCase());
    return matchName || matchNotes;
  });

  const totalResumes = resumesList.length;

  if (isListLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[400px] space-y-3">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 text-sm font-medium">Loading resumes...</p>
      </div>
    );
  }

  if (isListError) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-lg shadow-sm">
        <h3 className="text-base font-semibold mb-1">Unable to load resumes</h3>
        <p className="text-sm opacity-90">{listError?.message || 'An error occurred while loading the resumes registry.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Hidden File Input Selector Wrapper */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Resumes</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your resumes and targeted versions.</p>
        </div>
        <button
          onClick={handleOpenAddResume}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-500 shadow-sm transition-colors self-start sm:self-auto"
        >
          + Add Resume
        </button>
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-md text-sm shadow-sm">
          {successMessage}
        </div>
      )}

      {/* Generic Context Action Errors Block */}
      {fileActionError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-md text-xs font-semibold shadow-sm">
          {fileActionError}
        </div>
      )}

      {/* Summary Matrix Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Resumes</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalResumes}</div>
        </div>
      </div>

      {/* Master Detail Responsive Panel Construction */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Master Column: Search & Resume List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
            <input
              type="text"
              placeholder="Search resumes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {totalResumes === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-8 text-center shadow-sm">
              <p className="text-slate-700 font-medium text-sm">No resumes yet.</p>
              <p className="text-slate-400 text-xs mt-1">Add your first resume to start managing targeted versions.</p>
            </div>
          ) : filteredResumes.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-8 text-center shadow-sm">
              <p className="text-slate-500 text-sm">No matching resumes found.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {filteredResumes.map((res) => {
                const isSelected = selectedResumeId === res.id;
                return (
                  <div
                    key={res.id}
                    onClick={() => {
                      setSelectedResumeId(res.id);
                      setSelectedVersionId(null);
                    }}
                    className={`p-4 border rounded-xl shadow-sm cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-50/40 border-indigo-500 ring-1 ring-indigo-500'
                        : 'bg-white border-slate-200 hover:bg-slate-50/50'
                    }`}
                  >
                    <h3 className="font-bold text-slate-900 text-sm truncate">{res.name}</h3>
                    {res.notes && (
                      <p className="text-slate-500 text-xs mt-1 line-clamp-2 font-medium">
                        {res.notes}
                      </p>
                    )}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-medium">
                      <span>Added: {formatDate(res.created_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Detail Column: Selected Resume Specifications */}
        <div className="lg:col-span-2">
          {!selectedResumeId ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 shadow-sm font-medium text-sm">
              Select a resume to view its details.
            </div>
          ) : isDetailLoading ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm flex flex-col items-center justify-center space-y-2">
              <div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="text-slate-500 text-xs font-medium">Loading resume details...</p>
            </div>
          ) : isDetailError || !resumeDetail ? (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-6 rounded-xl shadow-sm">
              <h4 className="font-bold text-sm">Unable to load resume details</h4>
              <p className="text-xs mt-1 opacity-90">{detailError?.message || 'Details could not be initialized.'}</p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Detailed Resume Header Card */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="space-y-1">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">{resumeDetail.name}</h2>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-medium pt-0.5">
                      <div><span className="font-bold text-slate-300">Created:</span> {formatDate(resumeDetail.created_at)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleOpenEditResume}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
                    >
                      Edit Resume
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenAddVersion}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded hover:bg-indigo-500 transition-colors shadow-sm"
                    >
                      + Add Version
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Resume Profile Notes</h4>
                  {resumeDetail.notes ? (
                    <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed font-medium">
                      {resumeDetail.notes}
                    </p>
                  ) : (
                    <p className="text-slate-400 text-sm font-medium">No notes added.</p>
                  )}
                </div>
              </div>

              {/* Versions Nested Matrix Area */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Resume Versions</h3>
                  <button
                    type="button"
                    onClick={handleOpenAddVersion}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-500 bg-indigo-50 px-2 py-1 rounded"
                  >
                    + Add Version
                  </button>
                </div>

                {!resumeDetail.versions || resumeDetail.versions.length === 0 ? (
                  <div className="text-center py-8 space-y-1 bg-slate-50/50 border border-dashed border-slate-200 rounded-lg">
                    <p className="text-xs font-semibold text-slate-700">No versions added yet.</p>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                      Add a targeted version for a specific role or application.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {resumeDetail.versions.map((ver) => {
                      const isActiveVersion = ver.is_active === 1 || ver.is_active === true;
                      const hasLinkedFile = ver.has_file === true || ver.has_file === 1;
                      const hasAiContext = ver.has_ai_context === true || ver.has_ai_context === 1;
                      const currentUploadActive = isUploading && targetUploadVersionId === ver.id;

                      return (
                        <div key={ver.id} className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-bold text-slate-900 text-sm truncate">{ver.version_label}</h4>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase border shrink-0 ${
                                isActiveVersion 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}>
                                {isActiveVersion ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 border-t border-slate-200/50 pt-2">
                              <div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Target Role</span>
                                <span className="text-slate-700 font-semibold text-xs block truncate">{ver.target_role || '—'}</span>
                              </div>
                              <div className="space-y-1">
                                <div>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Storage Status</span>
                                  <span className={`inline-flex items-center text-[10px] font-bold mt-0.5 ${hasLinkedFile ? 'text-emerald-600' : 'text-slate-500'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${hasLinkedFile ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                                    {hasLinkedFile ? 'File: Available' : 'File: Not uploaded'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">AI Integration</span>
                                  <span className={`inline-flex items-center text-[10px] font-bold ${hasAiContext ? 'text-indigo-600' : 'text-slate-500'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${hasAiContext ? 'bg-indigo-500' : 'bg-slate-300'}`}></span>
                                    {hasAiContext ? 'AI Context: Ready' : 'AI Context: Not Added'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Level 2 Sub-Actions Layout Controls */}
                          <div className="pt-2 border-t border-slate-200/60 flex flex-wrap gap-2 items-center justify-between">
                            <div className="flex items-center space-x-2">
                              {!hasLinkedFile ? (
                                <button
                                  type="button"
                                  disabled={isUploading}
                                  onClick={() => handleTriggerUpload(ver.id)}
                                  className="text-[10px] font-bold px-2 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded text-indigo-600 transition-colors disabled:opacity-50"
                                >
                                  {currentUploadActive && !isReplaceAction ? 'Uploading...' : 'Upload File'}
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadFile(ver.id)}
                                    className="text-[10px] font-bold px-2 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded text-slate-700 transition-colors"
                                  >
                                    Download
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isUploading}
                                    onClick={() => handleTriggerReplace(ver.id)}
                                    className="text-[10px] font-bold px-2 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded text-slate-600 transition-colors disabled:opacity-50"
                                  >
                                    {currentUploadActive && isReplaceAction ? 'Uploading...' : 'Replace'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteFileClick(ver.id)}
                                    className="text-[10px] font-bold px-2 py-1 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded text-rose-600 transition-colors"
                                  >
                                    Delete File
                                  </button>
                                </>
                              )}
                            </div>

                            <div className="flex items-center space-x-2 ml-auto">
                              <button
                                type="button"
                                onClick={() => handleOpenEditVersion(ver)}
                                className="text-slate-600 hover:text-slate-900 font-bold text-[10px] border-r border-slate-200 pr-2 text-right"
                              >
                                Edit Version
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditAiContext(ver)}
                                className="text-indigo-600 hover:text-indigo-900 font-bold text-[10px] border-r border-slate-200 pr-2 text-right"
                              >
                                Edit AI Context
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenVersionDetails(ver.id)}
                                className="text-indigo-600 hover:text-indigo-500 font-bold text-[10px] underline text-right"
                              >
                                View Details
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

      </div>

      {/* MODAL 1: ADD RESUME CONTAINER */}
      {isAddResumeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-150 bg-slate-50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900">Add Resume</h3>
              <button
                type="button"
                onClick={() => { if (!createResumeMutation.isPending) setIsAddResumeOpen(false); }}
                disabled={createResumeMutation.isPending}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm disabled:opacity-40"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="mx-5 mt-4 bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded text-xs font-semibold">
                {modalError}
              </div>
            )}

            <form onSubmit={handleResumeSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Resume Name *</label>
                <input
                  type="text"
                  required
                  disabled={createResumeMutation.isPending}
                  placeholder="e.g. Cybersecurity Leadership Resume"
                  value={resumeForm.name}
                  onChange={(e) => setResumeForm({ ...resumeForm, name: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs font-medium focus:outline-indigo-500 disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Notes</label>
                <textarea
                  rows="3"
                  disabled={createResumeMutation.isPending}
                  placeholder="Add any profile constraints or generic details..."
                  value={resumeForm.notes}
                  onChange={(e) => setResumeForm({ ...resumeForm, notes: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs font-medium focus:outline-indigo-500 resize-none disabled:bg-slate-50"
                />
              </div>

              <div className="pt-3 border-t border-slate-150 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddResumeOpen(false)}
                  disabled={createResumeMutation.isPending}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createResumeMutation.isPending}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-500 shadow-sm transition-colors disabled:opacity-60"
                >
                  {createResumeMutation.isPending ? 'Saving...' : 'Save Resume'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT RESUME CONTAINER */}
      {isEditResumeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-150 bg-slate-50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900">Edit Resume</h3>
              <button
                type="button"
                onClick={() => { if (!updateResumeMutation.isPending) setIsEditResumeOpen(false); }}
                disabled={updateResumeMutation.isPending}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm disabled:opacity-40"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="mx-5 mt-4 bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded text-xs font-semibold">
                {modalError}
              </div>
            )}

            <form onSubmit={handleResumeUpdateSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Resume Name *</label>
                <input
                  type="text"
                  required
                  disabled={updateResumeMutation.isPending}
                  value={resumeForm.name}
                  onChange={(e) => setResumeForm({ ...resumeForm, name: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs font-medium focus:outline-indigo-500 disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Notes</label>
                <textarea
                  rows="3"
                  disabled={updateResumeMutation.isPending}
                  value={resumeForm.notes}
                  onChange={(e) => setResumeForm({ ...resumeForm, notes: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs font-medium focus:outline-indigo-500 resize-none disabled:bg-slate-50"
                />
              </div>

              <div className="pt-3 border-t border-slate-150 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditResumeOpen(false)}
                  disabled={updateResumeMutation.isPending}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateResumeMutation.isPending}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-500 shadow-sm transition-colors disabled:opacity-60"
                >
                  {updateResumeMutation.isPending ? 'Saving...' : 'Save Resume'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD VERSION CONTAINER */}
      {isAddVersionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-150 bg-slate-50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900">Add Version</h3>
              <button
                type="button"
                onClick={() => { if (!createVersionMutation.isPending) setIsAddVersionOpen(false); }}
                disabled={createVersionMutation.isPending}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm disabled:opacity-40"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="mx-5 mt-4 bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded text-xs font-semibold">
                {modalError}
              </div>
            )}

            <form onSubmit={handleVersionSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Version Label *</label>
                <input
                  type="text"
                  required
                  disabled={createVersionMutation.isPending}
                  placeholder="e.g. Cloud Security v1"
                  value={versionForm.version_label}
                  onChange={(e) => setVersionForm({ ...versionForm, version_label: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs font-medium focus:outline-indigo-500 disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Target Role</label>
                <input
                  type="text"
                  disabled={createVersionMutation.isPending}
                  placeholder="e.g. Security Architect"
                  value={versionForm.target_role}
                  onChange={(e) => setVersionForm({ ...versionForm, target_role: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs font-medium focus:outline-indigo-500 disabled:bg-slate-50"
                />
              </div>

              <div className="pt-3 border-t border-slate-150 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddVersionOpen(false)}
                  disabled={createVersionMutation.isPending}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createVersionMutation.isPending}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-500 shadow-sm transition-colors disabled:opacity-60"
                >
                  {createVersionMutation.isPending ? 'Saving...' : 'Save Version'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: EDIT VERSION CONTAINER */}
      {isEditVersionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-150 bg-slate-50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900">Edit Version</h3>
              <button
                type="button"
                onClick={() => { if (!updateVersionMutation.isPending) setIsEditVersionOpen(false); }}
                disabled={updateVersionMutation.isPending}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm disabled:opacity-40"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="mx-5 mt-4 bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded text-xs font-semibold">
                {modalError}
              </div>
            )}

            <form onSubmit={handleVersionUpdateSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Version Label *</label>
                <input
                  type="text"
                  required
                  disabled={updateVersionMutation.isPending}
                  value={versionForm.version_label}
                  onChange={(e) => setVersionForm({ ...versionForm, version_label: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs font-medium focus:outline-indigo-500 disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Target Role</label>
                <input
                  type="text"
                  disabled={updateVersionMutation.isPending}
                  value={versionForm.target_role}
                  onChange={(e) => setVersionForm({ ...versionForm, target_role: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs font-medium focus:outline-indigo-500 disabled:bg-slate-50"
                />
              </div>

              <div className="pt-3 border-t border-slate-150 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditVersionOpen(false)}
                  disabled={updateVersionMutation.isPending}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateVersionMutation.isPending}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-500 shadow-sm transition-colors disabled:opacity-60"
                >
                  {updateVersionMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: EDIT AI CONTEXT CONTAINER */}
      {isEditAiContextOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-150 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Edit AI Context</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Version: {aiContextForm.version_label}</p>
              </div>
              <button
                type="button"
                onClick={() => { if (!saveAiContextMutation.isPending) setIsEditAiContextOpen(false); }}
                disabled={saveAiContextMutation.isPending}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm disabled:opacity-40"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="mx-5 mt-4 bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded text-xs font-semibold">
                {modalError}
              </div>
            )}

            {isVersionLoading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-2">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-slate-500 text-xs font-medium">Fetching secure version context...</p>
              </div>
            ) : (
              <form onSubmit={handleAiContextUpdateSubmit} className="p-5 space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">AI-Readable Resume Context</label>
                    <span className={`text-[10px] font-bold ${aiContextForm.ai_context.trim().length > 100000 ? 'text-rose-600' : 'text-slate-400'}`}>
                      {aiContextForm.ai_context.trim().length.toLocaleString()} / 100,000 characters
                    </span>
                  </div>
                  <textarea
                    rows="12"
                    disabled={saveAiContextMutation.isPending}
                    placeholder="Paste full plain-text raw resume content transcript maps here..."
                    value={aiContextForm.ai_context}
                    onChange={(e) => setAiContextForm({ ...aiContextForm, ai_context: e.target.value })}
                    className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs font-mono focus:outline-indigo-500 disabled:bg-slate-50"
                  />
                  <p className="text-[11px] text-slate-400 mt-1 font-medium">
                    Paste or edit the plain-text resume content used for AI job analysis.
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-150 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsEditAiContextOpen(false)}
                    disabled={saveAiContextMutation.isPending}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saveAiContextMutation.isPending || aiContextForm.ai_context.trim().length > 100000}
                    className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-500 shadow-sm transition-colors disabled:opacity-60"
                  >
                    {saveAiContextMutation.isPending ? 'Saving...' : 'Save AI Context'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 4: VERSION DETAILS EXPANDED DIALOG PANEL WITH ATS HISTORY */}
      {isVersionDetailsOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-3.5 border-b border-slate-150 bg-slate-50 flex justify-between items-center shrink-0">
              <h3 className="text-sm font-bold text-slate-900">Version Details</h3>
              <button
                type="button"
                onClick={() => setIsVersionDetailsOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-sm">
              {isVersionLoading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-2">
                  <div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  <p className="text-slate-500 text-xs font-medium">Loading version details...</p>
                </div>
              ) : isVersionError || !versionDetail ? (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-lg">
                  <h4 className="font-bold text-xs">Unable to load version details</h4>
                  <p className="text-[11px] mt-1 opacity-90">{versionError?.message || 'Details could not be initialized.'}</p>
                </div>
              ) : (
                <>
                  {/* Basic Metadata Info Blocks */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 p-4 rounded-xl font-medium text-xs">
                    <div className="space-y-0.5">
                      <span className="block font-bold text-slate-400 uppercase tracking-wider">Version Label</span>
                      <span className="text-slate-900 text-sm font-bold">{versionDetail.version_label}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="block font-bold text-slate-400 uppercase tracking-wider">Status</span>
                      <span className="mt-0.5 inline-block text-[10px] font-bold px-2 py-0.5 rounded border bg-white border-slate-200 text-slate-700">
                        {versionDetail.is_active === 1 || versionDetail.is_active === true ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="block font-bold text-slate-400 uppercase tracking-wider">Target Role</span>
                      <span className="text-slate-800 text-sm font-semibold">{versionDetail.target_role || '—'}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="block font-bold text-slate-400 uppercase tracking-wider">Created</span>
                      <span className="text-slate-600 text-sm">{formatDate(versionDetail.created_at)}</span>
                    </div>
                    <div className="sm:col-span-2 pt-2 border-t border-slate-200/60 flex flex-col space-y-1">
                      <div>
                        <span className="font-bold text-slate-400 uppercase tracking-wider mr-2">File Status:</span>
                        <span className={`inline-flex items-center text-xs font-semibold ${versionDetail.has_file ? 'text-emerald-600' : 'text-slate-500'}`}>
                          {versionDetail.has_file ? 'Resume file linked' : 'No resume file linked'}
                        </span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-400 uppercase tracking-wider mr-2">AI Integration:</span>
                        <span className={`inline-flex items-center text-xs font-semibold ${versionDetail.ai_context ? 'text-indigo-600' : 'text-slate-500'}`}>
                          {versionDetail.ai_context ? 'AI Context Transcript Configured' : 'No AI Context Profile Added'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Historical ATS Tracking Score Block Matrix */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1">
                      ATS History
                    </h4>
                    {!versionDetail.historical_ats_scores || versionDetail.historical_ats_scores.length === 0 ? (
                      <p className="text-slate-400 text-xs font-medium italic">
                        No ATS analysis history for this version.
                      </p>
                    ) : (
                      <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                              <th className="py-2.5 px-3">Match Score</th>
                              <th className="py-2.5 px-3">Analyzed Date</th>
                              <th className="py-2.5 px-3 text-right">Opportunity Reference</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {versionDetail.historical_ats_scores.map((score) => (
                              <tr key={score.id} className="hover:bg-slate-50/50">
                                <td className="py-2.5 px-3 text-indigo-600 font-extrabold text-sm">
                                  {score.match_score}%
                                </td>
                                <td className="py-2.5 px-3 text-slate-600">
                                  {formatDate(score.analyzed_at)}
                                </td>
                                <td className="py-2.5 px-3 text-right text-slate-400 font-mono text-[10px] truncate max-w-[140px]">
                                  {score.opportunity_id || '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-150 bg-slate-50 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsVersionDetailsOpen(false)}
                className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}