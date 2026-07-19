// =============================================================================
// File: resume-manager/src/index.js
// Approved Phase: Stage 1 — Task 1.6C Correction (Company Schema Alignment)
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
      // 4. RESTful Route Routing Pipeline: Resumes, Versions, & Companies
      // -------------------------------------------------------------------------
      
      // Route Base Match Patterns
      const resumeRootPattern = '/api/v1/resumes';
      const companyRootPattern = '/api/v1/companies';
      const resumeIdRegex = /^\/api\/v1\/resumes\/([^\/]+)$/;
      const versionsRootRegex = /^\/api\/v1\/resumes\/([^\/]+)\/versions$/;
      const versionIdRegex = /^\/api\/v1\/resumes\/([^\/]+)\/versions\/([^\/]+)$/;

      // --- POST /api/v1/companies (Create Company Target) ---
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

        // Execution aligned with schema constraints: removed updated_at property trace
        await env.DB.prepare(
          `INSERT INTO companies (id, user_id, name, website, location, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          id, 
          userId, 
          name.trim(), 
          website ? website.trim() : null, 
          location ? location.trim() : null, 
          notes ? notes.trim() : null, 
          now
        )
        .run();

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              id,
              name: name.trim(),
              website: website ? website.trim() : null,
              location: location ? location.trim() : null,
              notes: notes ? notes.trim() : null,
              created_at: now
            }
          }),
          { status: 201, headers }
        );
      }

      // --- GET /api/v1/companies (List Tracked Companies) ---
      if (pathname === companyRootPattern && method === 'GET') {
        // Selection criteria aligned with schema limits: removed updated_at tracking column
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

      // --- POST /api/v1/resumes (Create Resume) ---
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

      // --- GET /api/v1/resumes (List Resumes) ---
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

      // --- Resume Version Collection Routes (POST / GET list) ---
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

        // --- POST /api/v1/resumes/:resume_id/versions (Create Resume Version) ---
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
              data: {
                id,
                resume_id: resumeId,
                version_label: version_label.trim(),
                target_role: target_role ? target_role.trim() : null,
                r2_object_key: r2_object_key ? r2_object_key.trim() : null,
                is_active: isActive,
                created_at: now
              }
            }),
            { status: 201, headers }
          );
        }

        // --- GET /api/v1/resumes/:resume_id/versions (List Resume Versions) ---
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

      // --- Individual Resume Version Detail Route ---
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

        // --- GET /api/v1/resumes/:resume_id/versions/:id (Get Resume Version Details) ---
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

      // --- ID-Targeted Parametric Routes (Core Resumes) ---
      const idMatch = pathname.match(resumeIdRegex);
      if (idMatch && !pathname.includes('/versions')) {
        const resumeId = idMatch[1];

        // --- GET /api/v1/resumes/:id (Get Resume Details) ---
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
            JSON.stringify({ success: true, data: resume }),
            { status: 200, headers }
          );
        }

        // --- PUT /api/v1/resumes/:id (Update Resume) ---
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

        // --- DELETE /api/v1/resumes/:id (Delete Resume) ---
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