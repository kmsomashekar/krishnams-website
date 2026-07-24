import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import RecentActivity from '../components/RecentActivity';

const BASE_URL = '';

// Helper to get UTC-safe period boundary start/end date strings (YYYY-MM-DD)
function getPeriodBounds(period) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();

  const pad = (n) => String(n).padStart(2, '0');
  const formatDate = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

  switch (period) {
  case 'this_week': {
  const today = new Date(Date.UTC(year, month, day));

  // Monday as the start of the week
  const dayOfWeek = today.getUTCDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const start = new Date(today);
  start.setUTCDate(today.getUTCDate() - daysSinceMonday);

  return { start: formatDate(start), end: formatDate(today) };
}
    case 'last_month': {
      const start = new Date(Date.UTC(year, month - 1, 1));
      const end = new Date(Date.UTC(year, month, 0));
      return { start: formatDate(start), end: formatDate(end) };
    }
    case 'last_30': {
      const end = new Date(Date.UTC(year, month, day));
      const start = new Date(Date.UTC(year, month, day));
      start.setUTCDate(start.getUTCDate() - 29);
      return { start: formatDate(start), end: formatDate(end) };
    }
    case 'last_90': {
      const end = new Date(Date.UTC(year, month, day));
      const start = new Date(Date.UTC(year, month, day));
      start.setUTCDate(start.getUTCDate() - 89);
      return { start: formatDate(start), end: formatDate(end) };
    }
    case 'this_month':
    default: {
      const start = new Date(Date.UTC(year, month, 1));
      const end = new Date(Date.UTC(year, month, day));
      return { start: formatDate(start), end: formatDate(end) };
    }
  }
}

function isDateInRange(dateStr, startStr, endStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const clean = dateStr.split('T')[0];
  return clean >= startStr && clean <= endStr;
}

// Fetch the main list of opportunities
async function fetchOpportunities() {
  const res = await fetch(`${BASE_URL}/api/v1/opportunities`);
  if (!res.ok) {
    throw new Error('Network response was not ok');
  }
  const body = await res.json();
  if (!body?.success) {
    throw new Error(body?.message || 'Failed to load opportunities');
  }
  return body?.data || { opportunities: [] };
}

// Fetch details for a specific opportunity
async function fetchOpportunityDetail(id) {
  const res = await fetch(`${BASE_URL}/api/v1/opportunities/${id}`);
  if (!res.ok) {
    throw new Error(`HTTP error status: ${res.status}`);
  }
  const body = await res.json();
  // Validate both HTTP status and API success flag
  if (!body?.success) {
    throw new Error(body?.message || `Failed to validate opportunity detail for ID: ${id}`);
  }
  return body?.data || null;
}

// Fetch outreach summary based on selected period
async function fetchOutreachSummary(period) {
  const res = await fetch(`${BASE_URL}/api/v1/outreach/summary?period=${encodeURIComponent(period)}`);
  if (!res.ok) {
    throw new Error('Failed to load outreach summary');
  }
  const body = await res.json();
  if (!body?.success) {
    throw new Error(body?.error?.message || 'Failed to load outreach summary');
  }
  return body?.data || { total_people_contacted: 0, breakdown: {}, period_label: 'This month' };
}

