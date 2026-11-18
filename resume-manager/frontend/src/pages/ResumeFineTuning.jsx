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
      const result = await fetchSession(sessionId);
      setSession(result);
      setProposals(result.proposals || null);
    } catch (err) {
      setError(err.message || 'Unable to load the fine-tuning session.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSession(); }, [sessionId]);

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

  const active = proposals?.generations?.find(item => item.id === proposals.active_generation_id)
    || proposals?.generations?.[proposals.generations.length - 1];

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
              <p className="text-xs text-amber-700">Save selected verified evidence in JD Analysis before generating proposals.</p>}
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
