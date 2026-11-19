import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

async function api(path, options = {}) {
  const response = await fetch(path, { headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) throw new Error(body?.error?.message || 'Request failed');
  return body.data;
}

const emptyJob = { title: '', company_name: '', location: '', employment_type: 'Full-time', source_url: '', source: 'MANUAL', posted_date: '', applicant_count: '', salary_text: '', description: '' };
const defaultProfile = { name: 'My Job Search', titles: ['Head of IT','Head of IT & Security','Head - IT Infrastructure','Director IT','CISO','Director Cybersecurity'], locations: ['Bengaluru','Chennai','Hyderabad','Pune'], employment_types: ['Full-time','Consulting','Fractional','Contract'], keywords: ['IT Infrastructure','Cybersecurity','Cloud','GRC','ISO 27001','Risk Management','Security Governance','IT Operations'], min_match_score: 80, max_applicants: 300 };

function scoreColor(score) {
  if (score >= 80) return 'bg-emerald-100 text-emerald-800';
  if (score >= 65) return 'bg-amber-100 text-amber-800';
  return 'bg-slate-100 text-slate-700';
}

export default function JobFeed() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [minimum, setMinimum] = useState(0);
  const [importOpen, setImportOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [jobForm, setJobForm] = useState(emptyJob);
  const [profileForm, setProfileForm] = useState(defaultProfile);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const profileQuery = useQuery({ queryKey: ['job-feed-profile'], queryFn: () => api('/api/v1/job-feed/profiles') });
  const jobsQuery = useQuery({ queryKey: ['job-feed-jobs', status, search, minimum], queryFn: () => api('/api/v1/job-feed?status='+encodeURIComponent(status)+'&q='+encodeURIComponent(search)+'&min_score='+minimum) });
  const profile = profileQuery.data?.profile || defaultProfile;
  const jobs = jobsQuery.data?.jobs || [];

  const importMutation = useMutation({ mutationFn: payload => api('/api/v1/job-feed',{method:'POST',body:JSON.stringify(payload)}), onSuccess:()=>{qc.invalidateQueries({queryKey:['job-feed-jobs']});setImportOpen(false);setJobForm(emptyJob);setSuccess('Job added to your feed.');setError('');}, onError:e=>setError(e.message) });
  const statusMutation = useMutation({ mutationFn: ({id,status})=>api('/api/v1/job-feed/'+id,{method:'PATCH',body:JSON.stringify({status})}), onSuccess:()=>qc.invalidateQueries({queryKey:['job-feed-jobs']}) });
  const profileMutation = useMutation({ mutationFn: payload=>api('/api/v1/job-feed/profiles',{method:'PUT',body:JSON.stringify(payload)}), onSuccess:()=>{qc.invalidateQueries({queryKey:['job-feed-profile']});setProfileOpen(false);setSuccess('Search profile saved.');setError('');}, onError:e=>setError(e.message) });

  const counts = useMemo(()=>({all:jobs.length, new:jobs.filter(j=>j.status==='NEW').length, saved:jobs.filter(j=>j.status==='SAVED').length, high:jobs.filter(j=>(j.match_score||0)>=80).length}),[jobs]);

  const openProfile = () => { setProfileForm({...profile, titles:profile.titles||[], locations:profile.locations||[], employment_types:profile.employment_types||[], keywords:profile.keywords||[]});setProfileOpen(true); };
  const updateList = (field,value)=>setProfileForm(prev=>({...prev,[field]:value.split('\n').map(x=>x.trim()).filter(Boolean)}));

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div><h2 className="text-2xl font-bold text-slate-900">Job Feed</h2><p className="mt-1 text-sm text-slate-500">Discover, import and prioritise opportunities against your search profile.</p></div>
      <div className="flex gap-2"><button onClick={openProfile} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Search Profile</button><button onClick={()=>{setError('');setSuccess('');setImportOpen(true)}} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">+ Import Job</button></div>
    </div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[['Jobs in Feed',counts.all],['New',counts.new],['Saved',counts.saved],['80%+ Matches',counts.high]].map(([label,value])=><div key={label} className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs font-medium text-slate-500">{label}</div><div className="mt-1 text-2xl font-bold text-slate-900">{value}</div></div>)}
    </div>
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search title, company or location..." className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"/>
        <select value={status} onChange={e=>setStatus(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="ALL">All statuses</option><option value="NEW">New</option><option value="SAVED">Saved</option><option value="REVIEWED">Reviewed</option><option value="SKIPPED">Skipped</option><option value="ADDED_TO_OPPORTUNITIES">Added to Opportunities</option></select>
        <select value={minimum} onChange={e=>setMinimum(Number(e.target.value))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value={0}>Any match</option><option value={60}>60%+</option><option value={70}>70%+</option><option value={80}>80%+</option><option value={90}>90%+</option></select>
      </div>
    </div>
    {error&&<div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}{success&&<div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}
    {jobsQuery.isLoading?<div className="rounded-xl bg-white p-8 text-center text-slate-500">Loading jobs...</div>:jobsQuery.isError?<div className="rounded-xl bg-white p-8 text-center text-rose-600">{jobsQuery.error.message}</div>:jobs.length===0?<div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center"><div className="text-lg font-semibold text-slate-800">Your Job Feed is empty</div><p className="mt-2 text-sm text-slate-500">Import a job description or URL to get started. Matching and duplicate detection will run automatically.</p><button onClick={()=>setImportOpen(true)} className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Import your first job</button></div>:<div className="space-y-3">{jobs.map(job=><article key={job.id} className="rounded-xl border border-slate-200 bg-white p-4 md:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><h3 className="text-lg font-semibold text-slate-900">{job.title}</h3><p className="mt-1 text-sm font-medium text-slate-700">{job.company_name}</p><p className="mt-1 text-sm text-slate-500">{[job.location,job.employment_type,job.posted_date].filter(Boolean).join(' · ')}</p></div><div className="flex items-center gap-2"><span className={'rounded-full px-3 py-1 text-sm font-bold '+scoreColor(job.match_score||0)}>{job.match_score ?? '—'}% Match</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{job.status}</span></div></div><div className="mt-3 flex flex-wrap gap-2">{(job.match_details?.matched_keywords||[]).slice(0,6).map(k=><span key={k} className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs text-indigo-700">{k}</span>)}</div><p className="mt-3 line-clamp-3 whitespace-pre-line text-sm text-slate-600">{job.description}</p><div className="mt-4 flex flex-wrap gap-2">{job.source_url&&<a href={job.source_url} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700">View Original ↗</a>}{job.status!=='SAVED'&&<button onClick={()=>statusMutation.mutate({id:job.id,status:'SAVED'})} className="rounded-lg border border-indigo-200 px-3 py-1.5 text-sm font-medium text-indigo-700">Save</button>}{job.status!=='REVIEWED'&&<button onClick={()=>statusMutation.mutate({id:job.id,status:'REVIEWED'})} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700">Mark Reviewed</button>}{job.status!=='SKIPPED'&&<button onClick={()=>statusMutation.mutate({id:job.id,status:'SKIPPED'})} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-500">Skip</button>}<button onClick={()=>statusMutation.mutate({id:job.id,status:'ADDED_TO_OPPORTUNITIES'})} className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white">Mark for Opportunities</button></div></article>)}</div>}
    {importOpen&&<Modal title="Import Job" onClose={()=>setImportOpen(false)}><form onSubmit={e=>{e.preventDefault();importMutation.mutate({...jobForm,applicant_count:jobForm.applicant_count?Number(jobForm.applicant_count):null});}} className="space-y-3"><div className="grid gap-3 sm:grid-cols-2"><Field label="Job Title *" value={jobForm.title} onChange={v=>setJobForm({...jobForm,title:v})}/><Field label="Company *" value={jobForm.company_name} onChange={v=>setJobForm({...jobForm,company_name:v})}/><Field label="Location" value={jobForm.location} onChange={v=>setJobForm({...jobForm,location:v})}/><Field label="Employment Type" value={jobForm.employment_type} onChange={v=>setJobForm({...jobForm,employment_type:v})}/><Field label="Job URL" value={jobForm.source_url} onChange={v=>setJobForm({...jobForm,source_url:v})}/><Field label="Posted Date" value={jobForm.posted_date} onChange={v=>setJobForm({...jobForm,posted_date:v})}/><Field label="Applicants" value={jobForm.applicant_count} onChange={v=>setJobForm({...jobForm,applicant_count:v})}/><Field label="Salary" value={jobForm.salary_text} onChange={v=>setJobForm({...jobForm,salary_text:v})}/></div><label className="block text-sm font-medium text-slate-700">Job Description *<textarea required rows={7} value={jobForm.description} onChange={e=>setJobForm({...jobForm,description:e.target.value})} className="mt-1 w-full rounded-lg border border-slate-300 p-3 text-sm"/></label><div className="flex justify-end gap-2"><button type="button" onClick={()=>setImportOpen(false)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button disabled={importMutation.isPending} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">{importMutation.isPending?'Importing...':'Import & Match'}</button></div></form></Modal>}
    {profileOpen&&<Modal title="Search Profile" onClose={()=>setProfileOpen(false)}><form onSubmit={e=>{e.preventDefault();profileMutation.mutate(profileForm)}} className="space-y-3"><Field label="Profile Name" value={profileForm.name||''} onChange={v=>setProfileForm({...profileForm,name:v})}/>{[['titles','Target Titles'],['locations','Preferred Locations'],['employment_types','Employment Types'],['keywords','Matching Keywords']].map(([key,label])=><label key={key} className="block text-sm font-medium text-slate-700">{label}<textarea rows={3} value={(profileForm[key]||[]).join('\n')} onChange={e=>updateList(key,e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"/><span className="text-xs text-slate-400">One item per line</span></label>)}<div className="grid grid-cols-2 gap-3"><Field label="Minimum Match Score" value={String(profileForm.min_match_score??80)} onChange={v=>setProfileForm({...profileForm,min_match_score:Number(v)})} type="number"/><Field label="Max Applicants" value={String(profileForm.max_applicants??300)} onChange={v=>setProfileForm({...profileForm,max_applicants:v===''?null:Number(v)})} type="number"/></div><div className="flex justify-end gap-2"><button type="button" onClick={()=>setProfileOpen(false)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button disabled={profileMutation.isPending} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Save Profile</button></div></form></Modal>}
  </div>;
}

function Field({label,value,onChange,type='text'}) { return <label className="block text-sm font-medium text-slate-700">{label}<input type={type} value={value} onChange={e=>onChange(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"/></label>; }
function Modal({title,onClose,children}) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3"><div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl"><div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-semibold">{title}</h3><button onClick={onClose} className="rounded p-2 text-slate-500 hover:bg-slate-100">✕</button></div>{children}</div></div>; }