// Fetch recent dashboard activity
async function fetchDashboardActivity() {
  const res = await fetch(`${BASE_URL}/api/v1/dashboard/activity`, {
    credentials: 'include'
  });

  if (!res.ok) {
    throw new Error('Failed to fetch dashboard activity');
  }

  return res.json();
}
export default function Dashboard() {
  const [period, setPeriod] = useState('this_month');

  // 1. Fetch main opportunities index
  const {
  data: opportunityData,
  isLoading: isListLoading,
  isError: isListError,
  error: listError
} = useQuery({
  queryKey: ['opportunities'],
  queryFn: fetchOpportunities
});

const opportunities = Array.isArray(opportunityData?.opportunities)
  ? opportunityData.opportunities
  : [];

  // Fetch outreach summary metrics scoped by period
  const {
    data: outreachSummary = { total_people_contacted: 0, breakdown: {}, period_label: 'This month' },
    isLoading: isOutreachLoading
  } = useQuery({
    queryKey: ['outreach-summary', period],
    queryFn: () => fetchOutreachSummary(period)
  });

  // Fetch recent dashboard activity
const {
  data: activityData = { activities: [] },
  isLoading: isActivityLoading
} = useQuery({
  queryKey: ['dashboard-activity'],
  queryFn: fetchDashboardActivity
});

  // Extract stable array of IDs for the details query key
  const opportunityIds = opportunities.map(o => o.id);

  // 2. Fetch details for all loaded opportunities in parallel
  const {
    data: detailData = [],
    isLoading: isDetailsLoading
  } = useQuery({
    queryKey: ['opportunity-details', opportunityIds],
    queryFn: async () => {
      if (!opportunityIds.length) return [];
      const promises = opportunityIds.map(async (id) => {
        try {
          return await fetchOpportunityDetail(id);
        } catch (err) {
          // Gracefully handle individual detail failures so the dashboard doesn't crash
          console.error(`Failed to load detail for opportunity ${id}:`, err);
          return null;
        }
      });
      return Promise.all(promises);
    },
    enabled: opportunityIds.length > 0
  });

  // Map detail responses by ID for easy lookup
  const detailsMap = new Map();
  detailData.forEach(detail => {
    if (detail?.id) {
      detailsMap.set(detail.id, detail);
    }
  });

  // --- LOADING STATE ---
  if (isListLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[400px] space-y-3">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 text-sm font-medium">Loading dashboard...</p>
      </div>
    );
  }

  // --- ERROR STATE ---
  if (isListError) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-lg shadow-sm">
        <h3 className="text-base font-semibold mb-1">Unable to load dashboard</h3>
        <p className="text-sm opacity-90">{listError?.message || 'An error occurred while loading your opportunities.'}</p>
      </div>
    );
  }

  // --- CALCULATE PERIOD BOUNDS FOR FILTERING ---
  const bounds = period !== 'all_time' ? getPeriodBounds(period) : null;

  // --- CALCULATE METRICS ---
  const totalOpportunities = opportunities.length;

  // Jobs Applied filtering logic:
  // - For All Time: count all opportunities with status === 'APPLIED', even if date_applied is null.
  // - For period options: count only opportunities with status === 'APPLIED' AND a valid date_applied within the selected period.
  const totalApplications = opportunities.filter(item => {
    if (item.status !== 'APPLIED') return false;
    if (period === 'all_time') return true;
    return item.date_applied && bounds && isDateInRange(item.date_applied, bounds.start, bounds.end);
  }).length;

  let totalInterviews = 0;
  let atsScoreSum = 0;
  let atsScoreCount = 0;
  const allInterviews = [];

  opportunities.forEach(item => {
    const detail = detailsMap.get(item.id);
    if (!detail) return;

    if (Array.isArray(detail.interviews)) {
      detail.interviews.forEach(interview => {
        // Add all interviews to allInterviews regardless of period (for Upcoming Interviews sidebar)
        allInterviews.push({
          ...interview,
          companyName: detail.company?.name || item.company_name || 'Unknown Company',
          jobTitle: detail.job_title || item.job_title || 'Untitled Position'
        });

        // Increment totalInterviews KPI based on period filtering
        if (period === 'all_time') {
          totalInterviews += 1;
        } else {
          if (interview.interview_date && bounds && isDateInRange(interview.interview_date, bounds.start, bounds.end)) {
            totalInterviews += 1;
          }
        }
      });
    }

    const atsScore = detail.ats_analysis?.match_score;
    if (typeof atsScore === 'number') {
      atsScoreSum += atsScore;
      atsScoreCount += 1;
    }
  });

  const averageAtsMatch = atsScoreCount > 0 
    ? `${Math.round(atsScoreSum / atsScoreCount)}%` 
    : '—';

  // --- FILTER & SORT INTERVIEWS ---
  const now = new Date();
  const upcomingInterviews = allInterviews
    .filter(iv => iv.interview_date && new Date(iv.interview_date) >= now)
    .sort((a, b) => new Date(a.interview_date) - new Date(b.interview_date));

  // --- SORT RECENT OPPORTUNITIES ---
  const recentOpportunities = [...opportunities]
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Header with Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Overview of your job search activity</p>
        </div>
        <div className="flex items-center space-x-2">
          <label htmlFor="period-select" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Period:
          </label>
          <select
            id="period-select"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 font-medium"
          >
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="last_30">Last 30 Days</option>
            <option value="last_90">Last 90 Days</option>
            <option value="all_time">All Time</option>
          </select>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
        <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm">
          <div className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Total Opportunities</div>
          <div className="text-3xl font-bold text-slate-900 mt-2">{totalOpportunities}</div>
        </div>
        <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm">
          <div className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Jobs Applied</div>
          <div className="text-3xl font-bold text-slate-900 mt-2">{totalApplications}</div>
        </div>
        <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm">
          <div className="text-xs font-semibold tracking-wider text-slate-400 uppercase">People Contacted</div>
          <div className="text-3xl font-bold text-slate-900 mt-2">
            {isOutreachLoading ? <span className="text-slate-300 text-2xl animate-pulse">...</span> : outreachSummary.total_people_contacted}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">{outreachSummary.period_label}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
            <span>LinkedIn: {outreachSummary.breakdown?.LINKEDIN || 0}</span>
            <span>WhatsApp: {outreachSummary.breakdown?.WHATSAPP || 0}</span>
            <span>Email: {outreachSummary.breakdown?.EMAIL || 0}</span>
            <span>Phone: {outreachSummary.breakdown?.PHONE || 0}</span>
            <span>Referral: {outreachSummary.breakdown?.REFERRAL || 0}</span>
            <span>Other: {outreachSummary.breakdown?.OTHER || 0}</span>
          </div>
        </div>
        <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm">
          <div className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Interviews</div>
          <div className="text-3xl font-bold text-slate-900 mt-2">
            {isDetailsLoading ? <span className="text-slate-300 text-2xl animate-pulse">...</span> : totalInterviews}
          </div>
        </div>
        <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm">
          <div className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Average ATS Match</div>
          <div className="text-3xl font-bold text-slate-900 mt-2">
            {isDetailsLoading ? <span className="text-slate-300 text-2xl animate-pulse">...</span> : averageAtsMatch}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-6">
        <RecentActivity
          activities={activityData.data?.activities || []}
          isLoading={isActivityLoading}
        />
      </div>

      {/* Empty State for Entire Dashboard */}
      {totalOpportunities === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center shadow-sm">
          <h3 className="text-lg font-medium text-slate-900">No opportunities yet</h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto mt-2">
            Add an opportunity to start tracking your job search activity.
          </p>
          <div className="mt-6">
            <Link to="/opportunities" className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-500 shadow-sm transition-colors">
              Go to Opportunities
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Recent Opportunities Table */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Recent Opportunities</h2>
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                      <th className="py-3.5 px-4 md:px-6">Company &amp; Role</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-center">ATS Score</th>
                      <th className="py-3.5 px-4 text-center">Interviews</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {recentOpportunities.map((op) => {
                      const detail = detailsMap.get(op.id);
                      const score = detail?.ats_analysis?.match_score;
                      const interviewCount = detail?.interviews?.length || 0;

                      return (
                        <tr key={op.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-4 md:px-6">
                            <Link to={`/opportunities/${op.id}`} className="block group">
                              <span className="font-semibold text-indigo-600 group-hover:underline block">
                                {op.company_name}
                              </span>
                              <span className="text-slate-500 text-xs mt-0.5 block">
                                {op.job_title}
                              </span>
                            </Link>
                          </td>
                          <td className="py-4 px-4">
                            <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700 capitalize">
                              {(op.status || '').toLowerCase()}
                            </span>
                          </td>
                           <td className="py-4 px-4 text-center">
                            {isDetailsLoading ? (
                              <span className="text-slate-300 animate-pulse text-xs">...</span>
                            ) : typeof score === 'number' ? (
                              <span className={`font-semibold ${score >= 75 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {score}%
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center text-slate-600 font-medium">
                            {isDetailsLoading ? (
                              <span className="text-slate-300 animate-pulse text-xs">...</span>
                            ) : interviewCount > 0 ? (
                              <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs font-semibold">
                                {interviewCount}
                              </span>
                            ) : (
                              <span className="text-slate-300">0</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Upcoming Interviews Sidebar */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Upcoming Interviews</h2>
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5 min-h-[200px]">
              {isDetailsLoading ? (
                <div className="space-y-3 py-2">
                  <div className="h-4 bg-slate-100 rounded w-2/3 animate-pulse"></div>
                  <div className="h-3 bg-slate-50 rounded w-1/2 animate-pulse"></div>
                  <hr className="border-slate-100 my-2" />
                  <div className="h-4 bg-slate-100 rounded w-3/4 animate-pulse"></div>
                </div>
              ) : upcomingInterviews.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-6 space-y-1">
                  <p className="text-sm font-semibold text-slate-800">No upcoming interviews</p>
                  <p className="text-xs text-slate-400 max-w-[200px]">
                    You have no scheduled interviews at this time.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                  {upcomingInterviews.map((iv) => {
                    const dateFormatted = new Date(iv.interview_date).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <div key={iv.id} className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-2 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-bold text-slate-900 block text-sm">{iv.companyName}</span>
                            <span className="text-slate-500 font-medium mt-0.5 block">{iv.jobTitle}</span>
                          </div>
                          <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-medium text-[10px] uppercase tracking-wider whitespace-nowrap">
                            {iv.round_title || `Round ${iv.round_number || 1}`}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-slate-200/60 flex flex-col space-y-1 text-slate-600">
                          <div>
                            <span className="font-medium text-slate-400 mr-1">Date:</span> {dateFormatted}
                          </div>
                          {iv.interviewer_names && (
                            <div className="truncate">
                              <span className="font-medium text-slate-400 mr-1">Panel:</span> 
                              <span className="text-slate-700">{iv.interviewer_names}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}