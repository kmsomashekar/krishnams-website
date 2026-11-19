import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlignmentType, Document, Footer, Packer, Paragraph, TextRun } from 'docx';
import { jsPDF } from 'jspdf';

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

async function deleteProposalGeneration(sessionId, generationId) {
  return readApi(await fetch(`/api/v1/customisation-sessions/${sessionId}/proposals`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ generation_id: generationId })
  }), 'Unable to delete the proposal generation.');
}

async function saveReview(sessionId, payload) {
  return readApi(await fetch(`/api/v1/customisation-sessions/${sessionId}/proposals`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }), 'Unable to save the proposal review.');
}

async function fetchTailoredVersion(resumeId, versionId) {
  return readApi(await fetch('/api/v1/resumes/' + resumeId + '/versions/' + versionId), 'Unable to load the tailored resume content.');
}

function getResumeSections(aiContext, profile = {}) {
  const sections = []; let current = null;
  for (const line of String(aiContext || '').replace(/\r/g, '').split('\n')) {
    if (line.startsWith('## ')) { if (current) sections.push(current); current = { title: line.slice(3).trim(), lines: [] }; }
    else if (current) current.lines.push(line);
  }
  if (current) sections.push(current);
  const internalMetadata = /^(?:tailored resume|jd[- ]tailored(?:\s+\d{4}-\d{2}-\d{2})?|tailored(?: resume)?(?:\s+version)?|resume tailored for job description)$/i;
  const metadataLine = /^(?:tailored resume|jd[- ]tailored(?:\s+\d{4}-\d{2}-\d{2})?|tailored(?: resume)?(?:\s+version)?)(?:\s*[:|—-].*)?$/i;
  const parsed = sections
    .filter(section => !internalMetadata.test(section.title.trim()))
    .map(section => ({
      title: section.title,
      paragraphs: section.lines.join('\n').trim().split(/\n{2,}/).map(v => v.trim()).filter(Boolean)
        .filter(paragraph => !metadataLine.test(paragraph))
    }))
    .filter(section => section.paragraphs.length);
  const profileLines = [
    profile.display_name,
    profile.email,
    profile.phone,
    profile.location,
    profile.linkedin_url
  ].map(v => String(v || '').trim()).filter(Boolean);
  const contactIndex = parsed.findIndex(section => String(section.title || '').toLowerCase().replace(/[^a-z]+/g, '_').replace(/^_|_$/g, '') === 'contact_details');
  if (contactIndex >= 0) {
    const contact = parsed[contactIndex];
    const existing = contact.paragraphs.join('\n').toLowerCase().replace(/https?:\/\//g, '').replace(/www\./g, '').replace(/\/+$/g, '');
    const missing = profileLines.filter(line => !existing.includes(line.toLowerCase().replace(/https?:\/\//g, '').replace(/www\./g, '').replace(/\/+$/g, '')));
    if (missing.length) contact.paragraphs.push(missing.join('\n'));
  } else if (profileLines.length) {
    parsed.unshift({ title: 'Contact Details', paragraphs: [profileLines.join('\n')] });
  }
  return parsed;
}

function sectionLabel(value) {
  const labels = {
    professional_summary: 'Professional Summary',
    core_competencies: 'Core Competencies',
    professional_experience: 'Professional Experience',
    achievements: 'Key Achievements',
    technical_skills: 'Technical Skills',
    education: 'Education',
    certifications: 'Certifications',
    portfolio: 'Selected Technology Initiatives & Digital Portfolio',
    contact_details: 'Contact Details'
  };
  const key = String(value || '').toLowerCase().replace(/[^a-z]+/g, '_').replace(/^_|_$/g, '');
  return labels[key] || String(value || '').replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

function safeFileName(value) {
  const cleaned = String(value || 'Resume').replace(/^Tailored(?:[\s_-]*)(?:Resume)?[\s_-]*/i, '');
  return cleaned.replace(/[^a-z0-9-_]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 100) || 'Resume';
}

async function fetchCandidateProfile() {
  const result = await readApi(await fetch('/api/v1/profile'), 'Unable to load profile details. Export stopped to avoid omitting profile information.');
  return result.profile || {};
}

function xmlEscape(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function paragraphPlainText(xml) {
  return [...xml.matchAll(/<w:t[^>]*>([\\s\\S]*?)<\\/w:t>/g)].map(match => match[1]
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")).join('');
}

function isWordHeadingParagraph(xml, text) {
  const style = (xml.match(/<w:pStyle[^>]*w:val=["']([^"']+)["']/i) || [])[1] || '';
  return /heading[1-9]|title|subtitle/i.test(style) || /^##?\\s/.test(text);
}

function replaceParagraphText(xml, text) {
  const pPr = (xml.match(/<w:pPr[\\s\\S]*?<\\/w:pPr>/) || [''])[0];
  const rPr = (xml.match(/<w:rPr[\\s\\S]*?<\\/w:rPr>/) || [''])[0];
  const run = '<w:r>' + rPr + '<w:t xml:space="preserve">' + xmlEscape(text) + '</w:t></w:r>';
  return '<w:p>' + pPr + run + '</w:p>';
}

function replaceProfessionalSummaryInDocx(xml, summary) {
  const paragraphs = xml.match(/<w:p(?:\\s[^>]*)?>[\\s\\S]*?<\\/w:p>/g) || [];
  const summaryHeadingIndex = paragraphs.findIndex(p => /professional\\s+(?:summary|profile)|executive\\s+summary/i.test(paragraphPlainText(p).trim()));
  if (summaryHeadingIndex < 0) throw new Error('The original DOCX template does not contain a recognisable Professional Summary heading. No export was generated.');
  let endIndex = summaryHeadingIndex + 1;
  while (endIndex < paragraphs.length) {
    const text = paragraphPlainText(paragraphs[endIndex]).trim();
    if (text && isWordHeadingParagraph(paragraphs[endIndex], text)) break;
    endIndex++;
  }
  const bodyParagraphs = paragraphs.slice(summaryHeadingIndex + 1, endIndex).filter(p => paragraphPlainText(p).trim());
  if (!bodyParagraphs.length) throw new Error('The original DOCX template has no text under its Professional Summary heading. No export was generated.');
  const lines = String(summary || '').split(/\\r?\\n/).map(line => line.trim()).filter(Boolean);
  if (!lines.length) throw new Error('The approved Professional Summary is empty. No export was generated.');
  const templateParagraph = bodyParagraphs[0];
  const replacementParagraphs = lines.map(line => replaceParagraphText(templateParagraph, line));
  const replaced = paragraphs.slice();
  replaced.splice(summaryHeadingIndex + 1, endIndex - summaryHeadingIndex - 1, ...replacementParagraphs);
  let paragraphIndex = 0;
  return xml.replace(/<w:p(?:\\s[^>]*)?>[\\s\\S]*?<\\/w:p>/g, () => replaced[paragraphIndex++] || '');
}

async function fetchOriginalDocxTemplate(session) {
  if (!session?.source_resume_id || !session?.source_resume_version_id) {
    throw new Error('The source resume reference is missing from this session. Cannot preserve the original layout.');
  }
  const response = await fetch('/api/v1/resumes/' + encodeURIComponent(session.source_resume_id) +
    '/versions/' + encodeURIComponent(session.source_resume_version_id) + '/file');
  if (!response.ok) throw new Error('Unable to retrieve the original Master Resume file (' + response.status + ').');
  const type = String(response.headers.get('content-type') || '').toLowerCase();
  if (!type.includes('wordprocessingml.document')) throw new Error('The original source is not a DOCX file. Template-preserving export requires the original Word document; PDF reconstruction is intentionally not used.');
  return response.arrayBuffer();
}

async function downloadResumeDocx(resume, aiContext, session) {
  const JSZip = (await import('jszip')).default;
  const sourceBytes = await fetchOriginalDocxTemplate(session);
  const zip = await JSZip.loadAsync(sourceBytes);
  const documentFile = zip.file('word/document.xml');
  if (!documentFile) throw new Error('The original Word document is missing its main document XML.');
  const xml = await documentFile.async('string');
  const sections = getResumeSections(aiContext);
  const summary = sections.find(section => /professional\\s+(?:summary|profile)|executive\\s+summary/i.test(section.title));
  if (!summary) throw new Error('The tailored resume does not contain the approved Professional Summary.');
  const updatedXml = replaceProfessionalSummaryInDocx(xml, summary.paragraphs.join('\\n'));
  zip.file('word/document.xml', updatedXml);
  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = safeFileName(resume.resume_name) + '.docx';
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadResumePdf(resume, aiContext) {
  const profile = await fetchCandidateProfile();
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' }); const width = pdf.internal.pageSize.getWidth(); const height = pdf.internal.pageSize.getHeight();
  const margin = 42; const maxWidth = width - margin * 2; let y = margin;
  const clean = value => String(value || '').replace(/[•●▪]/g, '-').replace(/[–—]/g, '-').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[^\x09\x0A\x0D\x20-\xFF]/g, '');
  const ensure = amount => { if (y + amount > height - margin - 28) { pdf.addPage(); y = margin; } };
  const sections = getResumeSections(aiContext, profile);
  const contact = sections.find(section => String(section.title || '').toLowerCase().replace(/[^a-z]+/g, '_').replace(/^_|_$/g, '') === 'contact_details');
  if (contact) {
    const lines = contact.paragraphs.join('\n').split('\n').map(v => v.trim()).filter(Boolean);
    if (lines.length) { pdf.setTextColor(24,67,104); pdf.setFont('helvetica','bold'); pdf.setFontSize(16); pdf.text(clean(lines[0]),width/2,y,{align:'center'}); y += 19; }
    if (lines.length > 1) { pdf.setTextColor(55,68,80); pdf.setFont('helvetica','bold'); pdf.setFontSize(10); pdf.text(clean(lines[1]),width/2,y,{align:'center'}); y += 13; }
    if (lines.length > 2) { pdf.setTextColor(40,40,40); pdf.setFont('helvetica','normal'); pdf.setFontSize(8.5); const contactText=pdf.splitTextToSize(clean(lines.slice(2).join(' | ')),maxWidth); pdf.text(contactText,width/2,y,{align:'center'}); y += contactText.length*11+7; }
  }
  for (const section of sections) {
    const isContact = String(section.title || '').toLowerCase().replace(/[^a-z]+/g, '_').replace(/^_|_$/g, '') === 'contact_details';
    if (isContact) continue;
    ensure(28); pdf.setTextColor(24,67,104); pdf.setFont('helvetica','bold'); pdf.setFontSize(10.5);
    const heading = pdf.splitTextToSize(clean(sectionLabel(section.title).toUpperCase()),maxWidth); pdf.text(heading,margin,y); y += heading.length*13+4;
    for (const block of section.paragraphs) {
      for (const rawLine of block.split('\n').map(v => v.trim()).filter(Boolean)) {
        const bullet = /^[-•*]\s/.test(rawLine); const lineText = bullet ? rawLine.replace(/^[-•*]\s*/, '') : rawLine;
        const roleHeading = /(?:19|20)\d{2}\s*(?:-|–|—|to)\s*(?:present|current|(?:19|20)\d{2})/i.test(lineText) && !bullet;
        const competencyLabel = !bullet && /^[^:]{2,80}:\s/.test(lineText);
        const prefix = bullet ? '• ' : '';
        const lines = pdf.splitTextToSize(clean(prefix + lineText),maxWidth-(bullet?10:0));
        pdf.setFont('helvetica',roleHeading||competencyLabel?'bold':'normal'); pdf.setFontSize(roleHeading?9.3:8.8); pdf.setTextColor(roleHeading?24:40,roleHeading?67:40,roleHeading?104:40);
        for (const line of lines) { ensure(12); pdf.text(line,margin+(bullet?10:0),y); y += 11; }
      }
      y += 2;
    }
    y += 3;
  }
  const pages = pdf.getNumberOfPages();
  for (let i=1;i<=pages;i++) { pdf.setPage(i); pdf.setFont('helvetica','normal'); pdf.setFontSize(7.5); pdf.setTextColor(100); pdf.text('Krishna M S  |  IT & Cybersecurity Leader  |  ' + i,width/2,height-20,{align:'center'}); }
  pdf.save(safeFileName(resume.resume_name) + '.pdf');
}

async function finalizeProposals(sessionId) {
  return readApi(await fetch(`/api/v1/customisation-sessions/${sessionId}/finalize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  }), 'Unable to create the tailored resume version.');
}

export default function ResumeFineTuning() {
  const { id: opportunityId, sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [evidence, setEvidence] = useState([]);
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState([]);
  const [savingEvidence, setSavingEvidence] = useState(false);
  const [proposals, setProposals] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [tailoredResume, setTailoredResume] = useState(null);
  const [finalizing, setFinalizing] = useState(false);
  const [exportingFormat, setExportingFormat] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingGenerationId, setDeletingGenerationId] = useState('');
  const [error, setError] = useState('');

  const loadSession = async () => {
    setLoading(true);
    setError('');
    try {
      const [result, evidenceResult] = await Promise.all([fetchSession(sessionId), fetchEvidence()]);
      setSession(result);
      setProposals(result.proposals || null);
      setTailoredResume(result.proposals?.tailored_resume || null);
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
      setTailoredResume(result.proposals?.tailored_resume || null);
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
      setTailoredResume(result.proposals?.tailored_resume || null);
      setSession(previous => ({ ...previous, status: result.status || previous?.status }));
      setDrafts({});
    } catch (err) {
      setError(err.message || 'Unable to generate resume proposals.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteGeneration = async (generationId) => {
    if (!generationId || deletingGenerationId) return;
    if (!window.confirm('Delete this proposal generation permanently? This will not delete any tailored resume already created.')) return;
    setDeletingGenerationId(generationId);
    setError('');
    try {
      const result = await deleteProposalGeneration(sessionId, generationId);
      setProposals(result.proposals || null);
      setTailoredResume(result.proposals?.tailored_resume || tailoredResume);
      setSession(previous => ({ ...previous, status: result.status || previous?.status }));
      setDrafts({});
    } catch (err) {
      setError(err.message || 'Unable to delete proposal generation.');
    } finally {
      setDeletingGenerationId('');
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

  const handleDownload = async (format) => {
    if (!tailoredResume?.resume_id || !tailoredResume?.resume_version_id || exportingFormat) return;
    setExportingFormat(format); setError('');
    try {
      const version = await fetchTailoredVersion(tailoredResume.resume_id, tailoredResume.resume_version_id);
      if (!version?.ai_context) throw new Error('The tailored resume has no saved content to export.');
      if (format === 'docx') await downloadResumeDocx(tailoredResume, version.ai_context, session); else await downloadResumePdf(tailoredResume, version.ai_context);
    } catch (err) { setError(err.message || ('Unable to generate the ' + format.toUpperCase() + ' file.')); }
    finally { setExportingFormat(''); }
  };

  const handleFinalize = async () => {
    if (finalizing || !active) return;
    setFinalizing(true);
    setError('');
    try {
      const result = await finalizeProposals(sessionId);
      setTailoredResume(result);
    } catch (err) {
      setError(err.message || 'Unable to create the tailored resume version.');
    } finally {
      setFinalizing(false);
    }
  };

  const active = proposals?.active_generation_id
    ? proposals.generations?.find(item => item.id === proposals.active_generation_id)
    : null;
  const previousGenerations = (proposals?.generations || []).filter(item => item.id !== proposals?.active_generation_id);
  const generationHasPending = !active || active.sections.some(section =>
    section.decision !== 'NO_CHANGE' && !['ACCEPTED', 'EDITED', 'REJECTED'].includes(section.decision)
  );

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
              <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={evidence.length > 0 && selectedEvidenceIds.length === evidence.length}
                    onChange={event => setSelectedEvidenceIds(event.target.checked ? evidence.map(item => item.id) : [])}
                    className="rounded"
                  />
                  Select All
                </label>
                <span className="text-xs text-slate-500">{selectedEvidenceIds.length} of {evidence.length} selected</span>
              </div>
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

          {previousGenerations.length > 0 && (
            <section className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
              <h2 className="text-xs font-bold text-amber-900">Previous proposal generations retained</h2>
              <p className="text-xs text-amber-800">These are saved proposal generations from this session. Delete any generation you no longer need.</p>
              <ul className="space-y-2 text-xs text-amber-800">
                {previousGenerations.map(item => (
                  <li key={item.id} className="flex items-center justify-between gap-3">
                    <span>{item.created_at ? new Date(item.created_at).toLocaleString() : 'Saved generation'}</span>
                    <button type="button" onClick={() => handleDeleteGeneration(item.id)} disabled={!!deletingGenerationId}
                      className="text-red-700 underline disabled:opacity-50">{deletingGenerationId === item.id ? 'Deleting…' : 'Delete'}</button>
                  </li>
                ))}
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
              {generating ? 'Generating proposals…' : active ? 'Load Saved Proposals' : previousGenerations.length ? 'Generate Fresh Proposals' : 'Generate Proposals'}
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
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => handleGenerate(true)} disabled={generating}
                    className="text-xs font-semibold text-indigo-700 underline disabled:opacity-50">Generate another version</button>
                  <button type="button" onClick={() => handleDeleteGeneration(active.id)} disabled={!!deletingGenerationId}
                    className="text-xs font-semibold text-red-700 underline disabled:opacity-50">{deletingGenerationId === active.id ? 'Deleting…' : 'Delete proposals'}</button>
                </div>
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
              {tailoredResume ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-2">
                  <p className="text-sm font-bold text-emerald-900">Tailored resume version created</p>
                  <p className="text-xs text-emerald-800">{tailoredResume.resume_name} · {tailoredResume.version_label}</p>
                  <p className="text-xs text-emerald-800">The approved sections are saved in a separate resume record. Your master resume has not been changed. Generate either file below to download it.</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button type="button" onClick={() => handleDownload('docx')} disabled={!!exportingFormat} className="px-4 py-2 text-xs font-bold text-white bg-indigo-700 rounded hover:bg-indigo-600 disabled:opacity-50">{exportingFormat === 'docx' ? 'Preparing DOCX…' : 'Download DOCX'}</button>
                    <button type="button" onClick={() => handleDownload('pdf')} disabled={!!exportingFormat} className="px-4 py-2 text-xs font-bold text-white bg-slate-800 rounded hover:bg-slate-700 disabled:opacity-50">{exportingFormat === 'pdf' ? 'Preparing PDF…' : 'Download PDF'}</button>
                    <Link to="/resumes" className="px-4 py-2 text-xs font-semibold text-emerald-900 underline">Open Resumes</Link>
                  </div>
                </div>
              ) : (
                <div className="border-t border-slate-100 pt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">Once every proposed section is accepted, edited or rejected, create a separate tailored resume version.</p>
                  <button type="button" onClick={handleFinalize}
                    disabled={finalizing || generationHasPending}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 rounded hover:bg-emerald-600 disabled:opacity-50">
                    {finalizing ? 'Creating version…' : 'Create Tailored Resume Version'}
                  </button>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
