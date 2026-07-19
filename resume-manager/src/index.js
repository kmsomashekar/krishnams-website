// =============================================================================
// File: resume-manager/src/index.js
// Approved Phase: Stage 1 — Task 1.6G (Interview API Implementation)
// Target Platform: Cloudflare Workers + D1 (SQLite)
// Architecture: Isolated Same-Origin API Router
// =============================================================================

// --- GEMINI AI SERVICE CONFIGURATION CONTROLS ---
const GEMINI_MODEL = 'gemini-3.1-flash-lite';

async function callGemini(message, apiKey) {
  const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: message
          }
        ]
      }
    ],
    generationConfig: {
      maxOutputTokens: 100
    }
  };

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 20000);

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify(requestBody),
      signal: abortController.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        errorType: 'PROVIDER_ERROR',
        status: response.status
      };
    }

    const responseData = await response.json();
    const generatedText = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (typeof generatedText !== 'string') {
      return { errorType: 'BAD_STRUCTURE' };
    }

    return { success: true, text: generatedText };

  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      return { errorType: 'TIMEOUT' };
    }
    return { errorType: 'NETWORK_FAILURE' };
  }
}

async function callAIProvider(message, env) {
  if (!env.GEMINI_API_KEY) {
    return { errorType: 'MISSING_KEY' };
  }
  return await callGemini(message, env.GEMINI_API_KEY);
}

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
      
      // Additive R2 File Storage Match Pattern Definition
      const versionFileRegex = /^\/api\/v1\/resumes\/([^\/]+)\/versions\/([^\/]+)\/file$/;

      const opportunityIdRegex = /^\/api\/v1\/opportunities\/([^\/]+)$/;
      const opportunityStatusRegex = /^\/api\/v1\/opportunities\/([^\/]+)\/status$/;
      const jobDescriptionRegex = /^\/api\/v1\/opportunities\/([^\/]+)\/job-description$/;
      const atsAnalysisRegex = /^\/api\/v1\/opportunities\/([^\/]+)\/ats-analysis$/;
      const interviewsRootRegex = /^\/api\/v1\/opportunities\/([^\/]+)\/interviews$/;
      const interviewStatusRegex = /^\/api\/v1\/interviews\/([^\/]+)\/status$/;

      // Additive Phase 1 Route Definitions
      const interviewsGlobalPattern = '/api/v1/interviews';
      const interviewIdRegex = /^\/api\/v1\/interviews\/([^\/]+)$/;

      // Additive Phase 1 Cover Letters Route Definitions
      const coverLetterRootPattern = '/api/v1/cover-letters';
      const coverLetterIdRegex = /^\/api\/v1\/cover-letters\/([^\/]+)$/;

      // =======================================================================
      // MODULE: GEMINI AI FOUNDATION TESTING ROUTE
      // =======================================================================
      if (pathname === '/api/v1/ai/test') {
        if (method !== 'POST') {
          return buildErrorResponse('METHOD_NOT_ALLOWED', "Method not supported for this test channel layout.", 405, headers);
        }

        if (!env.GEMINI_API_KEY) {
          return buildErrorResponse('INTERNAL_ERROR', "The target private artificial intelligence API key layout binding is currently unconfigured.", 500, headers);
        }

        let body;
        try {
          body = await request.json();
        } catch (e) {
          return buildErrorResponse('INVALID_INPUT', "Request payload must be a valid JSON structure.", 400, headers);
        }

        if (!body || typeof body.message !== 'string') {
          return buildErrorResponse('INVALID_INPUT', "The 'message' property is required and must be a valid text string.", 400, headers);
        }

        const cleanMessage = body.message.trim();
        if (cleanMessage.length === 0) {
          return buildErrorResponse('INVALID_INPUT', "The prompt payload 'message' structure cannot be empty.", 400, headers);
        }

        if (cleanMessage.length > 1000) {
          return buildErrorResponse('INVALID_INPUT', "The prompt length cannot exceed 1000 configuration characters.", 400, headers);
        }

        const aiResult = await callAIProvider(cleanMessage, env);

        if (aiResult.success) {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                provider: "gemini",
                model: GEMINI_MODEL,
                message: aiResult.text
              }
            }),
            { status: 200, headers }
          );
        }

        if (aiResult.errorType === 'TIMEOUT') {
          return buildErrorResponse('AI_PROVIDER_TIMEOUT', "Upstream interface connection execution limits timed out.", 504, headers);
        }

        if (aiResult.errorType === 'MISSING_KEY') {
          return buildErrorResponse('INTERNAL_ERROR', "The target private artificial intelligence API key layout binding is currently unconfigured.", 500, headers);
        }

        return buildErrorResponse('AI_PROVIDER_ERROR', "An upstream remote error was encountered within the provider connection loops.", 502, headers);
      }

      // =======================================================================
      // MODULE: PRIVATE R2 RESUME FILE STORAGE API
      // =======================================================================
      const versionFileMatch = pathname.match(versionFileRegex);
      if (versionFileMatch) {
        const resumeId = versionFileMatch[1];
        const versionId = versionFileMatch[2];

        // Validate R2 Bucket availability binding before structural execution paths
        if (!env.BUCKET) {
          return buildErrorResponse('INTERNAL_SERVER_ERROR', "The target private object storage cluster binding context is currently unavailable.", 500, headers);
        }

        // Deep ownership context enforcement validation query mapping
        const ownershipCheck = await env.DB.prepare(
          `SELECT rv.id, rv.r2_object_key FROM resume_versions rv
           JOIN resumes r ON r.id = rv.resume_id
           WHERE rv.id = ? AND rv.resume_id = ? AND r.user_id = ?`
        )
        .bind(versionId, resumeId, userId)
        .first();

        if (!ownershipCheck) {
          return buildErrorResponse('NOT_FOUND', "The targeted resume version portfolio tracking record does not exist or access rights are restricted.", 404, headers);
        }

        // --- PUT /api/v1/resumes/:resumeId/versions/:versionId/file (Upload/Replace) ---
        if (method === 'PUT') {
          const contentLengthHeader = request.headers.get('content-length');
          const maxFileBytes = 2 * 1024 * 1024; // 2MB exactly

          if (contentLengthHeader) {
            const parsedLength = parseInt(contentLengthHeader, 10);
            if (!isNaN(parsedLength) && parsedLength > maxFileBytes) {
              return buildErrorResponse('FILE_TOO_LARGE', "Resume file must not exceed 2 MB.", 413, headers);
            }
          }

          const rawBodyBuffer = await request.arrayBuffer();
          if (!rawBodyBuffer || rawBodyBuffer.byteLength === 0) {
            return buildErrorResponse('INVALID_INPUT', "The uploaded raw binary application document payload structure cannot be empty.", 400, headers);
          }

          if (rawBodyBuffer.byteLength > maxFileBytes) {
            return buildErrorResponse('FILE_TOO_LARGE', "Resume file must not exceed 2 MB.", 413, headers);
          }

          const rawContentType = request.headers.get('content-type') || '';
          const cleanContentType = rawContentType.toLowerCase().trim();
          
          const allowedMimeTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          ];

          if (!allowedMimeTypes.includes(cleanContentType)) {
            return buildErrorResponse('INVALID_INPUT', "Unsupported file MIME type profile. Only PDF or DOCX binary elements are valid.", 400, headers);
          }

          const rawXFileName = request.headers.get('x-file-name') || '';
          // Sanitize filename to mitigate header injection vectors or layout breakouts
          let sanitizedFileName = rawXFileName
            .replace(/[\r\n\t]/g, '')
            .replace(/["'/\\]/g, '_')
            .trim();
          
          if (sanitizedFileName.length > 200) {
            sanitizedFileName = sanitizedFileName.substring(0, 200);
          }

          const nameExtensionMatch = sanitizedFileName.match(/\.([^.]+)$/);
          if (!nameExtensionMatch) {
            return buildErrorResponse('INVALID_INPUT', "The provided filename must contain a valid file extension.", 400, headers);
          }

          const evaluatedExtension = nameExtensionMatch[1].toLowerCase();
          if (evaluatedExtension !== 'pdf' && evaluatedExtension !== 'docx') {
            return buildErrorResponse('INVALID_INPUT', "Mismatched or invalid document file target extension structure detected.", 400, headers);
          }

          // Strict checking of strict matching specifications criteria between MIME and Extensions
          if (cleanContentType === 'application/pdf' && evaluatedExtension !== 'pdf') {
            return buildErrorResponse('INVALID_INPUT', "Mismatched mapping parameters between PDF content and extension.", 400, headers);
          }
          if (cleanContentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' && evaluatedExtension !== 'docx') {
            return buildErrorResponse('INVALID_INPUT', "Mismatched mapping parameters between DOCX content and extension.", 400, headers);
          }

          const generatedUuid = crypto.randomUUID();
          const targetR2ObjectKey = `resumes/${userId}/${resumeId}/${versionId}/${generatedUuid}.${evaluatedExtension}`;

          // Execute R2 put with metadata retention rules mapping
          await env.BUCKET.put(targetR2ObjectKey, rawBodyBuffer, {
            httpMetadata: { contentType: cleanContentType },
            customMetadata: { original_filename: sanitizedFileName }
          });

          const oldR2ObjectKey = ownershipCheck.r2_object_key;

          await env.DB.prepare(
            `UPDATE resume_versions SET r2_object_key = ? WHERE id = ?`
          )
          .bind(targetR2ObjectKey, versionId)
          .run();

          // Safely execute old resource elimination cleanup processing after confirmation pointer updates
          if (oldR2ObjectKey) {
            ctx.waitUntil(
              env.BUCKET.delete(oldR2ObjectKey)
                .catch(err => console.error(`Failed to clean old stored path reference key layout: ${err.message}`))
            );
          }

          return new Response(
            JSON.stringify({
              success: true,
              data: {
                resume_id: resumeId,
                version_id: versionId,
                filename: sanitizedFileName,
                content_type: cleanContentType,
                size: rawBodyBuffer.byteLength,
                has_file: true
              }
            }),
            { status: 200, headers }
          );
        }

        // --- GET /api/v1/resumes/:resumeId/versions/:versionId/file (Private Worker Mediation Download) ---
        if (method === 'GET') {
          const targetR2Key = ownershipCheck.r2_object_key;
          if (!targetR2Key) {
            return buildErrorResponse('NOT_FOUND', "No document storage entity mapping is configured for this record profile.", 404, headers);
          }

          const fileObject = await env.BUCKET.get(targetR2Key);
          if (!fileObject) {
            return buildErrorResponse('NOT_FOUND', "The targeted payload asset could not be recovered from object tier segments.", 404, headers);
          }

          const customHeaders = new Headers();
          const detectedContentType = fileObject.httpMetadata?.contentType || 'application/octet-stream';
          customHeaders.set('Content-Type', detectedContentType);

          let storedMetaFileName = fileObject.customMetadata?.original_filename;
          if (!storedMetaFileName) {
            storedMetaFileName = detectedContentType === 'application/pdf' ? 'resume.pdf' : 'resume.docx';
          }
          
          const cleanDownloadName = storedMetaFileName.replace(/["\r\n]/g, '_');
          customHeaders.set('Content-Disposition', `attachment; filename="${cleanDownloadName}"`);
          
          if (fileObject.size) {
            customHeaders.set('Content-Length', fileObject.size.toString());
          }

          return new Response(fileObject.body, {
            status: 200,
            headers: customHeaders
          });
        }

        // --- DELETE /api/v1/resumes/:resumeId/versions/:versionId/file (Asset Purge Workflow) ---
        if (method === 'DELETE') {
          const targetR2Key = ownershipCheck.r2_object_key;
          if (!targetR2Key) {
            return buildErrorResponse('NOT_FOUND', "No document file element is configured to this entity.", 404, headers);
          }

          await env.BUCKET.delete(targetR2Key);

          await env.DB.prepare(
            `UPDATE resume_versions SET r2_object_key = NULL WHERE id = ?`
          )
          .bind(versionId)
          .run();

          return new Response(
            JSON.stringify({
              success: true,
              data: {
                resume_id: resumeId,
                version_id: versionId,
                deleted: true,
                has_file: false
              }
            }),
            { status: 200, headers }
          );
        }
      }

      // =======================================================================
      // MODULE: COVER LETTERS API
      // =======================================================================

      // --- GET /api/v1/cover-letters (List Cover Letters) ---
      if (pathname === coverLetterRootPattern && method === 'GET') {
        const { results } = await env.DB.prepare(
          `SELECT cl.id, cl.company_id, cl.title, cl.status, cl.created_at, cl.updated_at,
                  c.id AS comp_id, c.name AS comp_name
           FROM cover_letters cl
           JOIN companies c ON cl.company_id = c.id
           WHERE cl.user_id = ?
           ORDER BY cl.updated_at DESC`
        )
        .bind(userId)
        .all();

        const formattedCoverLetters = results.map(row => ({
          id: row.id,
          company_id: row.company_id,
          title: row.title,
          status: row.status,
          created_at: row.created_at,
          updated_at: row.updated_at,
          company: {
            id: row.comp_id,
            name: row.comp_name
          }
        }));

        return new Response(
          JSON.stringify({ success: true, data: { cover_letters: formattedCoverLetters } }),
          { status: 200, headers }
        );
      }

      // --- POST /api/v1/cover-letters (Create Cover Letter) ---
      if (pathname === coverLetterRootPattern && method === 'POST') {
        let body;
        try {
          body = await request.json();
        } catch (e) {
          return buildErrorResponse('INVALID_INPUT', "Request payload must be a valid JSON structure.", 400, headers);
        }

        const { company_id, title, content, status } = body;

        if (!company_id || typeof company_id !== 'string' || company_id.trim().length === 0) {
          return buildErrorResponse('INVALID_INPUT', "Field 'company_id' is a required non-empty string parameter.", 400, headers);
        }
        if (!title || typeof title !== 'string' || title.trim().length === 0) {
          return buildErrorResponse('INVALID_INPUT', "Field 'title' is a required non-empty string parameter.", 400, headers);
        }
        if (content !== undefined && typeof content !== 'string') {
          return buildErrorResponse('INVALID_INPUT', "Field 'content' must be a valid string configuration parameter.", 400, headers);
        }
        
        const finalStatus = status || 'DRAFT';
        if (status !== undefined) {
          if (finalStatus !== 'DRAFT' && finalStatus !== 'FINAL') {
            return buildErrorResponse('INVALID_INPUT', "Field 'status' must be exactly 'DRAFT' or 'FINAL'.", 400, headers);
          }
        }

        const company = await env.DB.prepare(
          `SELECT id FROM companies WHERE id = ? AND user_id = ?`
        )
        .bind(company_id, userId)
        .first();

        if (!company) {
          return buildErrorResponse('NOT_FOUND', "The targeted company context does not exist or access rights are restricted.", 404, headers);
        }

        const existingLetter = await env.DB.prepare(
          `SELECT id FROM cover_letters WHERE user_id = ? AND company_id = ?`
        )
        .bind(userId, company_id)
        .first();

        if (existingLetter) {
          return buildErrorResponse('CONFLICT', "A cover letter already exists for this company.", 409, headers);
        }

        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const finalContent = content !== undefined ? content : "";

        await env.DB.prepare(
          `INSERT INTO cover_letters (id, user_id, company_id, title, content, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(id, userId, company_id, title.trim(), finalContent, finalStatus, now, now)
        .run();

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              id,
              company_id,
              title: title.trim(),
              content: finalContent,
              status: finalStatus,
              created_at: now,
              updated_at: now
            }
          }),
          { status: 201, headers }
        );
      }

      // --- Id Level Handler for Cover Letters ---
      const clIdMatch = pathname.match(coverLetterIdRegex);
      if (clIdMatch) {
        const coverLetterId = clIdMatch[1];

        // --- GET /api/v1/cover-letters/:id (Get Cover Letter Details) ---
        if (method === 'GET') {
          const row = await env.DB.prepare(
            `SELECT cl.id, cl.company_id, cl.title, cl.content, cl.status, cl.created_at, cl.updated_at,
                    c.id AS comp_id, c.name AS comp_name
             FROM cover_letters cl
             JOIN companies c ON cl.company_id = c.id
             WHERE cl.id = ? AND cl.user_id = ?`
          )
          .bind(coverLetterId, userId)
          .first();

          if (!row) {
            return buildErrorResponse('NOT_FOUND', "The targeted cover letter does not exist or access rights are restricted.", 404, headers);
          }

          const formattedDetail = {
            id: row.id,
            company_id: row.company_id,
            title: row.title,
            content: row.content,
            status: row.status,
            created_at: row.created_at,
            updated_at: row.updated_at,
            company: {
              id: row.comp_id,
              name: row.comp_name
            }
          };

          return new Response(
            JSON.stringify({ success: true, data: formattedDetail }),
            { status: 200, headers }
          );
        }

        // --- PUT /api/v1/cover-letters/:id (Update Cover Letter Specification) ---
        if (method === 'PUT') {
          const existingRecord = await env.DB.prepare(
            `SELECT * FROM cover_letters WHERE id = ? AND user_id = ?`
          )
          .bind(coverLetterId, userId)
          .first();

          if (!existingRecord) {
            return buildErrorResponse('NOT_FOUND', "The targeted cover letter does not exist or access rights are restricted.", 404, headers);
          }

          let body;
          try {
            body = await request.json();
          } catch (e) {
            return buildErrorResponse('INVALID_INPUT', "Request payload must be a valid JSON structure.", 400, headers);
          }

          if ('title' in body) {
            if (typeof body.title !== 'string' || body.title.trim().length === 0) {
              return buildErrorResponse('INVALID_INPUT', "Field 'title' must be a non-empty string parameter.", 400, headers);
            }
          }
          if ('content' in body) {
            if (typeof body.content !== 'string') {
              return buildErrorResponse('INVALID_INPUT', "Field 'content' must be a valid string configuration parameter.", 400, headers);
            }
          }
          if ('status' in body) {
            if (body.status !== 'DRAFT' && body.status !== 'FINAL') {
              return buildErrorResponse('INVALID_INPUT', "Field 'status' must be exactly 'DRAFT' or 'FINAL'.", 400, headers);
            }
          }

          const updatedTitle = 'title' in body ? body.title.trim() : existingRecord.title;
          const updatedContent = 'content' in body ? body.content : existingRecord.content;
          const updatedStatus = 'status' in body ? body.status : existingRecord.status;
          const now = new Date().toISOString();

          await env.DB.prepare(
            `UPDATE cover_letters
             SET title = ?, content = ?, status = ?, updated_at = ?
             WHERE id = ? AND user_id = ?`
          )
          .bind(updatedTitle, updatedContent, updatedStatus, now, coverLetterId, userId)
          .run();

          return new Response(
            JSON.stringify({
              success: true,
              data: {
                id: coverLetterId,
                company_id: existingRecord.company_id,
                title: updatedTitle,
                content: updatedContent,
                status: updatedStatus,
                created_at: existingRecord.created_at,
                updated_at: now
              }
            }),
            { status: 200, headers }
          );
        }

        // --- DELETE /api/v1/cover-letters/:id (Delete Cover Letter Specifications) ---
        if (method === 'DELETE') {
          const existing = await env.DB.prepare(
            `SELECT id FROM cover_letters WHERE id = ? AND user_id = ?`
          )
          .bind(coverLetterId, userId)
          .first();

          if (!existing) {
            return buildErrorResponse('NOT_FOUND', "The targeted cover letter does not exist or access rights are restricted.", 404, headers);
          }

          await env.DB.prepare(`DELETE FROM cover_letters WHERE id = ? AND user_id = ?`)
            .bind(coverLetterId, userId)
            .run();

          return new Response(
            JSON.stringify({ success: true, data: { id: coverLetterId, deleted: true } }),
            { status: 200, headers }
          );
        }
      }

      // =======================================================================
      // MODULE: INTERVIEWS API
      // =======================================================================
      
      // --- PATCH /api/v1/interviews/:id/status (Update Interview Status) ---
      const intStatusMatch = pathname.match(interviewStatusRegex);
      if (intStatusMatch && method === 'PATCH') {
        const interviewId = intStatusMatch[1];
        
        let body;
        try {
          body = await request.json();
        } catch (e) {
          return buildErrorResponse('INVALID_INPUT', "Request payload must be a valid JSON structure.", 400, headers);
        }

        const { status } = body;
        const allowedStatuses = ['SCHEDULED', 'COMPLETED', 'CANCELLED'];
        
        if (!status || !allowedStatuses.includes(status)) {
          return buildErrorResponse('INVALID_INPUT', `Invalid status value provided. Allowed values: ${allowedStatuses.join(', ')}`, 400, headers);
        }

        // Deep visibility and access alignment check via opportunities ownership
        const interviewCheck = await env.DB.prepare(
          `SELECT i.id FROM interviews i
           JOIN opportunities o ON i.opportunity_id = o.id
           WHERE i.id = ? AND o.user_id = ?`
        )
        .bind(interviewId, userId)
        .first();

        if (!interviewCheck) {
          return buildErrorResponse('NOT_FOUND', "The targeted interview does not exist or access rights are restricted.", 404, headers);
        }

        await env.DB.prepare(
          `UPDATE interviews SET status = ? WHERE id = ?`
        )
        .bind(status, interviewId)
        .run();

        return new Response(
          JSON.stringify({ success: true, data: { id: interviewId, status } }),
          { status: 200, headers }
        );
      }

      // --- ADDITIVE NEW ENDPOINT: GET /api/v1/interviews (Global List) ---
      if (pathname === interviewsGlobalPattern && method === 'GET') {
        const { results } = await env.DB.prepare(
          `SELECT 
             i.id, i.opportunity_id, i.round_number, i.round_title, i.status, i.interview_date, i.interviewer_names, i.created_at,
             o.id AS opp_id, o.job_title AS opp_job_title, o.status AS opp_status,
             c.id AS comp_id, c.name AS comp_name
           FROM interviews i
           JOIN opportunities o ON i.opportunity_id = o.id
           LEFT JOIN companies c ON o.company_id = c.id
           WHERE o.user_id = ?
           ORDER BY i.interview_date ASC`
        )
        .bind(userId)
        .all();

        const formattedInterviews = results.map(row => ({
          id: row.id,
          opportunity_id: row.opportunity_id,
          round_number: row.round_number,
          round_title: row.round_title,
          status: row.status,
          interview_date: row.interview_date,
          interviewer_names: row.interviewer_names,
          created_at: row.created_at,
          opportunity: {
            id: row.opp_id,
            job_title: row.opp_job_title,
            status: row.opp_status
          },
          company: row.comp_id ? {
            id: row.comp_id,
            name: row.comp_name
          } : null
        }));

        return new Response(
          JSON.stringify({ success: true, data: { interviews: formattedInterviews } }),
          { status: 200, headers }
        );
      }

      // --- ADDITIVE NEW ENDPOINT: GET /api/v1/interviews/:id (Detail Block) ---
      const intIdGetMatch = pathname.match(interviewIdRegex);
      if (intIdGetMatch && !pathname.includes('/status') && method === 'GET') {
        const interviewId = intIdGetMatch[1];

        const row = await env.DB.prepare(
          `SELECT 
             i.id, i.opportunity_id, i.round_number, i.round_title, i.status, i.interview_date, i.interviewer_names, 
             i.preparation_notes, i.questions_asked, i.feedback_notes, i.created_at,
             o.id AS opp_id, o.job_title AS opp_job_title, o.status AS opp_status,
             c.id AS comp_id, c.name AS comp_name
           FROM interviews i
           JOIN opportunities o ON i.opportunity_id = o.id
           LEFT JOIN companies c ON o.company_id = c.id
           WHERE i.id = ? AND o.user_id = ?`
        )
        .bind(interviewId, userId)
        .first();

        if (!row) {
          return buildErrorResponse('NOT_FOUND', "The targeted interview does not exist or access rights are restricted.", 404, headers);
        }

        const formattedDetail = {
          id: row.id,
          opportunity_id: row.opportunity_id,
          round_number: row.round_number,
          round_title: row.round_title,
          status: row.status,
          interview_date: row.interview_date,
          interviewer_names: row.interviewer_names,
          preparation_notes: row.preparation_notes,
          questions_asked: row.questions_asked,
          feedback_notes: row.feedback_notes,
          created_at: row.created_at,
          opportunity: {
            id: row.opp_id,
            job_title: row.opp_job_title,
            status: row.opp_status
          },
          company: row.comp_id ? {
            id: row.comp_id,
            name: row.comp_name
          } : null
        };

        return new Response(
          JSON.stringify({ success: true, data: formattedDetail }),
          { status: 200, headers }
        );
      }

      // --- ADDITIVE NEW ENDPOINT: PUT /api/v1/interviews/:id (Update Specification) ---
      const intIdPutMatch = pathname.match(interviewIdRegex);
      if (intIdPutMatch && !pathname.includes('/status') && method === 'PUT') {
        const interviewId = intIdPutMatch[1];

        const existingRecord = await env.DB.prepare(
          `SELECT i.* FROM interviews i
           JOIN opportunities o ON i.opportunity_id = o.id
           WHERE i.id = ? AND o.user_id = ?`
        )
        .bind(interviewId, userId)
        .first();

        if (!existingRecord) {
          return buildErrorResponse('NOT_FOUND', "The targeted interview does not exist or access rights are restricted.", 404, headers);
        }

        let body;
        try {
          body = await request.json();
        } catch (e) {
          return buildErrorResponse('INVALID_INPUT', "Request payload must be a valid JSON structure.", 400, headers);
        }

        if ('round_number' in body) {
          if (typeof body.round_number !== 'number' || !Number.isInteger(body.round_number)) {
            return buildErrorResponse('INVALID_INPUT', "Field 'round_number' must be a valid integer number.", 400, headers);
          }
        }
        if ('round_title' in body) {
          if (typeof body.round_title !== 'string' || body.round_title.trim().length === 0) {
            return buildErrorResponse('INVALID_INPUT', "Field 'round_title' must be a non-empty string parameter.", 400, headers);
          }
        }
        if ('status' in body) {
          const allowedStatuses = ['SCHEDULED', 'COMPLETED', 'CANCELLED'];
          if (!allowedStatuses.includes(body.status)) {
            return buildErrorResponse('INVALID_INPUT', `Invalid status value provided. Allowed values: ${allowedStatuses.join(', ')}`, 400, headers);
          }
        }
        if ('interview_date' in body) {
          if (typeof body.interview_date !== 'string' || body.interview_date.trim().length === 0) {
            return buildErrorResponse('INVALID_INPUT', "Field 'interview_date' must be a non-empty string parameter.", 400, headers);
          }
        }
        if ('interviewer_names' in body && body.interviewer_names !== null) {
          if (typeof body.interviewer_names !== 'string') {
            return buildErrorResponse('INVALID_INPUT', "Field 'interviewer_names' must be a string parameter.", 400, headers);
          }
        }
        if ('preparation_notes' in body && body.preparation_notes !== null) {
          if (typeof body.preparation_notes !== 'string') {
            return buildErrorResponse('INVALID_INPUT', "Field 'preparation_notes' must be a string parameter.", 400, headers);
          }
        }
        if ('questions_asked' in body && body.questions_asked !== null) {
          if (typeof body.questions_asked !== 'string') {
            return buildErrorResponse('INVALID_INPUT', "Field 'questions_asked' must be a string parameter.", 400, headers);
          }
        }
        if ('feedback_notes' in body && body.feedback_notes !== null) {
          if (typeof body.feedback_notes !== 'string') {
            return buildErrorResponse('INVALID_INPUT', "Field 'feedback_notes' must be a string parameter.", 400, headers);
          }
        }

        const updatedRoundNumber = 'round_number' in body ? body.round_number : existingRecord.round_number;
        const updatedRoundTitle = 'round_title' in body ? body.round_title.trim() : existingRecord.round_title;
        const updated_status = 'status' in body ? body.status : existingRecord.status;
        const updatedInterviewDate = 'interview_date' in body ? body.interview_date.trim() : existingRecord.interview_date;
        
        const updatedInterviewerNames = 'interviewer_names' in body 
          ? (body.interviewer_names && body.interviewer_names.trim().length > 0 ? body.interviewer_names.trim() : null)
          : existingRecord.interviewer_names;

        const updatedPrepNotes = 'preparation_notes' in body 
          ? (body.preparation_notes && body.preparation_notes.trim().length > 0 ? body.preparation_notes.trim() : null)
          : existingRecord.preparation_notes;

        const updatedQuestions = 'questions_asked' in body 
          ? (body.questions_asked && body.questions_asked.trim().length > 0 ? body.questions_asked.trim() : null)
          : existingRecord.questions_asked;

        const updatedFeedback = 'feedback_notes' in body 
          ? (body.feedback_notes && body.feedback_notes.trim().length > 0 ? body.feedback_notes.trim() : null)
          : existingRecord.feedback_notes;

        await env.DB.prepare(
          `UPDATE interviews 
           SET round_number = ?, round_title = ?, status = ?, interview_date = ?, interviewer_names = ?, 
               preparation_notes = ?, questions_asked = ?, feedback_notes = ?
           WHERE id = ?`
        )
        .bind(
          updatedRoundNumber, updatedRoundTitle, updated_status, updatedInterviewDate, updatedInterviewerNames,
          updatedPrepNotes, updatedQuestions, updatedFeedback, interviewId
        )
        .run();

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              id: interviewId,
              opportunity_id: existingRecord.opportunity_id,
              dot_round_number: updatedRoundNumber,
              round_title: updatedRoundTitle,
              status: updated_status,
              interview_date: updatedInterviewDate,
              interviewer_names: updatedInterviewerNames || "",
              preparation_notes: updatedPrepNotes || "",
              questions_asked: updatedQuestions || null,
              feedback_notes: updatedFeedback || null,
              created_at: existingRecord.created_at
            }
          }),
          { status: 200, headers }
        );
      }

      // --- Collection Level Handler for Opportunity Contextual Interviews ---
      const interviewsMatch = pathname.match(interviewsRootRegex);
      if (interviewsMatch) {
        const opportunityId = interviewsMatch[1];

        // Access validation: Check opportunity visibility and ownership scope
        const opportunity = await env.DB.prepare(
          `SELECT id FROM opportunities WHERE id = ? AND user_id = ?`
        )
        .bind(opportunityId, userId)
        .first();

        if (!opportunity) {
          return buildErrorResponse('NOT_FOUND', "The targeted resource does not exist or access rights are restricted.", 404, headers);
        }

        // --- POST /api/v1/opportunities/:id/interviews (Create Interview) ---
        if (method === 'POST') {
          let body;
          try {
            body = await request.json();
          } catch (e) {
            return buildErrorResponse('INVALID_INPUT', "Request payload must be a valid JSON structure.", 400, headers);
          }

          const { 
            round_number, round_title, status, interview_date, 
            interviewer_names, preparation_notes, questions_asked, feedback_notes 
          } = body;

          // Structural field check rules
          if (round_number === undefined || typeof round_number !== 'number' || !Number.isInteger(round_number)) {
            return buildErrorResponse('INVALID_INPUT', "Field 'round_number' is a required integer.", 400, headers);
          }
          if (!round_title || typeof round_title !== 'string' || round_title.trim().length === 0) {
            return buildErrorResponse('INVALID_INPUT', "Field 'round_title' is a required non-empty string parameter.", 400, headers);
          }
          if (!interview_date || typeof interview_date !== 'string' || interview_date.trim().length === 0) {
            return buildErrorResponse('INVALID_INPUT', "Field 'interview_date' is a required string configuration parameter.", 400, headers);
          }

          // Validate status lifecycle states
          const finalStatus = status || 'SCHEDULED';
          const allowedStatuses = ['SCHEDULED', 'COMPLETED', 'CANCELLED'];
          if (!allowedStatuses.includes(finalStatus)) {
            return buildErrorResponse('INVALID_INPUT', `Invalid status value provided. Allowed values: ${allowedStatuses.join(', ')}`, 400, headers);
          }

          const id = crypto.randomUUID();
          const now = new Date().toISOString();

          await env.DB.prepare(
            `INSERT INTO interviews (
              id, opportunity_id, round_number, round_title, status, interview_date, 
              interviewer_names, preparation_notes, questions_asked, feedback_notes, created_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            id, opportunityId, round_number, round_title.trim(), finalStatus, interview_date.trim(),
            interviewer_names ? interviewer_names.trim() : null,
            preparation_notes ? preparation_notes.trim() : null,
            questions_asked ? questions_asked.trim() : null,
            feedback_notes ? feedback_notes.trim() : null,
            now
          )
          .run();

          return new Response(
            JSON.stringify({
              success: true,
              data: {
                id,
                opportunity_id: opportunityId,
                round_number,
                round_title: round_title.trim(),
                status: finalStatus,
                interview_date: interview_date.trim(),
                interviewer_names: interviewer_names ? interviewer_names.trim() : "",
                preparation_notes: preparation_notes ? preparation_notes.trim() : "",
                questions_asked: questions_asked ? questions_asked.trim() : null,
                feedback_notes: feedback_notes ? feedback_notes.trim() : null,
                created_at: now
              }
            }),
            { status: 201, headers }
          );
        }

        // --- GET /api/v1/opportunities/:id/interviews (List Interviews) ---
        if (method === 'GET') {
          const { results } = await env.DB.prepare(
            `SELECT id, round_number, round_title, status, interview_date, interviewer_names
             FROM interviews
             WHERE opportunity_id = ?
             ORDER BY round_number ASC`
          )
          .bind(opportunityId)
          .all();

          // Standardize response text mutations safely
          const localizedInterviews = results.map(row => ({
            id: row.id,
            round_number: row.round_number,
            round_title: row.round_title,
            status: row.status,
            interview_date: row.interview_date,
            interviewer_names: row.interviewer_names || ""
          }));

          return new Response(
            JSON.stringify({ success: true, data: { interviews: localizedInterviews } }),
            { status: 200, headers }
          );
        }
      }

      // =======================================================================
      // MODULE: ATS ANALYSIS API
      // =======================================================================
      const atsMatch = pathname.match(atsAnalysisRegex);
      if (atsMatch) {
        const opportunityId = atsMatch[1];

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

          const { resume_version_id, match_score, missing_keywords, skill_gaps, improvement_suggestions = body } = body;

          if (!resume_version_id || typeof resume_version_id !== 'string') {
            return buildErrorResponse('INVALID_INPUT', "Field 'resume_version_id' is a required string parameter.", 400, headers);
          }

          if (match_score === undefined || typeof match_score !== 'number' || !Number.isInteger(match_score) || match_score < 0 || match_score > 100) {
            return buildErrorResponse('INVALID_INPUT', "Field 'match_score' is required and must be an integer between 0 and 100.", 400, headers);
          }

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
      if (oppIdMatch && !pathname.includes('/status') && !pathname.includes('/job-description') && !pathname.includes('/ats-analysis') && !pathname.includes('/interviews') && method === 'GET') {
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
          if (resumeVersion) {
            resumeVersion.has_file = Boolean(resumeVersion.r2_object_key);
            delete resumeVersion.r2_object_key;
          }
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

        // Updated Integration Module mapping for upcoming/past interviews
        const { results: rawInterviews } = await env.DB.prepare(
          `SELECT id, round_number, round_title, status, interview_date, interviewer_names
           FROM interviews 
           WHERE opportunity_id = ? 
           ORDER BY round_number ASC`
        )
        .bind(opportunityId)
        .all();

        const interviews = rawInterviews.map(row => ({
          id: row.id,
          round_number: row.round_number,
          round_title: row.round_title,
          status: row.status,
          interview_date: row.interview_date,
          interviewer_names: row.interviewer_names || ""
        }));

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
          interviews
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

          const { version_label, target_role } = body;
          if (!version_label || typeof version_label !== 'string' || version_label.trim().length === 0) {
            return buildErrorResponse('INVALID_INPUT', "Field 'version_label' is a required non-empty string.", 400, headers);
          }

          const id = crypto.randomUUID();
          const now = new Date().toISOString();
          const isActive = 1;

          await env.DB.prepare(
            `INSERT INTO resume_versions (id, resume_id, version_label, target_role, r2_object_key, is_active, created_at, ai_context)
             VALUES (?, ?, ?, ?, NULL, ?, ?, NULL)`
          )
          .bind(id, resumeId, version_label.trim(), target_role ? target_role.trim() : null, isActive, now)
          .run();

          return new Response(
            JSON.stringify({
              success: true,
              data: { id, resume_id: resumeId, version_label: version_label.trim(), target_role: target_role ? target_role.trim() : null, r2_object_key: null, is_active: isActive, created_at: now, has_ai_context: false }
            }),
            { status: 201, headers }
          );
        }

        if (method === 'GET') {
          const { results } = await env.DB.prepare(
            `SELECT id, resume_id, version_label, target_role, r2_object_key, is_active, created_at, ai_context
             FROM resume_versions
             WHERE resume_id = ?
             ORDER BY created_at DESC`
          )
          .bind(resumeId)
          .all();

          const formattedVersions = results.map(row => {
            const hasFile = Boolean(row.r2_object_key);
            const hasAiContext = Boolean(row.ai_context && row.ai_context.trim().length > 0);
            return {
              id: row.id,
              resume_id: row.resume_id,
              version_label: row.version_label,
              target_role: row.target_role,
              is_active: row.is_active,
              created_at: row.created_at,
              has_file: hasFile,
              has_ai_context: hasAiContext
            };
          });

          return new Response(
            JSON.stringify({ success: true, data: { versions: formattedVersions } }),
            { status: 200, headers }
          );
        }
      }

      const versionIdMatch = pathname.match(versionIdRegex);
      if (versionIdMatch && !pathname.endsWith('/file')) {
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

        // --- PUT /api/v1/resumes/:resumeId/versions/:versionId (Edit Version Metadata Block) ---
        if (method === 'PUT') {
          let body;
          try {
            body = await request.json();
          } catch (e) {
            return buildErrorResponse('INVALID_INPUT', "Request payload must be a valid JSON structure.", 400, headers);
          }

          if (!body || (!('version_label' in body) && !('target_role' in body) && !('ai_context' in body))) {
            return buildErrorResponse('INVALID_INPUT', "At least one editable metadata parameter string must be provided.", 400, headers);
          }

          const existingVersion = await env.DB.prepare(
            `SELECT * FROM resume_versions WHERE id = ? AND resume_id = ?`
          )
          .bind(versionId, resumeId)
          .first();

          if (!existingVersion) {
            return buildErrorResponse('NOT_FOUND', "The targeted version tracking record could not be found under this configuration context.", 404, headers);
          }

          let updatedLabel = existingVersion.version_label;
          if ('version_label' in body) {
            if (typeof body.version_label !== 'string') {
              return buildErrorResponse('INVALID_INPUT', "Field 'version_label' must be a valid string configuration property.", 400, headers);
            }
            const trimmedLabel = body.version_label.trim();
            if (trimmedLabel.length === 0) {
              return buildErrorResponse('INVALID_INPUT', "Field 'version_label' cannot be empty when provided.", 400, headers);
            }
            updatedLabel = trimmedLabel;
          }

          let updatedRole = existingVersion.target_role;
          if ('target_role' in body) {
            if (body.target_role === null) {
              updatedRole = null;
            } else if (typeof body.target_role !== 'string') {
              return buildErrorResponse('INVALID_INPUT', "Field 'target_role' must be a string or explicit null value parameter.", 400, headers);
            } else {
              const trimmedRole = body.target_role.trim();
              updatedRole = trimmedRole.length === 0 ? null : trimmedRole;
            }
          }

          let updatedAiContext = existingVersion.ai_context;
          if ('ai_context' in body) {
            if (body.ai_context === null) {
              updatedAiContext = null;
            } else if (typeof body.ai_context !== 'string') {
              return buildErrorResponse('INVALID_INPUT', "Field 'ai_context' must be a string or explicit null value parameter.", 400, headers);
            } else {
              const trimmedCtx = body.ai_context.trim();
              if (trimmedCtx.length > 100000) {
                return buildErrorResponse('INVALID_INPUT', "AI Context must not exceed 100,000 characters.", 400, headers);
              }
              updatedAiContext = trimmedCtx.length === 0 ? null : trimmedCtx;
            }
          }

          await env.DB.prepare(
            `UPDATE resume_versions
             SET version_label = ?, target_role = ?, ai_context = ?
             WHERE id = ? AND resume_id = ?`
          )
          .bind(updatedLabel, updatedRole, updatedAiContext, versionId, resumeId)
          .run();

          const hasAiContext = Boolean(updatedAiContext && updatedAiContext.length > 0);

          return new Response(
            JSON.stringify({
              success: true,
              data: {
                id: versionId,
                resume_id: resumeId,
                version_label: updatedLabel,
                target_role: updatedRole,
                is_active: existingVersion.is_active,
                created_at: existingVersion.created_at,
                has_file: Boolean(existingVersion.r2_object_key),
                has_ai_context: hasAiContext
              }
            }),
            { status: 200, headers }
          );
        }

        // --- GET /api/v1/resumes/:resumeId/versions/:versionId (Get Version Detail Block) ---
        if (method === 'GET') {
          const version = await env.DB.prepare(
            `SELECT id, resume_id, version_label, target_role, r2_object_key, is_active, created_at, ai_context
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
          version.has_file = Boolean(version.r2_object_key);
          delete version.r2_object_key;

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
            `SELECT id, version_label, target_role, r2_object_key, is_active, created_at, ai_context
             FROM resume_versions 
             WHERE resume_id = ? 
             ORDER BY created_at DESC`
          )
          .bind(resumeId)
          .all();

          resume.versions = versions.map(v => {
            const hasFile = Boolean(v.r2_object_key);
            const hasAiContext = Boolean(v.ai_context && v.ai_context.trim().length > 0);
            return {
              id: v.id,
              version_label: v.version_label,
              target_role: v.target_role,
              is_active: v.is_active,
              created_at: v.created_at,
              has_file: hasFile,
              has_ai_context: hasAiContext
            };
          });

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