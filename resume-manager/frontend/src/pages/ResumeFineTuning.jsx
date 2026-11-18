import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

async function readApi(res, fallback) {
  let body;
  try { body = await res.json(); } catch (_) { throw new Error(fallback); }
  if (!res.ok || !body?.success) throw new Error(body?.error?.message || fallback);
  return body.data;
}

async function fetchSession(sessionId) {
  return readApi(await fetch(`/api/v1/customisation-sessions/${sessionId}`), 'Unable to load the fine-tuning session.');
}

async function fetchEvidence() {
  return readApi(await fetch('/api/v1/resume-evidence'), 'Unable to load the evidence repository.');
}

async function saveEvidence(sessionId, evidenceIds) {
  return readApi(await fetch(`/api/v1/customisation-sessions/${sessionId}/evidence`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ evidence_ids: evidenceIds })
  }), 'Unable to save selected evidence.');
}

async function generateProposals(sessionId, regenerate = false) {
  return readApi(await fetch(`/api/v1/customisation-sessions/${sessionId}/proposals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ regenerate })
  }), 'Unable to generate resume proposals.');
}

async function saveReview(sessionId, payload) {
  return readApi(await fetch(`/api/v1/customisation-sessions/${sessionId}/proposals`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }), 'Unable to save the proposal review.');
}

export default function ResumeFineTuning() {
  const { id: opportunityId, sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [evidence, setEvidence] = useState([]);
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState([]);
  const [savingEvidence, setSavingEvidence] = useState(false);
  const [proposals, setProposals] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadSession = async () => {
    setLoading(true);
    setError('');
    try {
      const [result, evidenceResult] = await Promise.all([fetchSession(sessionId), fetchEvidence()]);
      setSession(result);
      setProposals(result.proposals || null);
      const verifiedEvidence = (evidenceResult?.evidence || []).filter(item => item.verification_status === 'VERIFIED');
      setEvidence(verifiedEvidence);
      const savedEvidence = Array.isArray(result.evidence_snapshot) ? result.evidence_snapshot : [];
      setSelectedEvidenceIds(savedEvidence.map(item => item.id));
    } catch (err) {
      setError(err.message || 'Unable to load the fine-tuning session.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSession(); }, [sessionId]);

  const handleSaveEvidence = async () => {
    if (savingEvidence) return;
    setSavingEvidence(true);
    setError('');
    try {
      const result = await saveEvidence(sessionId, selectedEvidenceIds);
      setSession(previous => ({
        ...previous,
        status: result.status || previous?.status,
        evidence_snapshot: result.evidence_snapshot
      }));
      setProposals(result.proposals || null);
      setDrafts({});
    } catch (err) {
      setError(err.message || 'Unable to save selected evidence.');
    } finally {
      setSavingEvidence(false);
    }
  };

  const handleGenerate = async (regenerate = false) => {
    if (generating) return;
    setGenerating(true);
    setError('');
    try {
      const result = await generateProposals(sessionId, regenerate);
      setProposals(result.proposals || null);
      setSession(previous => ({ ...previous, status: result.status || previous?.status }));
      setDrafts({});
    } catch (err) {
      setError(err.message || 'Unable to generate resume proposals.');
    } finally {
      setGenerating(false);
    }
  };

  const handleReview = async (generationId, sectionId, decision) => {
    if (saving) return;
    const editedText = drafts[sectionId] || '';
    if (decision === 'EDITED' && !editedText.trim()) {
      setError('Enter the revised section text before saving your edit.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const result = await saveReview(sessionId, {
        generation_id: generationId,
        section_id: sectionId,
        decision,
        ...(decision === 'EDITED' ? { edited_text: editedText } : {})
      });
      setProposals(result.proposals || null);
      setSession(previous => ({ ...previous, status: result.status || previous?.status }));
    } catch (err) {
      setError(err.message || 'Unable to save the section review.');
    } finally {
      setSaving(false);
    }
  };

  const active = proposals?.active_generation_id
    ? proposals.generations?.find(item => item.id === proposals.active_generation_id)
    : null;
  const previousGenerations = (proposals?.generations || []).filter(item => item.id !== proposals?.active_generation_id);

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to={`/opportunities/${encodeURIComponent(opportunityId)}`} className="text-xs font-semibold text-indigo-700 hover:underline">← Back to Opportunity</Link>
          <h1 className="text-xl font-bold text-slate-900 mt-2">Resume Fine-tuning</h1>
          <p className="text-sm text-slate-500 mt-1">Generate and review JD-specific proposals. Your master resume remains unchanged.</p>
        </div>
        <span className="text-xs font-semibold text-slate-600 bg-slate-100 rounded-full px-3 py-1">Session: {session?.status || (loading ? 'Loading' : '—')}</span>
      </div>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-sm text-slate-500">Loading proposal session...</div>
      ) : (
        <>
          <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Select verified evidence</h2>
              <p className="text-xs text-slate-500 mt-1">Choose the evidence relevant to this opportunity. Pending evidence is excluded.</p>
            </div>
            {evidence.length === 0 ? (
              <p className="text-xs text-amber-700">No verified evidence is available. Verify relevant entries in the Experience &amp; Achievement Repository first.</p>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
                {evidence.map(item => (
                  <label key={item.id} className="flex gap-3 p-3 cursor-pointer hover:bg-slate-50">
                    <input type="checkbox" checked={selectedEvidenceIds.includes(item.id)}
                      onChange={event => setSelectedEvidenceIds(previous => event.target.checked ? [...previous, item.id] : previous.filter(id => id !== item.id))}
                      className="mt-1" />
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-slate-800">{item.title}</span>
                      <span className="block text-[11px] text-slate-500">{[item.role, item.organisation, item.evidence_type].filter(Boolean).join(' · ')}</span>
                      {item.description && <span className="block text-xs text-slate-600 mt-1">{item.description}</span>}
                    </span>
                  </label>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={handleSaveEvidence} disabled={savingEvidence || evidence.length === 0}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-800 rounded hover:bg-slate-700 disabled:opacity-50">
                {savingEvidence ? 'Saving...' : 'Save Selected Evidence'}
              </button>
              <span className="text-xs text-slate-500">Selected: {selectedEvidenceIds.length} · Session: {session?.status || 'DRAFT'}</span>
            </div>
          </section>

          {previousGenerations.length > 0 && !active && (
            <section className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
              <h2 className="text-xs font-bold text-amber-900">Previous proposal generations retained</h2>
              <p className="text-xs text-amber-800">These proposals were generated using an earlier evidence selection. They remain available in session history but are no longer active. Generate a fresh set using the updated evidence.</p>
              <ul className="list-disc pl-5 text-xs text-amber-800">
                {previousGenerations.map(item => <li key={item.id}>{item.created_at ? new Date(item.created_at).toLocaleString() : 'Saved generation'}</li>)}
              </ul>
            </section>
          )}

          <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Section-wise proposals</h2>
              <p className="text-xs text-slate-500 mt-1">Generate proposals based on the saved JD analysis and verified evidence selected for this session.</p>
            </div>
            <button type="button" onClick={() => handleGenerate(false)}
              disabled={generating || !['READY_FOR_PROPOSAL','PROPOSALS_READY','PROPOSALS_IN_REVIEW'].includes(session?.status)}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded hover:bg-indigo-500 disabled:opacity-50">
              {generating ? 'Generating proposals…' : proposals ? 'Load Saved Proposals' : 'Generate Proposals'}
            </button>
            {generating && <p className="text-xs text-indigo-700">The AI is preparing your proposals. Please keep this page open.</p>}
            {!['READY_FOR_PROPOSAL','PROPOSALS_READY','PROPOSALS_IN_REVIEW'].includes(session?.status) &&
              <p className="text-xs text-amber-700">Save selected verified evidence above before generating proposals.</p>}
          </section>

          {active && (
            <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Review generated sections</h2>
                  <p className="text-xs text-slate-500 mt-1">Generation: {active.created_at ? new Date(active.created_at).toLocaleString() : 'Saved'}</p>
                </div>
                <button type="button" onClick={() => handleGenerate(true)} disabled={generating}
                  className="text-xs font-semibold text-indigo-700 underline disabled:opacity-50">Generate another version</button>
              </div>
              {active.sections.map(section => (
                <article key={section.section_id} className="border border-slate-200 rounded-lg p-4 space-y-3">
                  <div className="flex flex-wrap justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-800">{section.title}</h3>
                    <span className="text-[10px] font-semibold text-slate-500">{(section.decision || 'PENDING').replaceAll('_', ' ')}</span>
                  </div>
                  <p className="text-xs text-slate-600 whitespace-pre-wrap">{section.rationale}</p>
                  {section.proposed_text ? (
                    <>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Current source</p>
                          <pre className="text-xs text-slate-600 whitespace-pre-wrap font-sans bg-slate-50 rounded p-3">{section.original_text || 'No exact source section found in AI Context.'}</pre>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Proposed replacement</p>
                          <textarea rows="8" value={drafts[section.section_id] ?? section.edited_text ?? section.proposed_text}
                            onChange={e => setDrafts(previous => ({ ...previous, [section.section_id]: e.target.value }))}
                            disabled={['ACCEPTED','REJECTED'].includes(section.decision) || saving}
                            className="w-full text-xs text-slate-700 border border-slate-200 rounded p-3 disabled:bg-slate-50" />
                        </div>
                      </div>
                      {section.evidence_ids?.length > 0 && <p className="text-[11px] text-slate-500">Supporting verified evidence: {section.evidence_ids.length} item(s)</p>}
                      {['PENDING','EDITED'].includes(section.decision) && (
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => handleReview(active.id, section.section_id, 'ACCEPTED')} disabled={saving} className="px-3 py-2 text-xs font-semibold text-white bg-emerald-700 rounded disabled:opacity-50">Accept</button>
                          <button type="button" onClick={() => handleReview(active.id, section.section_id, 'EDITED')} disabled={saving} className="px-3 py-2 text-xs font-semibold text-white bg-indigo-600 rounded disabled:opacity-50">Save Edit</button>
                          <button type="button" onClick={() => handleReview(active.id, section.section_id, 'REJECTED')} disabled={saving} className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded disabled:opacity-50">Reject</button>
                        </div>
                      )}
                    </>
                  ) : <p className="text-xs text-slate-500">No change recommended for this section.</p>}
                </article>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
