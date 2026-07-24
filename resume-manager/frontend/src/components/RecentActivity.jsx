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
       {activities.map((activity, index) => {
  const activityStyle =
    activity.type === 'APPLICATION'
      ? {
          dot: 'bg-emerald-500',
          line: 'border-emerald-200',
        }
      : activity.type === 'OUTREACH'
      ? {
          dot: 'bg-blue-500',
          line: 'border-blue-200',
        }
      : activity.type === 'INTERVIEW'
      ? {
          dot: 'bg-purple-500',
          line: 'border-purple-200',
        }
      : {
          dot: 'bg-slate-400',
          line: 'border-slate-200',
        };

  return (
    <div key={index} className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full ${activityStyle.dot}`} />
        {index !== activities.length - 1 && (
          <div className={`w-px flex-1 ${activityStyle.line} border-l mt-1`} />
        )}
      </div>

      <div className="pb-4">
        <div className="text-sm font-medium text-slate-800">
          {activity.title}
        </div>

        <div className="text-xs text-slate-500 mt-1">
          {activity.type} · {activity.date}
        </div>
      </div>
    </div>
  );
})}
        </div>
      )}
    </div>
  );
}

export default RecentActivity;