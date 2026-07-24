import React from 'react';

function RecentActivity({ activities = [], isLoading }) {
  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Recent Activity
        </h2>
        <div className="text-sm text-slate-400">
          Loading activity...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">
        Recent Activity
      </h2>

      {activities.length === 0 ? (
        <div className="text-sm text-slate-500">
          No recent activity.
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity, index) => (
            <div
              key={index}
              className="border-l-2 border-indigo-400 pl-4"
            >
              <div className="text-sm font-medium text-slate-800">
                {activity.title}
              </div>

              <div className="text-xs text-slate-500 mt-1">
                {activity.type} · {activity.date}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RecentActivity;