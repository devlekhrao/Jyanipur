import React, { useState, useEffect } from 'react';
import { getProjects, getSiteOperations, saveDPR, saveDocument, saveSnag, updateSnagStatus } from '../db';

export default function SiteManager() {
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState('');
  const [activeTab, setActiveTab] = useState('DPR'); // DPR, VAULT, SNAGS
  const [data, setData] = useState({ dprs: [], docs: [], snags: [] });
  const [loading, setLoading] = useState(false);

  // Forms
  const [dprForm, setDprForm] = useState({ date: new Date().toISOString().split('T')[0], summary: '', materials: '', photoLink: '', loggedBy: '' });
  const [docForm, setDocForm] = useState({ title: '', docType: 'AutoCAD 2D', fileLink: '', uploadedBy: '' });
  const [snagForm, setSnagForm] = useState({ description: '', assignedTo: '', photoLink: '' });

  useEffect(() => {
    getProjects().then(p => setProjects((p || []).filter(proj => proj.status !== 'Completed')));
  }, []);

  useEffect(() => {
    if (activeProject) {
      setLoading(true);
      getSiteOperations(activeProject).then(d => { 
        setData(d || { dprs: [], docs: [], snags: [] }); 
        setLoading(false); 
      }).catch(() => {
        setData({ dprs: [], docs: [], snags: [] });
        setLoading(false);
      });
    }
  }, [activeProject]);

  const refresh = () => getSiteOperations(activeProject).then(d => setData(d || { dprs: [], docs: [], snags: [] }));

  const handleFileUpload = (e, formSetter) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        formSetter(prev => ({
          ...prev,
          photoLink: reader.result,
          fileLink: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDprSubmit = async (e) => {
    e.preventDefault();
    await saveDPR({ ...dprForm, projectId: activeProject });
    setDprForm({ date: new Date().toISOString().split('T')[0], summary: '', materials: '', photoLink: '', loggedBy: '' });
    refresh();
  };

  const handleDocSubmit = async (e) => {
    e.preventDefault();
    await saveDocument({ ...docForm, projectId: activeProject });
    setDocForm({ title: '', docType: 'AutoCAD 2D', fileLink: '', uploadedBy: '' });
    refresh();
  };

  const handleSnagSubmit = async (e) => {
    e.preventDefault();
    await saveSnag({ ...snagForm, projectId: activeProject });
    setSnagForm({ description: '', assignedTo: '', photoLink: '' });
    refresh();
  };

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-inset focus:ring-[#B45309] text-zinc-900 text-sm font-medium transition-all shadow-sm disabled:opacity-75 disabled:cursor-not-allowed";
  const labelClass = "block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 ml-0.5";

  if (!activeProject) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6" style={{ fontFamily: 'Poppins, sans-serif' }}>
        <div className="bg-white p-10 rounded-2xl border border-zinc-200 shadow-sm max-w-md w-full text-center">
          <div className="w-16 h-16 bg-amber-50 text-[#B45309] rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">
            🏗️
          </div>
          <h2 className="text-xl font-bold text-zinc-900 mb-1">Site Operations Center</h2>
          <p className="text-zinc-500 text-sm font-medium mb-6">Select an active project site to manage Daily Progress Reports (DPR), site drawings, and snag logs.</p>
          
          <div className="relative">
            <select 
              value={activeProject} 
              onChange={e => setActiveProject(e.target.value)} 
              className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10 font-semibold`}
            >
              <option value="" disabled>Select Project Site...</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
      </div>
    );
  }

  const selectedProjObj = projects.find(p => String(p.id) === String(activeProject));

  return (
    <div className="w-full h-full flex flex-col" style={{ fontFamily: 'Poppins, sans-serif' }}>
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 mb-6 border-b border-zinc-200 shrink-0 gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Daily Progress & Site Operations</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Active Site:</span>
            <select 
              value={activeProject} 
              onChange={e => setActiveProject(e.target.value)} 
              className="bg-amber-50 text-[#B45309] font-bold border border-amber-200/80 rounded-lg px-2.5 py-0.5 text-xs outline-none cursor-pointer"
            >
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-zinc-200">
          {['DPR', 'VAULT', 'SNAGS'].map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)} 
              className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === tab ? 'bg-[#B45309] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {tab === 'DPR' ? 'Daily Reports' : tab === 'VAULT' ? 'Doc Vault' : 'Snag List'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-zinc-400 font-medium text-sm flex flex-col items-center justify-center space-y-3 flex-1">
          <div className="w-10 h-10 border-4 border-zinc-200 border-t-[#B45309] rounded-full animate-spin"></div>
          <p>Loading site records...</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 gap-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          
          {/* LEFT SIDE: LIST RECORDS */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* 1. DAILY PROGRESS REPORTS */}
            {activeTab === 'DPR' && data.dprs?.map(d => (
              <div key={d.id} className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[#B45309]">{d.date}</span>
                  <span className="text-[10px] font-semibold text-zinc-600 bg-zinc-100 border border-zinc-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Supervisor: {d.logged_by || 'Staff'}
                  </span>
                </div>
                <p className="text-sm text-zinc-800 font-medium leading-relaxed mt-1">{d.summary}</p>
                {d.materials_needed && (
                  <p className="text-xs text-amber-700 font-semibold mt-1 flex items-center gap-1.5 bg-amber-50 border border-amber-200/60 p-2 rounded-lg">
                    <span>⚠️ Materials Needed:</span> {d.materials_needed}
                  </p>
                )}
                {d.photo_link && (
                  <a href={d.photo_link} target="_blank" rel="noreferrer" className="text-xs text-[#B45309] font-semibold mt-2 hover:underline inline-flex items-center gap-1">
                    View Site Photos / Attachment &rarr;
                  </a>
                )}
              </div>
            ))}

            {/* 2. SITE DOCUMENTS */}
            {activeTab === 'VAULT' && data.docs?.map(d => (
              <div key={d.id} className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex justify-between items-center gap-4">
                <div>
                  <span className="bg-amber-50 text-[#B45309] border border-amber-200/60 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider mb-1 inline-block">
                    {d.doc_type}
                  </span>
                  <h4 className="text-sm font-semibold text-zinc-900">{d.title}</h4>
                  <p className="text-xs text-zinc-400 font-medium mt-1">Uploaded {d.uploaded_at} by {d.uploaded_by}</p>
                </div>
                <a href={d.file_link} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-amber-50 text-[#B45309] hover:bg-[#B45309] hover:text-white border border-amber-200/60 rounded-lg font-semibold cursor-pointer text-[11px] uppercase tracking-wider transition-all shrink-0">
                  Open File
                </a>
              </div>
            ))}

            {/* 3. SNAG LIST */}
            {activeTab === 'SNAGS' && data.snags?.map(s => (
              <div key={s.id} className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex justify-between items-center gap-4">
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${s.status === 'Resolved' ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>{s.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs font-medium text-zinc-500">Assignee: <strong className="text-zinc-800">{s.assigned_to || 'Unassigned'}</strong></span>
                    {s.photo_link && <a href={s.photo_link} target="_blank" rel="noreferrer" className="text-xs text-[#B45309] font-semibold hover:underline">Photo Attachment</a>}
                  </div>
                </div>
                <select 
                  value={s.status || 'Pending'} 
                  onChange={e => { updateSnagStatus(s.id, e.target.value); refresh(); }}
                  className={`appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23A1A1AA%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%223%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.6rem_center] bg-[length:0.8rem_0.8rem] pr-7 pl-3 py-1.5 rounded-full border outline-none cursor-pointer transition-all text-[10px] font-semibold uppercase tracking-wider ${
                    s.status === 'Resolved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'
                  }`}
                >
                  <option value="Pending">Pending</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>
            ))}

            {data.dprs?.length === 0 && activeTab === 'DPR' && <div className="text-center text-zinc-400 font-medium text-sm py-16 bg-white border border-dashed border-zinc-200 rounded-2xl">No daily progress reports logged for this site yet.</div>}
            {data.docs?.length === 0 && activeTab === 'VAULT' && <div className="text-center text-zinc-400 font-medium text-sm py-16 bg-white border border-dashed border-zinc-200 rounded-2xl">No site drawings or documents found.</div>}
            {data.snags?.length === 0 && activeTab === 'SNAGS' && <div className="text-center text-zinc-400 font-medium text-sm py-16 bg-white border border-dashed border-zinc-200 rounded-2xl">No defects or snags logged for this site.</div>}
          </div>

          {/* RIGHT SIDE: ENTRY FORM CARDS */}
          <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-sm h-fit space-y-4">
            
            {activeTab === 'DPR' && (
              <form onSubmit={handleDprSubmit} className="space-y-4">
                <h3 className="text-xs font-bold text-[#B45309] uppercase tracking-wider border-b border-zinc-100 pb-2">Log Daily Progress Report</h3>
                <div>
                  <label className={labelClass}>Report Date</label>
                  <input type="date" required value={dprForm.date} onChange={e => setDprForm({...dprForm, date: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Work Completed Summary</label>
                  <textarea required rows="3" value={dprForm.summary} onChange={e => setDprForm({...dprForm, summary: e.target.value})} className={`${inputClass} resize-y min-h-[80px]`} placeholder="Summary of work executed today..."></textarea>
                </div>
                <div>
                  <label className={labelClass}>Materials Needed Tomorrow</label>
                  <input type="text" value={dprForm.materials} onChange={e => setDprForm({...dprForm, materials: e.target.value})} className={inputClass} placeholder="e.g. 5 bags tile adhesive" />
                </div>
                <div>
                  <label className={labelClass}>Upload Site Photo / Attachment</label>
                  <input type="file" accept="image/*,.pdf" onChange={e => handleFileUpload(e, setDprForm)} className="w-full text-xs text-zinc-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#B45309] file:text-white hover:file:bg-[#92400E] cursor-pointer" />
                </div>
                <div>
                  <label className={labelClass}>Supervisor Name</label>
                  <input type="text" required value={dprForm.loggedBy} onChange={e => setDprForm({...dprForm, loggedBy: e.target.value})} className={inputClass} placeholder="Site Incharge Name..." />
                </div>
                <button type="submit" className="w-full py-3 bg-[#B45309] hover:bg-[#92400E] text-white font-semibold rounded-xl text-sm transition-all shadow-sm cursor-pointer mt-2">
                  Submit DPR
                </button>
              </form>
            )}

            {activeTab === 'VAULT' && (
              <form onSubmit={handleDocSubmit} className="space-y-4">
                <h3 className="text-xs font-bold text-[#B45309] uppercase tracking-wider border-b border-zinc-100 pb-2">Upload Site Document</h3>
                <div>
                  <label className={labelClass}>Document Title</label>
                  <input type="text" required value={docForm.title} onChange={e => setDocForm({...docForm, title: e.target.value})} className={inputClass} placeholder="e.g. Approved Ceiling Layout" />
                </div>
                <div>
                  <label className={labelClass}>Type</label>
                  <select 
                    value={docForm.docType} 
                    onChange={e => setDocForm({...docForm, docType: e.target.value})} 
                    className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
                  >
                    <option value="AutoCAD 2D">AutoCAD 2D</option>
                    <option value="3D Render">3D Render</option>
                    <option value="Contract / BOQ">Contract / BOQ</option>
                    <option value="Site Photos">Site Photos</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Upload File</label>
                  <input type="file" accept="image/*,.pdf,.dwg" onChange={e => handleFileUpload(e, setDocForm)} className="w-full text-xs text-zinc-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#B45309] file:text-white hover:file:bg-[#92400E] cursor-pointer" />
                </div>
                <div>
                  <label className={labelClass}>Uploaded By</label>
                  <input type="text" required value={docForm.uploadedBy} onChange={e => setDocForm({...docForm, uploadedBy: e.target.value})} className={inputClass} placeholder="Your name..." />
                </div>
                <button type="submit" className="w-full py-3 bg-[#B45309] hover:bg-[#92400E] text-white font-semibold rounded-xl text-sm transition-all shadow-sm cursor-pointer mt-2">
                  Save Document
                </button>
              </form>
            )}

            {activeTab === 'SNAGS' && (
              <form onSubmit={handleSnagSubmit} className="space-y-4">
                <h3 className="text-xs font-bold text-red-600 uppercase tracking-wider border-b border-zinc-100 pb-2">Log Defect / Snag Issue</h3>
                <div>
                  <label className={labelClass}>Issue Description</label>
                  <textarea required rows="3" value={snagForm.description} onChange={e => setSnagForm({...snagForm, description: e.target.value})} className={`${inputClass} resize-y min-h-[80px]`} placeholder="Describe defect, location, and fix required..."></textarea>
                </div>
                <div>
                  <label className={labelClass}>Assign To (Name or Agency)</label>
                  <input type="text" required value={snagForm.assignedTo} onChange={e => setSnagForm({...snagForm, assignedTo: e.target.value})} className={inputClass} placeholder="e.g. Ramesh Carpenter" />
                </div>
                <div>
                  <label className={labelClass}>Photo Attachment</label>
                  <input type="file" accept="image/*" onChange={e => handleFileUpload(e, setSnagForm)} className="w-full text-xs text-zinc-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#B45309] file:text-white hover:file:bg-[#92400E] cursor-pointer" />
                </div>
                <button type="submit" className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-sm transition-all shadow-sm cursor-pointer mt-2">
                  Add to Snag List
                </button>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}