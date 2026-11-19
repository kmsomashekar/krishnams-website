import test from 'node:test';
import assert from 'node:assert/strict';
import { parseResumeContextSections, findUnsupportedNumbers, validateResumePreservation } from '../src/resume-preservation.js';

const sample = `CONTACT DETAILS
Krishna Mulbagal Somashekar
Bengaluru | email@example.com

PROFESSIONAL PROFILE
IT leader with 25+ years of experience.

CORE COMPETENCIES
Infrastructure leadership; cybersecurity; governance.

PROFESSIONAL EXPERIENCE
EMPLOYER: Example Corp
TITLE: Head of IT
DATES: Jan 2015 - Dec 2025
- Led infrastructure and security.

KEY ACHIEVEMENTS
- Reduced costs by 15%.

TECHNOLOGIES & PLATFORMS
AWS, Azure, Microsoft 365.

SECURITY & GOVERNANCE
ISO 27001, GRC, SIEM.

CERTIFICATIONS
CISM
CCISO

EDUCATION
Master of Computer Applications, IGNOU

SELECTED TECHNOLOGY INITIATIVES & DIGITAL PORTFOLIO
Resume Manager | https://example.com
- Built a resume management application.

CAREER FACTS & CONSTRAINTS
Experience span: 2005-Present.

IMPORTANT EVIDENCE
25+ years experience; 15% cost reduction.`;

test('parses contact, education, certification and portfolio as distinct sections', () => {
  const sections = parseResumeContextSections(sample);
  assert.match(sections.contact_details, /Krishna Mulbagal Somashekar/);
  assert.match(sections.education, /Master of Computer Applications/);
  assert.match(sections.certifications, /CISM/);
  assert.match(sections.portfolio, /Resume Manager/);
  assert.match(sections.technical_skills, /AWS/);
  assert.match(sections.technical_skills, /ISO 27001/);
});

test('does not accept unsupported numeric claims', () => {
  assert.deepEqual(findUnsupportedNumbers('Managed a 20-year programme', '25+ years of experience'), ['20years']);
});

test('accepts exact source content for immutable sections', () => {
  const source = parseResumeContextSections(sample);
  const candidate = {
    professional_summary: source.professional_summary,
    core_competencies: source.core_competencies,
    professional_experience: source.professional_experience,
    achievements: source.achievements,
    technical_skills: source.technical_skills
  };
  assert.deepEqual(validateResumePreservation(source, candidate), []);
});

test('flags changed protected content instead of word-count-only preservation', () => {
  const source = parseResumeContextSections(sample);
  const candidate = {
    professional_summary: source.professional_summary,
    core_competencies: source.core_competencies,
    professional_experience: source.professional_experience,
    achievements: source.achievements.replace('15%', '10%'),
    technical_skills: source.technical_skills
  };
  assert.ok(validateResumePreservation(source, candidate).some(problem => problem.includes('achievements differs from the canonical')));
});
