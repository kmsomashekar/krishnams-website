import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

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
  if (!id) return null;
  const res = await fetch(`/api/v1/resumes/${id}`);
  return handleResponse(res, 'Failed to load resume details.');
}

async function fetchCompanies() {
  const res = await fetch('/api/v1/companies');
  return handleResponse(res, 'Failed to load companies.');
}

async function createCompany(payload) {
  const res = await fetch('/api/v1/companies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleResponse(res, 'Failed to create company record.');
}

async function createOpportunity(payload) {
  const res = await fetch('/api/v1/opportunities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleResponse(res, 'Failed to save opportunity.');
}

async function createJobDescription({ opportunityId, rawText }) {
  const res = await fetch(`/api/v1/opportunities/${opportunityId}/job-description`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw_text: rawText })
  });
  return handleResponse(res, 'Failed to attach job description.');
}

async function createAtsAnalysis({ opportunityId, payload }) {
  const res = await fetch(`/api/v1/opportunities/${opportunityId}/ats-analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  return handleResponse(res, 'Failed to save ATS analysis.');
}
async function runJDAnalysis(payload) {
  const res = await fetch('/api/v1/jd-analyzer/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleResponse(res, 'Failed to analyze job description.');
}

async function runJDChat(payload) {
  const res = await fetch('/api/v1/jd-analyzer/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleResponse(res, 'Failed to retrieve AI advice.');
}

export default function JDAnalyzer() {
  // --- FORM STATES ---
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jdUrl, setJdUrl] = useState('');
  const [jdText, setJdText] = useState('');

  // --- WORKSPACE RESULTS & CONTEXTS ---
  const [analysisResult, setAnalysisResult] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const [serverError, setServerError] = useState(null);

  // --- CHAT CONVERSATION STATES ---
  const [chatMessages, setChatMessages] = useState([]);
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatError, setChatError] = useState(null);

  // --- SAVE AS OPPORTUNITY INTERACTION STATES ---
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveCompanyText, setSaveCompanyText] = useState('');
  const [saveJobTitle, setSaveJobTitle] = useState('');
  const [saveJdUrl, setSaveJdUrl] = useState('');
  const [saveLocalError, setSaveLocalError] = useState(null);
  const [savedOpportunityId, setSavedOpportunityId] = useState(null);
  const [partialOpportunityId, setPartialOpportunityId] = useState(null);
  const [partialJdSaved, setPartialJdSaved] = useState(false);

  // --- BASE QUERIES ---
  const { data: resumesData, isLoading: isResumesLoading } = useQuery({
    queryKey: ['jd-analyzer-resumes'],
    queryFn: fetchResumes
  });
  const resumesList = resumesData?.resumes || [];

  const { data: resumeDetail, isLoading: isVersionsLoading } = useQuery({
    queryKey: ['jd-analyzer-resume-detail', selectedResumeId],
    queryFn: () => fetchResumeDetail(selectedResumeId),
    enabled: !!selectedResumeId
  });
  const versionsList = resumeDetail?.versions || [];

  const { data: companiesData, refetch: refetchCompanies } = useQuery({
    queryKey: ['jd-analyzer-companies'],
    queryFn: fetchCompanies,
    enabled: isSaveModalOpen
  });
  const companiesList = companiesData?.companies || [];

  // --- AUTO-SELECTION LOGIC ---
  useEffect(() => {
    if (resumesList.length === 1 && !selectedResumeId) {
      setSelectedResumeId(resumesList[0].id);
    }
  }, [resumesList, selectedResumeId]);

  useEffect(() => {
    if (versionsList.length > 0) {
      const activeVersion = versionsList.find(v => v.is_active === 1 || v.is_active === true);
      if (activeVersion) {
        setSelectedVersionId(activeVersion.id);
      } else if (versionsList.length === 1) {
        setSelectedVersionId(versionsList[0].id);
      } else {
        setSelectedVersionId('');
      }
    } else {
      setSelectedVersionId('');
    }
  }, [versionsList]);

  // --- FORM MODIFICATION TRIPPERS (CLEARING STALE ANALYSIS/CHAT/SAVE STATUS) ---
  const handleResumeChange = (e) => {
    setSelectedResumeId(e.target.value);
    setSelectedVersionId('');
    setAnalysisResult(null);
    setChatMessages([]);
    setChatQuestion('');
    setChatError(null);
    setValidationError(null);
    setServerError(null);
    setSavedOpportunityId(null);
    setPartialOpportunityId(null);
    setPartialJdSaved(false);
  };

  const handleVersionChange = (e) => {
    setSelectedVersionId(e.target.value);
    setAnalysisResult(null);
    setChatMessages([]);
    setChatQuestion('');
    setChatError(null);
    setValidationError(null);
    setServerError(null);
    setSavedOpportunityId(null);
    setPartialOpportunityId(null);
    setPartialJdSaved(false);
  };

  const handleJdTextChange = (e) => {
    setJdText(e.target.value);
    if (analysisResult) {
      setAnalysisResult(null);
      setChatMessages([]);
      setChatQuestion('');
      setChatError(null);
      setValidationError(null);
      setServerError(null);
      setSavedOpportunityId(null);
      setPartialOpportunityId(null);
      setPartialJdSaved(false);
    }
  };

  // --- RESET HANDLER ---
  const handleClearAnalysis = () => {
    setAnalysisResult(null);
    setValidationError(null);
    setServerError(null);
    setCompany('');
    setJobTitle('');
    setJdUrl('');
    setJdText('');
    setChatMessages([]);
    setChatQuestion('');
    setChatError(null);
    setSavedOpportunityId(null);
    setPartialOpportunityId(null);
    setPartialJdSaved(false);
  };

  // --- STRUCTURED ANALYSIS MUTATION ---
  const analyzeMutation = useMutation({
    mutationFn: runJDAnalysis,
    onSuccess: (data) => {
      setAnalysisResult(data);
      setServerError(null);
      setChatMessages([]);
      setChatQuestion('');
      setChatError(null);
      setSavedOpportunityId(null);
      setPartialOpportunityId(null);
      setPartialJdSaved(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onError: (err) => {
      setServerError(err.message || 'AI Fit Assessment is temporarily unavailable. Please try again.');
    }
  });

  // --- CONVERSATIONAL CHAT MUTATION ---
  const chatMutation = useMutation({
    mutationFn: runJDChat,
    onSuccess: (data, variables) => {
      const serverResponse = data.response;
      setChatMessages((prev) => [
        ...prev,
        { role: 'user', content: variables.question },
        {
          role: 'assistant',
          content: serverResponse.answer,
          evidence_status: serverResponse.evidence_status,
          supporting_evidence: serverResponse.supporting_evidence || [],
          caution: serverResponse.caution || null
        }
      ]);
      setChatQuestion('');
      setChatError(null);
    },
    onError: (err) => {
      setChatError(err.message || 'The AI Fit Advisor failed to process your question. Please try again.');
    }
  });

  // --- SAVE OPPORTUNITY DUAL MUTATION HANDLER WITH SYNCHRONOUS ERROR METADATA DISTINCTION ---
  const saveOpportunityMutation = useMutation({
    mutationFn: async (payload) => {
      let targetOpportunityId = partialOpportunityId;
        let jdSavedThisAttempt = partialJdSaved;

      try {
        // Step 1 & 2: Create Opportunity only if one was not already partially created
        if (!targetOpportunityId) {
          let targetCompanyId = null;
          const matchName = payload.companyName.trim().toLowerCase();
          
          const existingCompany = companiesList.find(
            c => c.name.trim().toLowerCase() === matchName
          );

          if (existingCompany) {
            targetCompanyId = existingCompany.id;
          } else {
            const newCompany = await createCompany({ name: payload.companyName.trim() });
            targetCompanyId = newCompany.id;
            await refetchCompanies();
          }

          const newOpportunity = await createOpportunity({
            company_id: targetCompanyId,
            resume_version_id: selectedVersionId || null,
            job_title: payload.jobTitle.trim(),
            application_url: payload.jdUrl.trim() || undefined,
            priority: 3,
            date_identified: new Date().toISOString().split('T')[0]
          });

          targetOpportunityId = newOpportunity.id;
        }

        // Step 4: POST exact analyzed jdText to job-description endpoint
        // Step 4: Save the Job Description only if it has not already
        // been saved during a previous partial attempt.
        if (jdText.trim().length > 0 && !partialJdSaved) {
        await createJobDescription({
        opportunityId: targetOpportunityId,
        rawText: jdText.trim()
  });
  jdSavedThisAttempt = true;
  setPartialJdSaved(true);
}

        // Step 5: Persist the already-generated ATS analysis.
  // This does NOT call the AI again.
      if (analysisResult?.analysis && selectedVersionId) {
  const analysis = analysisResult.analysis;

  await createAtsAnalysis({
    opportunityId: targetOpportunityId,
    payload: {
      resume_version_id: selectedVersionId,
      match_score: analysis.match_score,
      missing_keywords: [],
      skill_gaps: Array.isArray(analysis.gaps) ? analysis.gaps : [],
      improvement_suggestions: Array.isArray(analysis.resume_opportunities)
      ? analysis.resume_opportunities
      .map((item) =>
        typeof item === 'string'
          ? item
          : item?.suggestion || item?.area || ''
        )
      .filter(Boolean)
      .join('\n')
    : '',
      analysis_json: analysis
    }
  });
}
        return targetOpportunityId;
      } catch (innerErr) {
      // Preserve partial-save state so retries can resume from the correct step.
      const failedOpportunityId = targetOpportunityId;
      const enhancedError = new Error(innerErr.message || 'Save error');

      enhancedError.createdOpportunityId = failedOpportunityId;
      enhancedError.jdSaved = jdSavedThisAttempt;
      throw enhancedError;
    }

    },
    onSuccess: (opportunityId) => {
      setSavedOpportunityId(opportunityId);
      setPartialOpportunityId(null);
      setIsSaveModalOpen(false);
      setSaveLocalError(null);
      setPartialJdSaved(false);
    },
    onError: (err) => {
  const createdId = err.createdOpportunityId;

  if (createdId) {
    setPartialOpportunityId(createdId);

    if (err.jdSaved) {
      setPartialJdSaved(true);
      setSaveLocalError(
        "Opportunity and Job Description were saved, but the ATS analysis could not be saved. Retry to complete the ATS save."
      );
    } else {
      setPartialJdSaved(false);
      setSaveLocalError(
        "Opportunity was created, but the Job Description could not be attached."
      );
    }
  } else {
    setPartialJdSaved(false);
    setSaveLocalError(
      err.message || 'Failed to save role to Opportunities system.'
    );
  }
}
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError(null);
    setServerError(null);

    if (!selectedResumeId) {
      setValidationError('Please select a Resume.');
      return;
    }
    if (!selectedVersionId) {
      setValidationError('Please select a Resume Version.');
      return;
    }
    if (!jdText.trim()) {
      setValidationError('Job Description text cannot be empty.');
      return;
    }

    analyzeMutation.mutate({
      resume_id: selectedResumeId,
      version_id: selectedVersionId,
      jd_text: jdText.trim(),
      company: company.trim() || undefined,
      job_title: jobTitle.trim() || undefined,
      jd_url: jdUrl.trim() || undefined
    });
  };

  const handleOpenSaveModal = () => {
    setSaveCompanyText(company || '');
    setSaveJobTitle(jobTitle || '');
    setSaveJdUrl(jdUrl || '');
    setSaveLocalError(null);
    setIsSaveModalOpen(true);
  };

  const handleExecuteSaveOpportunity = (e) => {
    e.preventDefault();
    setSaveLocalError(null);

    if (!partialOpportunityId) {
      if (!saveCompanyText.trim()) {
        setSaveLocalError('Company Name is required.');
        return;
      }
      if (!saveJobTitle.trim()) {
        setSaveLocalError('Job Title is required.');
        return;
      }
    }

    saveOpportunityMutation.mutate({
      companyName: saveCompanyText,
      jobTitle: saveJobTitle,
      jdUrl: saveJdUrl
    });
  };

  // --- SEND CHAT QUESTION ACTION ENGINE ---
  const executeAskQuestion = (questionText) => {
    if (chatMutation.isPending || analyzeMutation.isPending) return;
    setChatError(null);

    const cleanQuestion = questionText.trim();
    if (!cleanQuestion) return;

    if (cleanQuestion.length > 5000) {
      setChatError('Your question exceeds the maximum validation limit of 5,000 characters.');
      return;
    }

    const userMessageCount = chatMessages.filter(m => m.role === 'user').length;
    if (userMessageCount >= 10) {
      setChatError('Conversation limit reached for this analysis. Clear the workspace to start a new analysis.');
      return;
    }

    const historicalPayload = chatMessages.map(({ role, content }) => ({ role, content }));

    chatMutation.mutate({
      resume_id: selectedResumeId,
      version_id: selectedVersionId,
      jd_text: jdText.trim(),
      analysis: analysisResult.analysis,
      messages: historicalPayload,
      question: cleanQuestion
    });
  };

  const handleChatSubmit = (e) => {
    e.preventDefault();
    executeAskQuestion(chatQuestion);
  };

  // --- FORMATTING TRANSLATIONS ---
  const getRecommendationLabel = (rec) => {
    switch (rec) {
      case 'STRONG_APPLY': return 'Strong Apply';
      case 'APPLY': return 'Apply';
      case 'LOW_MATCH': return 'Low Match';
      default: return rec || '—';
    }
  };

  const getRecommendationClass = (rec) => {
    switch (rec) {
      case 'STRONG_APPLY': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'APPLY': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'LOW_MATCH': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getImpactLabel = (impact) => {
    switch (impact) {
      case 'HIGH': return 'High';
      case 'MEDIUM': return 'Medium';
      case 'LOW': return 'Low';
      default: return impact || '—';
    }
  };

  const getImpactClass = (impact) => {
    switch (impact) {
      case 'HIGH': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'MEDIUM': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'LOW': return 'bg-slate-100 text-slate-600 border-slate-200';
      default: return 'bg-slate-50 text-slate-500';
    }
  };

  const getEvidenceStatusLabel = (status) => {
    switch (status) {
      case 'DEMONSTRATED': return 'Demonstrated';
      case 'TRANSFERABLE': return 'Transferable';
      case 'GAP': return 'Gap / Not Evidenced';
      case 'MIXED': return 'Mixed Evidence';
      default: return status || 'Unknown';
    }
  };

  const getEvidenceStatusClass = (status) => {
    switch (status) {
      case 'DEMONSTRATED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'TRANSFERABLE': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'GAP': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'MIXED': return 'bg-slate-100 text-slate-700 border-slate-300';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const quickQuestions = [
    { label: 'Biggest risks?', query: 'What are my biggest risks or weaknesses for this role?' },
    { label: 'Which gaps matter most?', query: 'Which gaps are most likely to matter in the hiring decision?' },
    { label: 'Interview focus?', query: 'What should I emphasize most if I get an interview for this role?' },
    { label: 'What should I avoid claiming?', query: 'Based on my saved Resume AI Context, what should I avoid claiming for this role?' }
  ];

  const totalUserMessages = chatMessages.filter(m => m.role === 'user').length;
  const isConversationLimitReached = totalUserMessages >= 10;

  return (
    <div className="space-y-6 pb-12 relative">
      {/* Workspace Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">JD Analyzer</h1>
        <p className="text-slate-500 text-sm mt-1">
          Evaluate a job description against your resume before creating an Opportunity.
        </p>
      </div>

      {/* Local Error Block Views */}
      {validationError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-md text-sm font-medium shadow-sm">
          {validationError}
        </div>
      )}

      {serverError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-md text-sm shadow-sm">
          <span className="font-bold block mb-0.5">Analysis Failed</span>
          <p className="text-xs opacity-90">{serverError}</p>
        </div>
      )}

      {/* Main Form/Results Split Configuration Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Side: Input Param Form Fields */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
            Analysis Parameters
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Select Resume *
              </label>
              <select
                disabled={isResumesLoading || analyzeMutation.isPending || chatMutation.isPending || saveOpportunityMutation.isPending}
                value={selectedResumeId}
                onChange={handleResumeChange}
                className="w-full rounded border border-slate-300 px-3 py-2 text-xs focus:outline-indigo-500 disabled:bg-slate-50"
              >
                <option value="">-- Choose Resume --</option>
                {resumesList.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Select Version *
              </label>
              <select
                disabled={isVersionsLoading || !selectedResumeId || analyzeMutation.isPending || chatMutation.isPending || saveOpportunityMutation.isPending}
                value={selectedVersionId}
                onChange={handleVersionChange}
                className="w-full rounded border border-slate-300 px-3 py-2 text-xs focus:outline-indigo-500 disabled:bg-slate-50"
              >
                <option value="">-- Choose Target Version --</option>
                {versionsList.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.version_label} {v.target_role ? `(${v.target_role})` : ''} {v.is_active ? '[Active]' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Company (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acme Corp"
                  disabled={analyzeMutation.isPending || chatMutation.isPending || saveOpportunityMutation.isPending}
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs focus:outline-indigo-500 disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Job Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Senior Security Director"
                  disabled={analyzeMutation.isPending || chatMutation.isPending || saveOpportunityMutation.isPending}
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs focus:outline-indigo-500 disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  JD URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://jobs.example.com/spec"
                  disabled={analyzeMutation.isPending || chatMutation.isPending || saveOpportunityMutation.isPending}
                  value={jdUrl}
                  onChange={(e) => setJdUrl(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs focus:outline-indigo-500 disabled:bg-slate-50"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                  Job Description Text *
                </label>
                <span className="text-[10px] text-slate-400">
                  {jdText.length.toLocaleString()} / 100,000 max
                </span>
              </div>
              <textarea
                rows="10"
                required
                placeholder="Paste the complete job description here..."
                disabled={analyzeMutation.isPending || chatMutation.isPending || saveOpportunityMutation.isPending}
                value={jdText}
                onChange={handleJdTextChange}
                maxLength={100000}
                className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs font-sans focus:outline-indigo-500 resize-y disabled:bg-slate-50"
              />
            </div>

            <div className="pt-2 flex flex-col space-y-2">
              <button
                type="submit"
                disabled={analyzeMutation.isPending || chatMutation.isPending || saveOpportunityMutation.isPending}
                className="w-full inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded hover:bg-indigo-500 shadow-sm transition-colors disabled:opacity-60"
              >
                {analyzeMutation.isPending ? 'Analyzing JD...' : 'Analyze JD'}
              </button>
              
              {(analysisResult || jdText || company || jobTitle || jdUrl || chatMessages.length > 0) && (
                <button
                  type="button"
                  onClick={handleClearAnalysis}
                  disabled={analyzeMutation.isPending || chatMutation.isPending || saveOpportunityMutation.isPending}
                  className="w-full px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Clear Workspace
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right Side: Active Analysis Target Displays & Follow-up Conversations */}
        <div className="lg:col-span-2 space-y-6">
          {analyzeMutation.isPending && (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="text-slate-700 font-medium text-sm">Analyzing Job Description...</p>
              <p className="text-slate-400 text-xs max-w-xs">
                Comparing the job requirements with your saved Resume AI Context.
              </p>
            </div>
          )}

          {!analysisResult && !analyzeMutation.isPending && (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 shadow-sm font-medium text-sm">
              Select a Resume Version and paste a job description to analyze the match.
            </div>
          )}

          {analysisResult && !analyzeMutation.isPending && (
            <div className="space-y-6">
              
              {/* Core Match Overview Assessment Block */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
                <div className="text-center sm:text-left space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">AI-Estimated Match</span>
                  <span className="text-4xl font-extrabold text-slate-900 tracking-tight block">
                    {analysisResult.analysis.match_score}%
                  </span>
                  <span className="text-[10px] text-slate-400 block font-medium">AI-Estimated Match</span>
                </div>
                
                <div className="text-center space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recommendation</span>
                  <span className={`inline-block px-3 py-1 text-xs font-bold tracking-wider uppercase border rounded ${getRecommendationClass(analysisResult.analysis.recommendation)}`}>
                    {getRecommendationLabel(analysisResult.analysis.recommendation)}
                  </span>
                  
                  {/* Save as Opportunity Strategic Workspace Action Anchor */}
                  <div className="pt-1">
                    {savedOpportunityId ? (
                      <div className="flex flex-col items-center space-y-1">
                        <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 border border-emerald-200 rounded shadow-sm">
                          Saved as Opportunity
                        </span>
                        <Link
                          to={`/opportunities/${savedOpportunityId}`}
                          className="text-[10px] text-indigo-600 font-bold hover:underline"
                        >
                          View Opportunity →
                        </Link>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleOpenSaveModal}
                        disabled={saveOpportunityMutation.isPending}
                        className="w-full inline-flex items-center justify-center px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded hover:bg-indigo-500 shadow-sm transition-colors disabled:opacity-50"
                      >
                        {saveOpportunityMutation.isPending ? 'Saving...' : partialOpportunityId ? 'Retry JD Save' : 'Save as Opportunity'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="sm:border-l sm:border-slate-100 sm:pl-6 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Summary</span>
                  <p className="text-slate-700 text-xs leading-relaxed font-medium">
                    {analysisResult.analysis.summary}
                  </p>
                </div>
              </div>

              {/* Strong Matches Block Group */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1.5 text-emerald-700">
                  Strong Matches
                </h3>
                {!analysisResult.analysis.strong_matches || analysisResult.analysis.strong_matches.length === 0 ? (
                  <p className="text-slate-400 text-xs italic">No significant strong matches identified.</p>
                ) : (
                  <div className="space-y-3">
                    {analysisResult.analysis.strong_matches.map((item, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium space-y-1">
                        <span className="text-slate-900 font-bold block">{item.requirement}</span>
                        <p className="text-slate-600"><span className="font-bold text-slate-400 mr-1">Evidence:</span>{item.evidence}</p>
                        <p className="text-indigo-600 text-[11px]"><span className="font-bold text-slate-400 mr-1">Reason:</span>{item.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Partial / Transferable Matches Block Group */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1.5 text-indigo-700">
                  Partial & Transferable Matches
                </h3>
                {!analysisResult.analysis.partial_matches || analysisResult.analysis.partial_matches.length === 0 ? (
                  <p className="text-slate-400 text-xs italic">No partial or transferable matches identified.</p>
                ) : (
                  <div className="space-y-3">
                    {analysisResult.analysis.partial_matches.map((item, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium space-y-1.5">
                        <span className="text-slate-900 font-bold block">{item.requirement}</span>
                        <div className="space-y-0.5 text-slate-600 text-[11px]">
                          {item.evidence && <p><span className="font-bold text-slate-400 mr-1">Evidence:</span>{item.evidence}</p>}
                          <p><span className="font-bold text-slate-400 mr-1">Reason:</span>{item.reason}</p>
                        </div>
                        {item.positioning && (
                          <div className="bg-indigo-50/50 border border-indigo-100 p-2 rounded text-[11px] text-indigo-800">
                            <span className="font-bold block text-[10px] uppercase tracking-wider text-indigo-500 mb-0.5">Positioning</span>
                            {item.positioning}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Potential Gaps Block Group */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1.5 text-amber-700">
                  Potential Gaps
                </h3>
                {!analysisResult.analysis.gaps || analysisResult.analysis.gaps.length === 0 ? (
                  <p className="text-slate-500 text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-100 p-2.5 rounded-lg">
                    No significant gaps identified.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {analysisResult.analysis.gaps.map((item, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1 flex-1">
                          <span className="text-slate-900 font-bold block">{item.requirement}</span>
                          <p className="text-slate-500 text-[11px] font-normal leading-relaxed">{item.reason}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border shrink-0 self-start ${getImpactClass(item.impact)}`}>
                          {getImpactLabel(item.impact)} Impact
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Resume Opportunities Section */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1.5 text-slate-700">
                  Resume Opportunities
                </h3>
                {!analysisResult.analysis.resume_opportunities || analysisResult.analysis.resume_opportunities.length === 0 ? (
                  <p className="text-slate-400 text-xs italic">No specific optimization opportunities identified.</p>
                ) : (
                  <div className="space-y-3">
                    {analysisResult.analysis.resume_opportunities.map((item, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium space-y-1">
                        <span className="text-slate-900 font-bold block text-[11px] text-indigo-900">Area: {item.area}</span>
                        <p className="text-slate-700"><span className="font-bold text-slate-400 mr-1">Suggestion:</span>{item.suggestion}</p>
                        {item.evidence && <p className="text-slate-500 text-[11px]"><span className="font-bold text-slate-400 mr-1">Evidence:</span>{item.evidence}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Chat Advisor Workspace Area */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">Ask About This Role</h3>
                  <p className="text-slate-500 text-[11px] font-medium mt-0.5">
                    Ask follow-up questions about your fit, gaps, positioning, or interview focus.
                  </p>
                </div>

                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                  {chatMessages.length === 0 && !chatMutation.isPending && (
                    <p className="text-slate-400 text-xs font-medium italic py-2">
                      Ask about blockers, transferable experience, interview positioning, or what not to claim.
                    </p>
                  )}

                  {chatMessages.map((msg, idx) => {
                    const isUser = msg.role === 'user';
                    return (
                      <div key={idx} className={`flex flex-col space-y-1.5 max-w-[85%] ${isUser ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {isUser ? 'You' : 'JD / Resume Fit Advisor'}
                        </span>
                        <div className={`p-3 rounded-lg border text-xs font-medium leading-relaxed whitespace-pre-wrap ${
                          isUser 
                            ? 'bg-indigo-600 border-indigo-700 text-white' 
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}>
                          {msg.content}
                        </div>

                        {!isUser && (
                          <div className="w-full space-y-2 mt-1.5 pl-1">
                            {msg.evidence_status && (
                              <div className="flex items-center space-x-1.5">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Capability Status:</span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide border uppercase ${getEvidenceStatusClass(msg.evidence_status)}`}>
                                  {getEvidenceStatusLabel(msg.evidence_status)}
                                </span>
                              </div>
                            )}

                            {Array.isArray(msg.supporting_evidence) && msg.supporting_evidence.length > 0 && (
                              <div className="bg-slate-100/60 border border-slate-200 rounded p-2 text-[11px] text-slate-700 w-full">
                                <span className="font-bold text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Supporting Evidence</span>
                                <ul className="list-disc list-inside space-y-0.5">
                                  {msg.supporting_evidence.map((item, eIdx) => (
                                    <li key={eIdx} className="font-medium text-slate-600">{item}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {msg.caution && (
                              <div className="bg-amber-50 border border-amber-200 rounded p-2 text-[11px] text-amber-900 w-full font-medium">
                                <span className="font-bold text-[10px] uppercase tracking-wider text-amber-500 block mb-0.5">Important Caution</span>
                                {msg.caution}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {chatMutation.isPending && (
                    <div className="flex flex-col space-y-1 items-start max-w-[80%]">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider animate-pulse">
                        JD / Resume Fit Advisor
                      </span>
                      <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs font-semibold text-slate-500 tracking-wide flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        <span className="pl-1">Thinking...</span>
                      </div>
                    </div>
                  )}
                </div>

                {chatError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded text-xs font-semibold shadow-sm">
                    {chatError}
                  </div>
                )}

                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Suggested Questions</span>
                  <div className="flex flex-wrap gap-2">
                    {quickQuestions.map((chip, qIdx) => (
                      <button
                        key={qIdx}
                        type="button"
                        disabled={chatMutation.isPending || isConversationLimitReached}
                        onClick={() => executeAskQuestion(chip.query)}
                        className="px-2.5 py-1 text-[11px] font-bold bg-slate-50 border border-slate-300 rounded-full hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 transition-all text-slate-600 disabled:opacity-40 disabled:hover:bg-slate-50 disabled:hover:border-slate-300 disabled:hover:text-slate-600"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleChatSubmit} className="pt-2 flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      aria-label="Ask follow-up question"
                      placeholder={isConversationLimitReached ? "Conversation limit reached for this session." : "Type a follow-up question about your fit..."}
                      disabled={chatMutation.isPending || isConversationLimitReached}
                      value={chatQuestion}
                      onChange={(e) => setChatQuestion(e.target.value)}
                      maxLength={5000}
                      className="w-full rounded border border-slate-300 pl-3 pr-16 py-2 text-xs font-medium focus:outline-indigo-500 disabled:bg-slate-50"
                    />
                    <span className="absolute right-3 top-2.5 text-[9px] font-bold text-slate-400">
                      {chatQuestion.length.toLocaleString()} / 5,000
                    </span>
                  </div>
                  <button
                    type="submit"
                    disabled={chatMutation.isPending || !chatQuestion.trim() || isConversationLimitReached}
                    className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded hover:bg-indigo-500 shadow-sm transition-colors disabled:opacity-50 shrink-0"
                  >
                    Ask AI
                  </button>
                </form>

                {isConversationLimitReached && (
                  <p className="text-[11px] text-amber-600 font-semibold italic text-center">
                    Conversation limit reached for this analysis. Clear the workspace to start a new analysis.
                  </p>
                )}
              </div>

            </div>
          )}
        </div>

      </div>

      {/* =======================================================
          MODULE: MODAL ENVELOPE CONFIGURATION (SAVE OPPORTUNITY FORM)
          ======================================================= */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {partialOpportunityId ? "Complete Opportunity Save" : "Save as Opportunity"}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  {partialOpportunityId ? "The Opportunity was created. Retry attaching the Job Description." : "Add this role to Opportunities for tracking."}
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                disabled={saveOpportunityMutation.isPending}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 rounded hover:bg-slate-200 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteSaveOpportunity} className="p-5 space-y-4 text-xs font-medium">
              {saveLocalError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded text-[11px] font-semibold">
                  {saveLocalError}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corporation"
                  disabled={saveOpportunityMutation.isPending || Boolean(partialOpportunityId)}
                  value={saveCompanyText}
                  onChange={(e) => setSaveCompanyText(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 focus:outline-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Job Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Security Engineer"
                  disabled={saveOpportunityMutation.isPending || Boolean(partialOpportunityId)}
                  value={saveJobTitle}
                  onChange={(e) => setSaveJobTitle(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 focus:outline-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Job Spec URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/jobs/spec"
                  disabled={saveOpportunityMutation.isPending || Boolean(partialOpportunityId)}
                  value={saveJdUrl}
                  onChange={(e) => setSaveJdUrl(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 focus:outline-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  disabled={saveOpportunityMutation.isPending}
                  className="px-4 py-2 font-bold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveOpportunityMutation.isPending}
                  className="px-4 py-2 font-bold text-white bg-indigo-600 rounded hover:bg-indigo-500 shadow-sm transition-colors disabled:opacity-50"
                >
                  {saveOpportunityMutation.isPending ? 'Saving...' : partialOpportunityId ? 'Retry JD Save' : 'Save Opportunity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}