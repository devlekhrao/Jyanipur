import React, { useState, useEffect } from 'react';
import { getProjects, getSiteOperations, saveDPR, saveDocument, saveSnag, updateSnagStatus } from './db';

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
    getProjects().then(p => setProjects(p.filter(proj => proj.status !== 'Completed')));
  }, []);

  useEffect(() => {
    if (activeProject) {
      setLoading(true);
      getSiteOperations(activeProject).then(d => { setData(d); setLoading(false); });
    }
  }, [activeProject]);

  const refresh = () => getSiteOperations(activeProject).then(setData);

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

  const inputClass = "w-full px-4 py-3 rounded-xl border-none bg-zinc-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 text-sm font-medium transition-all shadow-inner";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1";

  if (!activeProject) {
    return (
      <div className="w-full font-['Poppins'] pb-12 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] border border-white/60 shadow-lg max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-zinc-800 mb-2">Site Operations Center</h2>
          <p className="text-zinc-500 text-xs font-medium mb-6">Select an active project to view Daily Reports, Documents, and Snag Lists.</p>
          <select value={activeProject} onChange={e => setActiveProject(e.target.value)} className={inputClass}>
            <option value="" disabled>Select Project Site...</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full font-['Poppins'] pb-12 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-4 border-b border-zinc-300/50 mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-800 tracking-tight">Site Operations</h2>
          <select value={activeProject} onChange={e => setActiveProject(e.target.value)} className="bg-transparent border-none text-emerald-600 font-bold outline-none cursor-pointer p-0 text-sm mt-1">
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="flex bg-white/60 p-1 rounded-xl shadow-sm border border-zinc-200">
          {['DPR', 'VAULT', 'SNAGS'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab ? 'bg-zinc-900 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-800'}`}>
              {tab === 'DPR' ? 'Daily Reports' : tab === 'VAULT' ? 'Doc Vault' : 'Snag List'}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div className="py-12 text-center text-zinc-500 text-xs">Loading site data...</div> : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT SIDE: LISTS */}
          <div className="lg:col-span-2 space-y-4">
            {activeTab === 'DPR' && data.dprs.map(d => (
              <div key={d.id} className="bg-white/80 p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col gap-2">
                <div className="flex justify-between items-center"><span className="text-xs font-bold text-zinc-800">{d.date}</span><span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{d.logged_by}</span></div>
                <p className="text-sm text-zinc-700 font-medium">{d.summary}</p>
                {d.materials_needed && <p className="text-xs text-red-500 mt-2 font-semibold">Needed: {d.materials_needed}</p>}
                {d.photo_link && <a href={d.photo_link} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 font-bold uppercase tracking-wider mt-2">View Site Photos &rarr;</a>}
              </div>
            ))}

            {activeTab === 'VAULT' && data.docs.map(d => (
              <div key={d.id} className="bg-white/80 p-4 rounded-2xl border border-zinc-200 shadow-sm flex justify-between items-center">
                <div>
                  <span className="bg-blue-100 text-blue-700 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider mb-1 inline-block">{d.doc_type}</span>
                  <h4 className="text-sm font-bold text-zinc-800">{d.title}</h4>
                  <p className="text-[10px] text-zinc-400 mt-1">Uploaded {d.uploaded_at} by {d.uploaded_by}</p>
                </div>
                <a href={d.file_link} target="_blank" rel="noreferrer" className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest">Open File</a>
              </div>
            ))}

            {activeTab === 'SNAGS' && data.snags.map(s => (
              <div key={s.id} className="bg-white/80 p-5 rounded-2xl border border-zinc-200 shadow-sm flex justify-between items-center gap-4">
                <div className="flex-1">
                  <p className={`text-sm font-medium ${s.status === 'Resolved' ? 'line-through text-zinc-400' : 'text-zinc-800'}`}>{s.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] font-bold text-zinc-500">Assignee: {s.assigned_to || 'Unassigned'}</span>
                    {s.photo_link && <a href={s.photo_link} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 font-bold">Photo</a>}
                  </div>
                </div>
                <select 
                  value={s.status} 
                  onChange={e => { updateSnagStatus(s.id, e.target.value); refresh(); }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border outline-none cursor-pointer ${s.status === 'Resolved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}
                >
                  <option value="Pending">Pending</option><option value="Resolved">Resolved</option>
                </select>
              </div>
            ))}

            {data[activeTab.toLowerCase() + 's']?.length === 0 && activeTab !== 'VAULT' && <div className="text-center text-zinc-400 text-xs py-10">No records found.</div>}
            {data.docs?.length === 0 && activeTab === 'VAULT' && <div className="text-center text-zinc-400 text-xs py-10">No documents found.</div>}
          </div>

          {/* RIGHT SIDE: FORMS */}
          <div className="bg-white/90 backdrop-blur-xl border border-zinc-200 p-6 rounded-3xl shadow-lg h-fit sticky top-6">
            
            {activeTab === 'DPR' && (
              <form onSubmit={handleDprSubmit} className="space-y-4">
                <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-widest border-b border-zinc-100 pb-2">Log Daily Report</h3>
                <div><label className={labelClass}>Date</label><input type="date" required value={dprForm.date} onChange={e => setDprForm({...dprForm, date: e.target.value})} className={inputClass} /></div>
                <div><label className={labelClass}>Work Completed Summary</label><textarea required rows="3" value={dprForm.summary} onChange={e => setDprForm({...dprForm, summary: e.target.value})} className={`${inputClass} resize-none`} placeholder="What got done today?"></textarea></div>
                <div><label className={labelClass}>Materials Needed Tomorrow</label><input type="text" value={dprForm.materials} onChange={e => setDprForm({...dprForm, materials: e.target.value})} className={inputClass} placeholder="e.g. 2 bags cement" /></div>
                <div><label className={labelClass}>Google Drive / Photo Link</label><input type="text" value={dprForm.photoLink} onChange={e => setDprForm({...dprForm, photoLink: e.target.value})} className={inputClass} /></div>
                <div><label className={labelClass}>Supervisor Name</label><input type="text" required value={dprForm.loggedBy} onChange={e => setDprForm({...dprForm, loggedBy: e.target.value})} className={inputClass} /></div>
                <button type="submit" className="w-full py-3 bg-zinc-900 text-white font-bold rounded-xl text-xs mt-2">Submit DPR</button>
              </form>
            )}

            {activeTab === 'VAULT' && (
              <form onSubmit={handleDocSubmit} className="space-y-4">
                <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-widest border-b border-zinc-100 pb-2">Upload Document</h3>
                <div><label className={labelClass}>Document Title</label><input type="text" required value={docForm.title} onChange={e => setDocForm({...docForm, title: e.target.value})} className={inputClass} placeholder="e.g. Approved Kitchen Layout" /></div>
                <div>
                  <label className={labelClass}>Type</label>
                  <select value={docForm.docType} onChange={e => setDocForm({...docForm, docType: e.target.value})} className={inputClass}>
                    <option value="AutoCAD 2D">AutoCAD 2D</option><option value="3D Render">3D Render</option><option value="Contract / BOQ">Contract / BOQ</option><option value="Site Photos">Site Photos</option><option value="Other">Other</option>
                  </select>
                </div>
                <div><label className={labelClass}>File / Drive URL</label><input type="text" required value={docForm.fileLink} onChange={e => setDocForm({...docForm, fileLink: e.target.value})} className={inputClass} placeholder="https://drive.google.com/..." /></div>
                <div><label className={labelClass}>Uploaded By</label><input type="text" required value={docForm.uploadedBy} onChange={e => setDocForm({...docForm, uploadedBy: e.target.value})} className={inputClass} /></div>
                <button type="submit" className="w-full py-3 bg-zinc-900 text-white font-bold rounded-xl text-xs mt-2">Save Document</button>
              </form>
            )}

            {activeTab === 'SNAGS' && (
              <form onSubmit={handleSnagSubmit} className="space-y-4">
                <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-widest border-b border-zinc-100 pb-2">Log New Defect / Snag</h3>
                <div><label className={labelClass}>Issue Description</label><textarea required rows="3" value={snagForm.description} onChange={e => setSnagForm({...snagForm, description: e.target.value})} className={`${inputClass} resize-none`} placeholder="e.g. Master bedroom wardrobe left door loose"></textarea></div>
                <div><label className={labelClass}>Assign To (Name or Agency)</label><input type="text" required value={snagForm.assignedTo} onChange={e => setSnagForm({...snagForm, assignedTo: e.target.value})} className={inputClass} placeholder="e.g. Ramesh Carpenter" /></div>
                <div><label className={labelClass}>Photo Link (Optional)</label><input type="text" value={snagForm.photoLink} onChange={e => setSnagForm({...snagForm, photoLink: e.target.value})} className={inputClass} /></div>
                <button type="submit" className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-xl text-xs mt-2 border border-red-200 hover:bg-red-100">Add to Snag List</button>
              </form>
            )}

          </div>
        </div>
      )}
    </div>
  );
}