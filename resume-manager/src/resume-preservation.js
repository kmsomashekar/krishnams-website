// Shared source-preservation helpers for Resume Manager.
export function parseResumeContextSections(context) {
  const raw = {};
  let heading = null;
  let lines = [];
  const aliases = {
    'professional profile':'professional_summary','professional summary':'professional_summary','summary':'professional_summary','target role positioning':'professional_summary',
    'leadership scope':'core_competencies','leadership and scope':'core_competencies','core expertise':'core_competencies','core competencies':'core_competencies',
    'key achievements':'achievements','achievements':'achievements',
    'technologies platforms':'technical_skills','technologies and platforms':'technical_skills','technical skills':'technical_skills',
    'security governance':'technical_skills','security and governance':'technical_skills',
    'certifications':'certifications','certification':'certifications',
    'professional experience':'professional_experience','work experience':'professional_experience','employment history':'professional_experience','experience':'professional_experience',
    'education':'education','academic qualifications':'education','qualifications':'education',
    'selected technology initiatives digital portfolio':'portfolio','technology portfolio':'portfolio','digital portfolio':'portfolio','selected projects':'portfolio','projects':'portfolio',
    'contact details':'contact_details','contact information':'contact_details','personal details':'contact_details',
    'career facts constraints':'career_facts','important evidence':'evidence'
  };
  const normalize = line => String(line || '').replace(/^#{1,3}\s*/, '').replace(/[*_]/g, '').replace(/[:：]$/,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const flush = () => {
    if (!heading) return;
    const value = lines.join('\n').trim();
    if (value) raw[heading] = [raw[heading], value].filter(Boolean).join('\n\n');
  };
  for (const line of String(context || '').replace(/\r/g,'').split('\n')) {
    const id = aliases[normalize(line)];
    if (id) { flush(); heading = id; lines = []; }
    else if (heading) lines.push(line);
  }
  flush();
  return {
    professional_summary:raw.professional_summary||'',
    core_competencies:raw.core_competencies||'',
    professional_experience:raw.professional_experience||'',
    achievements:raw.achievements||'',
    technical_skills:raw.technical_skills||'',
    education:raw.education||'',
    certifications:raw.certifications||'',
    portfolio:raw.portfolio||'',
    contact_details:raw.contact_details||'',
    career_facts:raw.career_facts||'',
    evidence:raw.evidence||'',
    _sourceAll:Object.values(raw).join('\n\n')
  };
}

export function resumeFactTokens(text) {
  return new Set((String(text || '').match(/\b(?:\$|₹|€|£)?\d+(?:[,.]\d+)*(?:%|\+|\s?(?:years?|months?|days?|hours?|K|M|B|L|Cr))?\b/gi) || [])
    .map(token => token.replace(/\s+/g, '').toLowerCase()));
}

export function findUnsupportedNumbers(candidate, sourceAndEvidence) {
  const allowed = resumeFactTokens(sourceAndEvidence);
  return [...resumeFactTokens(candidate)].filter(token => !allowed.has(token));
}

export function validateResumePreservation(sourceSections, candidateSections, evidenceText = '') {
  const problems = [];
  const sourceAll = Object.values(sourceSections || {}).join('\n') + '\n' + evidenceText;
  const immutable = ['professional_experience', 'achievements', 'technical_skills'];
  for (const id of immutable) {
    const original = String(sourceSections?.[id] || '').trim();
    const candidate = String(candidateSections?.[id] || '').trim();
    if (!original || !candidate) { problems.push(id + ' is missing'); continue; }
    if (original.replace(/\s+/g,' ').trim() !== candidate.replace(/\s+/g,' ').trim()) {
      problems.push(id + ' differs from the canonical Master Resume content');
    }
  }
  const sourceExperience = String(sourceSections?.professional_experience || '');
  const candidateExperience = String(candidateSections?.professional_experience || '');
  const dateTokens = sourceExperience.match(/\b(?:19|20)\d{2}\b/g) || [];
  const missingDates = [...new Set(dateTokens)].filter(year => !candidateExperience.includes(year));
  if (missingDates.length) problems.push('professional_experience is missing source employment dates: ' + missingDates.join(', '));
  const dateRangePattern = /(?:\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+)?(?:19|20)\d{2}\s*(?:-|–|—|to)\s*(?:(?:\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+)?(?:19|20)\d{2}|present|current)/gi;
  const sourceRanges = sourceExperience.match(dateRangePattern) || [];
  const candidateRanges = candidateExperience.match(dateRangePattern) || [];
  if (sourceRanges.length && candidateRanges.length < sourceRanges.length) problems.push('professional_experience has fewer employment date ranges than the source (' + candidateRanges.length + ' vs ' + sourceRanges.length + ')');
  for (const range of sourceRanges) if (!candidateExperience.toLowerCase().replace(/[–—]/g, '-').includes(range.toLowerCase().replace(/[–—]/g, '-'))) problems.push('employment date range missing or altered: ' + range);
  // Numeric claims are checked only in AI-tailorable sections. Source-preserved sections
  // are protected by exact content comparison, avoiding false positives from source facts.
  const tailoredText = ['professional_summary','core_competencies'].map(id => String(candidateSections?.[id] || '')).join('\n');
  const unsupportedNumbers = findUnsupportedNumbers(tailoredText, sourceAll);
  if (unsupportedNumbers.length) problems.push('unsupported numeric claims: ' + unsupportedNumbers.join(', '));
  return problems;
}
