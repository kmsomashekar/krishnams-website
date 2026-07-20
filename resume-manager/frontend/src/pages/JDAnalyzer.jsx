import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';

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

async function runJDAnalysis(payload) {
  const res = await fetch('/api/v1/jd-analyzer/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleResponse(res, 'Failed to analyze job description.');
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

  // --- RESET HANDLER ---
  const handleClearAnalysis = () => {
    setAnalysisResult(null);
    setValidationError(null);
    setServerError(null);
    setCompany('');
    setJobTitle('');
    setJdUrl('');
    setJdText('');
  };

  // --- MUTATION RUNNER ---
  const analyzeMutation = useMutation({
    mutationFn: runJDAnalysis,
    onSuccess: (data) => {
      setAnalysisResult(data.analysis);
      setServerError(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onError: (err) => {
      setServerError(err.message || 'AI Fit Assessment is temporarily unavailable. Please try again.');
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

  return (
    <div className="space-y-6 pb-12">
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
                disabled={isResumesLoading || analyzeMutation.isPending}
                value={selectedResumeId}
                onChange={(e) => {
                  setSelectedResumeId(e.target.value);
                  setSelectedVersionId('');
                }}
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
                disabled={isVersionsLoading || !selectedResumeId || analyzeMutation.isPending}
                value={selectedVersionId}
                onChange={(e) => setSelectedVersionId(e.target.value)}
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
                  disabled={analyzeMutation.isPending}
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
                  disabled={analyzeMutation.isPending}
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
                  disabled={analyzeMutation.isPending}
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
                disabled={analyzeMutation.isPending}
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                maxLength={100000}
                className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs font-sans focus:outline-indigo-500 resize-y disabled:bg-slate-50"
              />
            </div>

            <div className="pt-2 flex flex-col space-y-2">
              <button
                type="submit"
                disabled={analyzeMutation.isPending}
                className="w-full inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded hover:bg-indigo-500 shadow-sm transition-colors disabled:opacity-60"
              >
                {analyzeMutation.isPending ? 'Analyzing JD...' : 'Analyze JD'}
              </button>
              
              {(analysisResult || jdText || company || jobTitle || jdUrl) && (
                <button
                  type="button"
                  onClick={handleClearAnalysis}
                  disabled={analyzeMutation.isPending}
                  className="w-full px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Clear Workspace
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right Side: Active Analysis Target Displays */}
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
              
              {/* Core Match Overview Assessment */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
                <div className="text-center sm:text-left space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">AI-Estimated Match</span>
                  <span className="text-4xl font-extrabold text-slate-900 tracking-tight block">
                    {analysisResult.match_score}%
                  </span>
                  <span className="text-[10px] text-slate-400 block font-medium">AI-Estimated Match</span>
                </div>
                
                <div className="text-center space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recommendation</span>
                  <span className={`inline-block px-3 py-1 text-xs font-bold tracking-wider uppercase border rounded ${getRecommendationClass(analysisResult.recommendation)}`}>
                    {getRecommendationLabel(analysisResult.recommendation)}
                  </span>
                </div>

                <div className="sm:border-l sm:border-slate-100 sm:pl-6 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Summary</span>
                  <p className="text-slate-700 text-xs leading-relaxed font-medium">
                    {analysisResult.summary}
                  </p>
                </div>
              </div>

              {/* Strong Matches Block Group */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1.5 text-emerald-700">
                  Strong Matches
                </h3>
                {!analysisResult.strong_matches || analysisResult.strong_matches.length === 0 ? (
                  <p className="text-slate-400 text-xs italic">No significant strong matches identified.</p>
                ) : (
                  <div className="space-y-3">
                    {analysisResult.strong_matches.map((item, idx) => (
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
                {!analysisResult.partial_matches || analysisResult.partial_matches.length === 0 ? (
                  <p className="text-slate-400 text-xs italic">No partial or transferable matches identified.</p>
                ) : (
                  <div className="space-y-3">
                    {analysisResult.partial_matches.map((item, idx) => (
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
                {!analysisResult.gaps || analysisResult.gaps.length === 0 ? (
                  <p className="text-slate-500 text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-100 p-2.5 rounded-lg">
                    No significant gaps identified.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {analysisResult.gaps.map((item, idx) => (
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

              {/* Resume Opportunities */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1.5 text-slate-700">
                  Resume Opportunities
                </h3>
                {!analysisResult.resume_opportunities || analysisResult.resume_opportunities.length === 0 ? (
                  <p className="text-slate-400 text-xs italic">No specific optimization opportunities identified.</p>
                ) : (
                  <div className="space-y-3">
                    {analysisResult.resume_opportunities.map((item, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium space-y-1">
                        <span className="text-slate-900 font-bold block text-[11px] text-indigo-900">Area: {item.area}</span>
                        <p className="text-slate-700"><span className="font-bold text-slate-400 mr-1">Suggestion:</span>{item.suggestion}</p>
                        {item.evidence && <p className="text-slate-500 text-[11px]"><span className="font-bold text-slate-400 mr-1">Evidence:</span>{item.evidence}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}