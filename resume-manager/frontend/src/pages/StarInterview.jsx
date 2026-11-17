import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

async function readApi(res, fallback) {
  let body;
  try { body = await res.json(); } catch (_) { throw new Error(fallback); }
  if (!res.ok || !body?.success) throw new Error(body?.error?.message || fallback);
  return body.data;
}

export default function StarInterview() {
  const { id: opportunityId } = useParams();
  const navigate = useNavigate();
  const [opportunity, setOpportunity] = useState(null);
  const [session, setSession] = useState(null);
  const [questionCount, setQuestionCount] = useState(15);
  const [difficulty, setDifficulty] = useState('Medium');
  const [answerDraft, setAnswerDraft] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setBusy(true); setError('');
    try {
      const [oppRes, sessionRes] = await Promise.all([
        fetch('/api/v1/opportunities/' + opportunityId, { credentials: 'include' }),
        fetch('/api/v1/opportunities/' + opportunityId + '/star-interviews', { credentials: 'include' })
      ]);
      const oppData = await readApi(oppRes, 'Unable to load opportunity details.');
      const sessionData = await readApi(sessionRes, 'Unable to load STAR Interview Practice.');
      setOpportunity(oppData);
      const saved = sessionData.session || null;
      setSession(saved);
      if (saved) {
        setQuestionCount(saved.question_count);
        setDifficulty(saved.difficulty);
        setAnswerDraft(saved.answers?.[saved.current_index] || '');
      }
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  useEffect(() => { load(); }, [opportunityId]);

  const start = async () => {
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/v1/opportunities/' + opportunityId + '/star-interviews', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_count: questionCount, difficulty })
      });
      const data = await readApi(res, 'Unable to start STAR Interview Practice.');
      setSession(data.session); setAnswerDraft('');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const save = async (nextIndex, review = false) => {
    if (!session) return;
    setBusy(true); setError('');
    try {
      const answers = [...session.answers];
      if (session.status !== 'REVIEW') answers[session.current_index] = answerDraft;
      const res = await fetch('/api/v1/opportunities/' + opportunityId + '/star-interviews/' + session.id, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, current_index: nextIndex, status: review ? 'REVIEW' : 'IN_PROGRESS' })
      });
      const data = await readApi(res, 'Unable to save your answer. Please try again.');
      setSession(data.session); setAnswerDraft(data.session.answers?.[data.session.current_index] || '');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const editAnswer = async (index) => {
    setBusy(true); setError('');
    try {
      const answers = [...session.answers];
      const res = await fetch('/api/v1/opportunities/' + opportunityId + '/star-interviews/' + session.id, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, current_index: index, status: 'IN_PROGRESS' })
      });
      const data = await readApi(res, 'Unable to open this answer for editing.');
      setSession(data.session); setAnswerDraft(data.session.answers?.[index] || '');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const company = opportunity?.company?.name || 'Company';
  const role = opportunity?.job_title || 'Role';
  const backUrl = '/opportunities/' + opportunityId;

  if (busy && !opportunity) return <div className="max-w-4xl mx-auto py-12 text-sm text-slate-500">Loading STAR Interview Practice...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <Link to={backUrl} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-violet-700">← Back to Opportunity</Link>
      <header className="bg-white border border-slate-200 rounded-xl p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-700">Interview preparation</p>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">STAR Interview Practice</h1>
        <p className="text-sm text-slate-600 mt-2">{company} · {role}</p>
        <p className="text-sm text-slate-500 mt-3">Practise at your own pace. Your answers and progress are saved so you can return later.</p>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-800 p-3 text-sm">{error}</div>}
      {busy && opportunity && <p className="text-sm text-violet-700">Saving your progress...</p>}

      {!session && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div><h2 className="text-lg font-semibold text-slate-900">Set up your practice session</h2><p className="text-sm text-slate-500 mt-1">Questions will be tailored to the saved job description for this opportunity.</p></div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">Number of questions</label>
            <div className="grid grid-cols-4 gap-3 max-w-lg">
              {[5, 10, 15, 20].map(n => <button key={n} type="button" onClick={() => setQuestionCount(n)} className={'rounded-lg border px-4 py-3 text-sm font-semibold ' + (questionCount === n ? 'border-violet-500 bg-violet-50 text-violet-800 ring-1 ring-violet-300' : 'border-slate-300 text-slate-700 hover:border-violet-300')}>{n}</button>)}
            </div>
            <p className="text-xs text-slate-500 mt-2">5 questions for a quick practice, or up to 20 for a fuller session.</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">Difficulty</label>
            <div className="flex gap-3">
              {['Medium', 'High'].map(level => <button key={level} type="button" onClick={() => setDifficulty(level)} className={'rounded-lg border px-5 py-3 text-sm font-semibold ' + (difficulty === level ? 'border-violet-500 bg-violet-50 text-violet-800 ring-1 ring-violet-300' : 'border-slate-300 text-slate-700 hover:border-violet-300')}>{level}</button>)}
            </div>
          </div>
          <button type="button" onClick={start} disabled={busy} className="rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-6 py-3 text-sm font-semibold">{busy ? 'Preparing...' : 'Start Interview Practice'}</button>
        </section>
      )}

      {session && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          {session.status === 'REVIEW' ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Review your answers</h2><p className="text-sm text-slate-500 mt-1">{session.question_count} questions · {session.difficulty} difficulty</p></div><span className="text-xs rounded-full bg-violet-50 text-violet-800 px-3 py-1">Ready for review</span></div>
              <p className="text-sm text-slate-600 bg-violet-50 rounded-lg p-4">Review your responses and edit any answer before the assessment feature is introduced.</p>
              <div className="space-y-3">{session.questions.map((q, i) => <article key={i} className="border border-slate-200 rounded-lg p-4"><div className="flex justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-violet-700">{q.category}</p><h3 className="text-sm font-semibold mt-1">{i + 1}. {q.question}</h3></div><button type="button" disabled={busy} onClick={() => editAnswer(i)} className="text-sm font-semibold text-violet-700 hover:text-violet-900">Edit</button></div><p className="text-sm text-slate-600 mt-3 whitespace-pre-wrap">{session.answers[i] || 'No answer entered yet.'}</p></article>)}</div>
            </>
          ) : (
            <>
              <div className="flex flex-wrap justify-between gap-2 text-sm"><span className="font-semibold text-slate-800">{session.difficulty} difficulty · {session.question_count} questions</span><span className="text-slate-500">Question {session.current_index + 1} of {session.question_count}</span></div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-violet-500" style={{ width: (((session.current_index + 1) / session.question_count) * 100) + '%' }} /></div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-5"><p className="text-xs font-bold uppercase tracking-wide text-violet-700 mb-2">{session.questions[session.current_index]?.category}</p><h2 className="text-lg font-semibold leading-relaxed text-slate-900">{session.questions[session.current_index]?.question}</h2></div>
              <div><label className="block text-sm font-semibold text-slate-700 mb-2">Your answer</label><textarea rows={10} maxLength={12000} value={answerDraft} onChange={e => setAnswerDraft(e.target.value)} placeholder="Describe the situation, your responsibility, what you did and the outcome. Answer naturally in your own words." className="w-full rounded-lg border border-slate-300 p-4 text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400" /><p className="text-xs text-slate-400 text-right">{answerDraft.length.toLocaleString()}/12,000 characters</p></div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4"><button type="button" disabled={busy || session.current_index === 0} onClick={() => save(session.current_index - 1)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium disabled:opacity-40">Previous</button><div className="flex gap-2"><button type="button" disabled={busy} onClick={() => save(session.current_index, true)} className="rounded-lg border border-violet-200 text-violet-700 px-4 py-2.5 text-sm font-semibold">Review answers</button><button type="button" disabled={busy} onClick={() => save(Math.min(session.current_index + 1, session.question_count - 1))} className="rounded-lg bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 text-sm font-semibold disabled:opacity-50">{session.current_index === session.question_count - 1 ? 'Save & Review' : 'Save & Next'}</button></div></div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
