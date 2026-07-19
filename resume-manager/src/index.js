// =============================================================================
// File: resume-manager/src/index.js
// Approved Phase: Stage 1 — Task 1.6F (ATS Analysis API Implementation)
// Target Platform: Cloudflare Workers + D1 (SQLite)
// Architecture: Isolated Same-Origin API Router
// =============================================================================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method.toUpperCase();

    // -------------------------------------------------------------------------
    // 1. CORS & Same-Origin Policy Configuration
    // -------------------------------------------------------------------------
    const headers = new Headers({
      'Content-Type': 'application/json',
    });

    // -------------------------------------------------------------------------
    // 2. Phase 1 Development Authentication Context Injection
    // -------------------------------------------------------------------------
    const userId = env.DEV_USER_ID || 'dev-user-default-123';

    try {
      // -------------------------------------------------------------------------
      // 3. Health Endpoint Pipeline (Preserving Environment Property Context)
      // -------------------------------------------------------------------------
      if (pathname === '/api/v1/health' && method === 'GET') {
        return new Response(
          JSON.stringify({ 
            success: true, 
            data: { 
              status: 'healthy', 
              environment: env.ENVIRONMENT || 'development',
              timestamp: new Date().toISOString() 
            } 
          }),
          { status: 200, headers }
        );
      }

      // -------------------------------------------------------------------------
      // 4. RESTful Route Routing Pipeline
      // -------------------------------------------------------------------------
      
      // Route Match Definitions
      const resumeRootPattern = '/api/v1/resumes';
      const companyRootPattern = '/api/v1/companies';
      const opportunityRootPattern = '/api/v1/opportunities';
      
      const resumeIdRegex = /^\/api\/v1\/resumes\/([^\/]+)$/;
      const versionsRootRegex = /^\/api\/v1\/resumes\/([^\/]+)\/versions$/;
      const versionIdRegex = /^\/api\/v1\/resumes\/([^\/]+)\/versions\/([^\/]+)$/;
      
      const opportunityIdRegex = /^\/api\/v1\/opportunities\/([^\/]+)$/;
      const opportunityStatusRegex = /^\/api\/v1\/opportunities\/([^\/]+)\/status$/;
      const jobDescriptionRegex = /^\/api\/v1\/opportunities\/([^\/]+)\/job-description$/;
      const atsAnalysisRegex = /^\/api\/v1\/opportunities\/([^\/]+)\/ats-analysis$/;

      // =======================================================================
      // MODULE: ATS ANALYSIS API
      // =======================================================================
      const atsMatch = pathname.match(atsAnalysisRegex);
      if (atsMatch) {
        const opportunityId = atsMatch[1];

        // Access validation: Check opportunity visibility and ownership scope
        const opportunity = await env.DB.prepare(
          `SELECT id FROM opportunities WHERE id = ? AND user_id = ?`
        )
        .bind(opportunityId, userId)
        .first();

        if (!opportunity) {
          return buildErrorResponse('NOT_FOUND', "The targeted opportunity does not exist or access rights are restricted.", 404, headers);
        }

        // --- POST /api/v1/opportunities/:id/ats-analysis (Create ATS Analysis) ---
        if (method === 'POST') {
          let body;
          try {
            body = await request.json();
          } catch (e) {
            return buildErrorResponse('INVALID_INPUT', "Request payload must be a valid JSON structure.", 400, headers);
          }

          const { resume_version_id, match_score, missing_keywords, skill_gaps, improvement_suggestions } = body;

          // Structural validation rules
          if (!resume_version_id || typeof resume_version_id !== 'string') {
            return buildErrorResponse('INVALID_INPUT', "Field 'resume_version_id' is a required string parameter.", 400, headers);
          }

          // Validate match_score type and domain boundaries [0-100]
          if (match_score === undefined || typeof match_score !== 'number' || !Number.isInteger(match_score) || match_score < 0 || match_score > 100) {
            return buildErrorResponse('INVALID_INPUT', "Field 'match_score' is required and must be an integer between 0 and 100.", 400, headers);
          }

          // Verify targeted resume version exists and belongs to current user scope
          const version = await env.DB.prepare(
            `SELECT rv.id FROM resume_versions rv 
             JOIN resumes r ON rv.resume_id = r.id 
             WHERE rv.id = ? AND r.user_id = ?`
          )
          .bind(resume_version_id, userId)
          .first();

          if (!version) {
            return buildErrorResponse('NOT_FOUND', "The targeted resume version does not exist or access rights are restricted.", 404, headers);
          }

          // Validate optional array structural constraints
          let missingKeywordsText = null;
          let missingKeywordsResponse = [];
          if (missing_keywords !== undefined) {
            if (!Array.isArray(missing_keywords)) {
              return buildErrorResponse('INVALID_INPUT', "Field 'missing_keywords' must be a valid array.", 400, headers);
            }
            missingKeywordsText = JSON.stringify(missing_keywords);
            missingKeywordsResponse = missing_keywords;
          }

          let skillGapsText = null;
          let skillGapsResponse = [];
          if (skill_gaps !== undefined) {
            if (!Array.isArray(skill_gaps)) {
              return buildErrorResponse('INVALID_INPUT', "Field 'skill_gaps' must be a valid array.", 400, headers);
            }
            skillGapsText = JSON.stringify(skill_gaps);
            skillGapsResponse = skill_gaps;
          }

          if (improvement_suggestions !== undefined && typeof improvement_suggestions !== 'string') {
            return buildErrorResponse('INVALID_INPUT', "Field 'improvement_suggestions' must be a string.", 400, headers);
          }

          const id = crypto.randomUUID();
          const now = new Date().toISOString();

          await env.DB.prepare(
            `INSERT INTO ats_analysis (id, opportunity_id, resume_version_id, match_score, missing_keywords, skill_gaps, improvement_suggestions, analyzed_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(id, opportunityId, resume_version_id, match_score, missingKeywordsText, skillGapsText, improvement_suggestions || null, now)
          .run();

          return new Response(
            JSON.stringify({
              success: true,
              data: {
                id,
                opportunity_id: opportunityId,
                resume_version_id,
                match_score,
                missing_keywords: missingKeywordsResponse,
                skill_gaps: skillGapsResponse,
                improvement_suggestions: improvement_suggestions || "",
                analyzed_at: now
              }
            }),
            { status: 201, headers }
          );
        }

        // --- GET /api/v1/opportunities/:id/ats-analysis (Get Latest ATS Analysis) ---
        if (method === 'GET') {
          const ats = await env.DB.prepare(
            `SELECT id, opportunity_id, resume_version_id, match_score, missing_keywords, skill_gaps, improvement_suggestions, analyzed_at
             FROM ats_analysis
             WHERE opportunity_id = ?
             ORDER BY analyzed_at DESC LIMIT 1`
          )
          .bind(opportunityId)
          .first();

          if (!ats) {
            return buildErrorResponse('NOT_FOUND', "ATS analysis does not exist.", 404, headers);
          }

          // Safe unmarshalling of database-serialized array text formats
          let parsedKeywords = [];
          if (ats.missing_keywords) {
            try {
              parsedKeywords = JSON.parse(ats.missing_keywords);
            } catch (e) {
              parsedKeywords = [];
            }
          }

          let parsedGaps = [];
          if (ats.skill_gaps) {
            try {
              parsedGaps = JSON.parse(ats.skill_gaps);
            } catch (e) {
              parsedGaps = [];
            }
          }

          return new Response(
            JSON.stringify({
              success: true,
              data: {
                id: ats.id,
                opportunity_id: ats.opportunity_id,
                resume_version_id: ats.resume_version_id,
                match_score: ats.match_score,
                missing_keywords: parsedKeywords,
                skill_gaps: parsedGaps,
                improvement_suggestions: ats.improvement_suggestions || "",
                analyzed_at: ats.analyzed_at
              }
            }),
            { status: 200, headers }
          );
        }
      }

      // =======================================================================
      // MODULE: JOB DESCRIPTION API
      // =======================================================================
      const jdMatch = pathname.match(jobDescriptionRegex);
      if (jdMatch) {
        const opportunityId = jdMatch[1];

        const opportunity = await env.DB.prepare(
          `SELECT id FROM opportunities WHERE id = ? AND user_id = ?`
        )
        .bind(opportunityId, userId)
        .first();

        if (!opportunity) {
          return buildErrorResponse('NOT_FOUND', "The targeted opportunity does not exist or access rights are restricted.", 404, headers);
        }

        if (method === 'POST') {
          let body;
          try {
            body = await request.json();
          } catch (e) {
            return buildErrorResponse('INVALID_INPUT', "Request payload must be a valid JSON structure.", 400, headers);
          }

          const { raw_text, extracted_skills } = body;

          if (!raw_text || typeof raw_text !== 'string' || raw_text.trim().length === 0) {
            return buildErrorResponse('INVALID_INPUT', "Field 'raw_text' is a required non-empty string parameter.", 400, headers);
          }

          const existingJd = await env.DB.prepare(
            `SELECT id FROM job_descriptions WHERE opportunity_id = ?`
          )
          .bind(opportunityId)
          .first();

          if (existingJd) {
            return buildErrorResponse('CONFLICT', "Job description already exists for this opportunity.", 409, headers);
          }

          let skillsText = null;
          let skillsResponse = [];
          if (extracted_skills !== undefined) {
            if (!Array.isArray(extracted_skills)) {
              return buildErrorResponse('INVALID_INPUT', "Field 'extracted_skills' must be a valid array.", 400, headers);
            }
            skillsText = JSON.stringify(extracted_skills);
            skillsResponse = extracted_skills;
          }

          const id = crypto.randomUUID();
          const now = new Date().toISOString();

          await env.DB.prepare(
            `INSERT INTO job_descriptions (id, opportunity_id, raw_text, extracted_skills, created_at)
             VALUES (?, ?, ?, ?, ?)`
          )
          .bind(id, opportunityId, raw_text.trim(), skillsText, now)
          .run();

          return new Response(
            JSON.stringify({
              success: true,
              data: {
                id,
                opportunity_id: opportunityId,
                raw_text: raw_text.trim(),
                extracted_skills: skillsResponse,
                created_at: now
              }
            }),
            { status: 201, headers }
          );
        }

        if (method === 'GET') {
          const jd = await env.DB.prepare(
            `SELECT id, opportunity_id, raw_text, extracted_skills, created_at
             FROM job_descriptions
             WHERE opportunity_id = ?`
          )
          .bind(opportunityId)
          .first();

          if (!jd) {
            return buildErrorResponse('NOT_FOUND', "Job description does not exist.", 404, headers);
          }

          let parsedSkills = [];
          if (jd.extracted_skills) {
            try {
              parsedSkills = JSON.parse(jd.extracted_skills);
            } catch (e) {
              parsedSkills = [];
            }
          }

          return new Response(
            JSON.stringify({
              success: true,
              data: {
                id: jd.id,
                opportunity_id: jd.opportunity_id,
                raw_text: jd.raw_text,
                extracted_skills: parsedSkills,
                created_at: jd.created_at
              }
            }),
            { status: 200, headers }
          );
        }
      }

      // =======================================================================
      // MODULE: OPPORTUNITIES API
      // =======================================================================

      // --- POST /api/v1/opportunities (Create Opportunity) ---
      if (pathname === opportunityRootPattern && method === 'POST') {
        let body;
        try {
          body = await request.json();
        } catch (e) {
          return buildErrorResponse('INVALID_INPUT', "Request payload must be a valid JSON structure.", 400, headers);
        }

        const { 
          company_id, resume_version_id, job_title, priority, 
          application_url, date_identified, date_applied, notes 
        } = body;

        if (!company_id || typeof company_id !== 'string') {
          return buildErrorResponse('INVALID_INPUT', "Field 'company_id' is a required string parameter.", 400, headers);
        }
        if (!job_title || typeof job_title !== 'string' || job_title.trim().length === 0) {
          return buildErrorResponse('INVALID_INPUT', "Field 'job_title' is a required non-empty string.", 400, headers);
        }

        const parsedPriority = priority !== undefined ? parseInt(priority, 10) : 3;
        if (isNaN(parsedPriority) || parsedPriority < 1 || parsedPriority > 5) {
          return buildErrorResponse('INVALID_INPUT', "Priority must be an integer between 1 and 5.", 400, headers);
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (date_identified && !dateRegex.test(date_identified)) {
          return buildErrorResponse('INVALID_INPUT', "Field 'date_identified' must use YYYY-MM-DD format.", 400, headers);
        }
        if (date_applied && !dateRegex.test(date_applied)) {
          return buildErrorResponse('INVALID_INPUT', "Field 'date_applied' must use YYYY-MM-DD format.", 400, headers);
        }

        const company = await env.DB.prepare(
          `SELECT id FROM companies WHERE id = ? AND user_id = ?`
        )
        .bind(company_id, userId)
        .first();

        if (!company) {
          return buildErrorResponse('NOT_FOUND', "The targeted company context does not exist or access rights are restricted.", 404, headers);
        }

        if (resume_version_id) {
          const version = await env.DB.prepare(
            `SELECT rv.id FROM resume_versions rv 
             JOIN resumes r ON rv.resume_id = r.id 
             WHERE rv.id = ? AND r.user_id = ?`
          )
          .bind(resume_version_id, userId)
          .first();

          if (!version) {
            return buildErrorResponse('NOT_FOUND', "The targeted resume version does not exist or access rights are restricted.", 404, headers);
          }
        }

        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const defaultStatus = 'CONSIDERING';

        await env.DB.prepare(
          `INSERT INTO opportunities (
            id, user_id, company_id, resume_version_id, job_title, status, 
            priority, application_url, date_identified, date_applied, notes, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          id, userId, company_id, resume_version_id || null, job_title.trim(), defaultStatus,
          parsedPriority, application_url ? application_url.trim() : null, 
          date_identified || null, date_applied || null, notes ? notes.trim() : null, now, now
        )
        .run();

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              id,
              company_id,
              resume_version_id: resume_version_id || null,
              job_title: job_title.trim(),
              status: defaultStatus,
              priority: parsedPriority,
              created_at: now,
              updated_at: now
            }
          }),
          { status: 201, headers }
        );
      }

      // --- GET /api/v1/opportunities (List Opportunities) ---
      if (pathname === opportunityRootPattern && method === 'GET') {
        const { results } = await env.DB.prepare(
          `SELECT o.id, c.name AS company_name, o.job_title, o.status, o.priority, o.date_applied, o.updated_at
           FROM opportunities o
           JOIN companies c ON o.company_id = c.id
           WHERE o.user_id = ?
           ORDER BY o.updated_at DESC`
        )
        .bind(userId)
        .all();

        return new Response(
          JSON.stringify({ success: true, data: { opportunities: results } }),
          { status: 200, headers }
        );
      }

      // --- PATCH /api/v1/opportunities/:id/status (Update Opportunity Status) ---
      const statusMatch = pathname.match(opportunityStatusRegex);
      if (statusMatch && method === 'PATCH') {
        const opportunityId = statusMatch[1];
        
        let body;
        try {
          body = await request.json();
        } catch (e) {
          return buildErrorResponse('INVALID_INPUT', "Request payload must be a valid JSON structure.", 400, headers);
        }

        const { status } = body;
        const allowedStatuses = ['CONSIDERING', 'APPLIED', 'UNDER_REVIEW', 'INTERVIEWING', 'OFFER', 'REJECTED', 'NO_RESPONSE'];
        
        if (!status || !allowedStatuses.includes(status)) {
          return buildErrorResponse('INVALID_INPUT', `Invalid status value provided. Allowed values: ${allowedStatuses.join(', ')}`, 400, headers);
        }

        const opportunity = await env.DB.prepare(
          `SELECT id FROM opportunities WHERE id = ? AND user_id = ?`
        )
        .bind(opportunityId, userId)
        .first();

        if (!opportunity) {
          return buildErrorResponse('NOT_FOUND', "The targeted opportunity does not exist or access rights are restricted.", 404, headers);
        }

        const now = new Date().toISOString();

        await env.DB.prepare(
          `UPDATE opportunities SET status = ?, updated_at = ? WHERE id = ? AND user_id = ?`
        )
        .bind(status, now, opportunityId, userId)
        .run();

        return new Response(
          JSON.stringify({ success: true, data: { id: opportunityId, status, updated_at: now } }),
          { status: 200, headers }
        );
      }

      // --- GET /api/v1/opportunities/:id (Get Opportunity Details Dashboard) ---
      const oppIdMatch = pathname.match(opportunityIdRegex);
      if (oppIdMatch && !pathname.includes('/status') && !pathname.includes('/job-description') && !pathname.includes('/ats-analysis') && method === 'GET') {
        const opportunityId = oppIdMatch[1];

        const opportunity = await env.DB.prepare(
          `SELECT id, company_id, resume_version_id, job_title, status, priority, 
                  application_url, date_identified, date_applied, notes, created_at, updated_at
           FROM opportunities 
           WHERE id = ? AND user_id = ?`
        )
        .bind(opportunityId, userId)
        .first();

        if (!opportunity) {
          return buildErrorResponse('NOT_FOUND', "The targeted opportunity portfolio tracking context does not exist.", 404, headers);
        }

        const company = await env.DB.prepare(
          `SELECT id, name, website, location, notes FROM companies WHERE id = ?`
        )
        .bind(opportunity.company_id)
        .first();

        let resumeVersion = null;
        if (opportunity.resume_version_id) {
          resumeVersion = await env.DB.prepare(
            `SELECT id, version_label, target_role, r2_object_key FROM resume_versions WHERE id = ?`
          )
          .bind(opportunity.resume_version_id)
          .first();
        }

        const jobDescription = await env.DB.prepare(
          `SELECT id, opportunity_id, raw_text, extracted_skills, created_at
           FROM job_descriptions 
           WHERE opportunity_id = ? 
           ORDER BY created_at DESC LIMIT 1`
        )
        .bind(opportunityId)
        .first();

        if (jobDescription) {
          let parsedSkills = [];
          if (jobDescription.extracted_skills) {
            try {
              parsedSkills = JSON.parse(jobDescription.extracted_skills);
            } catch (e) {
              parsedSkills = [];
            }
          }
          jobDescription.extracted_skills = parsedSkills;
        }

        let atsAnalysis = await env.DB.prepare(
          `SELECT id, resume_version_id, opportunity_id, match_score, missing_keywords, skill_gaps, improvement_suggestions, analyzed_at
           FROM ats_analysis 
           WHERE opportunity_id = ?
           ORDER BY analyzed_at DESC LIMIT 1`
        )
        .bind(opportunityId)
        .first();

        // Safe JSON parsing requirement integration for Dashboard metrics
        if (atsAnalysis) {
          let parsedKeywords = [];
          if (atsAnalysis.missing_keywords) {
            try {
              parsedKeywords = JSON.parse(atsAnalysis.missing_keywords);
            } catch (e) {
              parsedKeywords = [];
            }
          }

          let parsedGaps = [];
          if (atsAnalysis.skill_gaps) {
            try {
              parsedGaps = JSON.parse(atsAnalysis.skill_gaps);
            } catch (e) {
              parsedGaps = [];
            }
          }

          atsAnalysis.missing_keywords = parsedKeywords;
          atsAnalysis.skill_gaps = parsedGaps;
        }

        const { results: interviews } = await env.DB.prepare(
          `SELECT id, opportunity_id, round_title, round_number, interviewer_names, interview_date, status, preparation_notes, questions_asked, feedback_notes
           FROM interviews 
           WHERE opportunity_id = ? 
           ORDER BY round_number ASC, interview_date ASC`
        )
        .bind(opportunityId)
        .all();

        const dashboardPayload = {
          id: opportunity.id,
          job_title: opportunity.job_title,
          status: opportunity.status,
          priority: opportunity.priority,
          application_url: opportunity.application_url,
          date_identified: opportunity.date_identified,
          date_applied: opportunity.date_applied,
          notes: opportunity.notes,
          created_at: opportunity.created_at,
          updated_at: opportunity.updated_at,
          company: company || null,
          resume_version: resumeVersion || null,
          job_description: jobDescription || null,
          ats_analysis: atsAnalysis || null,
          interviews: interviews || []
        };

        return new Response(
          JSON.stringify({ success: true, data: dashboardPayload }),
          { status: 200, headers }
        );
      }

      // =======================================================================
      // MODULE: COMPANIES API
      // =======================================================================

      if (pathname === companyRootPattern && method === 'POST') {
        let body;
        try {
          body = await request.json();
        } catch (e) {
          return buildErrorResponse('INVALID_INPUT', "Request payload must be a valid JSON structure.", 400, headers);
        }

        const { name, website, location, notes } = body;
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
          return buildErrorResponse('INVALID_INPUT', "Field 'name' is a required non-empty string parameter.", 400, headers);
        }

        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        await env.DB.prepare(
          `INSERT INTO companies (id, user_id, name, website, location, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(id, userId, name.trim(), website ? website.trim() : null, location ? location.trim() : null, notes ? notes.trim() : null, now)
        .run();

        return new Response(
          JSON.stringify({
            success: true,
            data: { id, name: name.trim(), website: website ? website.trim() : null, location: location ? location.trim() : null, notes: notes ? notes.trim() : null, created_at: now }
          }),
          { status: 201, headers }
        );
      }

      if (pathname === companyRootPattern && method === 'GET') {
        const { results } = await env.DB.prepare(
          `SELECT id, name, website, location, notes, created_at
           FROM companies
           WHERE user_id = ?
           ORDER BY name ASC`
        )
        .bind(userId)
        .all();

        return new Response(
          JSON.stringify({ success: true, data: { companies: results } }),
          { status: 200, headers }
        );
      }

      // =======================================================================
      // MODULE: RESUMES & VERSIONS API
      // =======================================================================

      if (pathname === resumeRootPattern && method === 'POST') {
        let body;
        try {
          body = await request.json();
        } catch (e) {
          return buildErrorResponse('INVALID_INPUT', "Request payload must be a valid JSON structure.", 400, headers);
        }

        const { name, notes } = body;
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
          return buildErrorResponse('INVALID_INPUT', "Field 'name' is a required input property structure.", 400, headers);
        }

        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        await env.DB.prepare(
          `INSERT INTO resumes (id, user_id, name, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .bind(id, userId, name.trim(), notes ? notes.trim() : null, now, now)
        .run();

        return new Response(
          JSON.stringify({
            success: true,
            data: { id, name: name.trim(), notes: notes ? notes.trim() : null, created_at: now, updated_at: now }
          }),
          { status: 201, headers }
        );
      }

      if (pathname === resumeRootPattern && method === 'GET') {
        const { results } = await env.DB.prepare(
          `SELECT id, name, notes, created_at, updated_at 
           FROM resumes 
           WHERE user_id = ? 
           ORDER BY created_at DESC`
        )
        .bind(userId)
        .all();

        return new Response(
          JSON.stringify({ success: true, data: { resumes: results } }),
          { status: 200, headers }
        );
      }

      const versionsMatch = pathname.match(versionsRootRegex);
      if (versionsMatch) {
        const resumeId = versionsMatch[1];

        const parentResume = await env.DB.prepare(
          `SELECT id FROM resumes WHERE id = ? AND user_id = ?`
        )
        .bind(resumeId, userId)
        .first();

        if (!parentResume) {
          return buildErrorResponse('NOT_FOUND', "The targeted parent resume does not exist or access rights are restricted.", 404, headers);
        }

        if (method === 'POST') {
          let body;
          try {
            body = await request.json();
          } catch (e) {
            return buildErrorResponse('INVALID_INPUT', "Request payload must be a valid JSON structure.", 400, headers);
          }

          const { version_label, target_role, r2_object_key } = body;
          if (!version_label || typeof version_label !== 'string' || version_label.trim().length === 0) {
            return buildErrorResponse('INVALID_INPUT', "Field 'version_label' is a required non-empty string.", 400, headers);
          }

          const id = crypto.randomUUID();
          const now = new Date().toISOString();
          const isActive = 1;

          await env.DB.prepare(
            `INSERT INTO resume_versions (id, resume_id, version_label, target_role, r2_object_key, is_active, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(id, resumeId, version_label.trim(), target_role ? target_role.trim() : null, r2_object_key ? r2_object_key.trim() : null, isActive, now)
          .run();

          return new Response(
            JSON.stringify({
              success: true,
              data: { id, resume_id: resumeId, version_label: version_label.trim(), target_role: target_role ? target_role.trim() : null, r2_object_key: r2_object_key ? r2_object_key.trim() : null, is_active: isActive, created_at: now }
            }),
            { status: 201, headers }
          );
        }

        if (method === 'GET') {
          const { results } = await env.DB.prepare(
            `SELECT id, resume_id, version_label, target_role, r2_object_key, is_active, created_at
             FROM resume_versions
             WHERE resume_id = ?
             ORDER BY created_at DESC`
          )
          .bind(resumeId)
          .all();

          return new Response(
            JSON.stringify({ success: true, data: { versions: results } }),
            { status: 200, headers }
          );
        }
      }

      const versionIdMatch = pathname.match(versionIdRegex);
      if (versionIdMatch) {
        const resumeId = versionIdMatch[1];
        const versionId = versionIdMatch[2];

        const parentResume = await env.DB.prepare(
          `SELECT id FROM resumes WHERE id = ? AND user_id = ?`
        )
        .bind(resumeId, userId)
        .first();

        if (!parentResume) {
          return buildErrorResponse('NOT_FOUND', "The targeted parent resume does not exist or access rights are restricted.", 404, headers);
        }

        if (method === 'GET') {
          const version = await env.DB.prepare(
            `SELECT id, resume_id, version_label, target_role, r2_object_key, is_active, created_at
             FROM resume_versions
             WHERE id = ? AND resume_id = ?`
          )
          .bind(versionId, resumeId)
          .first();

          if (!version) {
            return buildErrorResponse('NOT_FOUND', "The targeted version resource does not exist under this portfolio context.", 404, headers);
          }

          const { results: atsScores } = await env.DB.prepare(
            `SELECT a.id, a.opportunity_id, a.match_score, a.analyzed_at
             FROM ats_analysis a
             WHERE a.resume_version_id = ?
             ORDER BY a.analyzed_at DESC`
          )
          .bind(versionId)
          .all();

          version.historical_ats_scores = atsScores || [];

          return new Response(
            JSON.stringify({ success: true, data: version }),
            { status: 200, headers }
          );
        }
      }

      const idMatch = pathname.match(resumeIdRegex);
      if (idMatch && !pathname.includes('/versions')) {
        const resumeId = idMatch[1];

        if (method === 'GET') {
          const resume = await env.DB.prepare(
            `SELECT id, name, notes, created_at, updated_at 
             FROM resumes 
             WHERE id = ? AND user_id = ?`
          )
          .bind(resumeId, userId)
          .first();

          if (!resume) {
            return buildErrorResponse('NOT_FOUND', "The targeted resource does not exist or access rights are restricted.", 404, headers);
          }

          const { results: versions } = await env.DB.prepare(
            `SELECT id, version_label, target_role, is_active, created_at
             FROM resume_versions 
             WHERE resume_id = ? 
             ORDER BY created_at DESC`
          )
          .bind(resumeId)
          .all();

          resume.versions = versions;

          return new Response(
            JSON.stringify({ success: true, data: { ...resume } }),
            { status: 200, headers }
          );
        }

        if (method === 'PUT') {
          let body;
          try {
            body = await request.json();
          } catch (e) {
            return buildErrorResponse('INVALID_INPUT', "Request payload must be a valid JSON structure.", 400, headers);
          }

          const { name, notes } = body;
          if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
            return buildErrorResponse('INVALID_INPUT', "Field 'name' cannot be empty when provided.", 400, headers);
          }

          const existing = await env.DB.prepare(
            `SELECT id, name, notes, created_at FROM resumes WHERE id = ? AND user_id = ?`
          )
          .bind(resumeId, userId)
          .first();

          if (!existing) {
            return buildErrorResponse('NOT_FOUND', "The targeted resource does not exist or access rights are restricted.", 404, headers);
          }

          const updatedName = name !== undefined ? name.trim() : existing.name;
          const updatedNotes = notes !== undefined ? (notes ? notes.trim() : null) : existing.notes;
          const now = new Date().toISOString();

          await env.DB.prepare(
            `UPDATE resumes 
             SET name = ?, notes = ?, updated_at = ? 
             WHERE id = ? AND user_id = ?`
          )
          .bind(updatedName, updatedNotes, now, resumeId, userId)
          .run();

          return new Response(
            JSON.stringify({
              success: true,
              data: { id: resumeId, name: updatedName, notes: updatedNotes, created_at: existing.created_at, updated_at: now }
            }),
            { status: 200, headers }
          );
        }

        if (method === 'DELETE') {
          const existing = await env.DB.prepare(
            `SELECT id FROM resumes WHERE id = ? AND user_id = ?`
          )
          .bind(resumeId, userId)
          .first();

          if (!existing) {
            return buildErrorResponse('NOT_FOUND', "The targeted resource does not exist or access rights are restricted.", 404, headers);
          }

          await env.DB.prepare(`DELETE FROM resumes WHERE id = ? AND user_id = ?`)
            .bind(resumeId, userId)
            .run();

          return new Response(
            JSON.stringify({ success: true, data: { id: resumeId, deleted: true } }),
            { status: 200, headers }
          );
        }
      }

      // -------------------------------------------------------------------------
      // 5. Asset Fallback Route Handler
      // -------------------------------------------------------------------------
      if (env.ASSETS) {
        return await env.ASSETS.fetch(request);
      }

      return buildErrorResponse('NOT_FOUND', "Endpoint or configuration asset layout path could not be located.", 404, headers);

    } catch (error) {
      return buildErrorResponse(
        'INTERNAL_SERVER_ERROR',
        error.message || "An unexpected tracking engine data processing exception was encountered.",
        500,
        headers
      );
    }
  }
};

// -----------------------------------------------------------------------------
// Global Envelope Error Component Helper Blueprint
// -----------------------------------------------------------------------------
function buildErrorResponse(code, message, status, baseHeaders) {
  return new Response(
    JSON.stringify({
      success: false,
      error: { code, message }
    }),
    { status, headers: baseHeaders }
  );
}