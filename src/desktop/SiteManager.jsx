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
      getSiteOperations(activeProject).then(d => { setData(d || { dprs: [], docs: [], snags: [] }); setLoading(false); }).catch(() => {
        setData({ dprs: [], docs: [], snags: [] });
        setLoading(false);
      });
    }
  }, [activeProject]);

  const refresh = () => getSiteOperations(activeProject).then(d => setData(d || { dprs: [], docs: [], snags: [] }));

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

  const inputClass = "w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-zinc-900 text-xs font-medium transition-all shadow-sm";
  const labelClass = "block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1";

  if (!activeProject) {
    return (
      <div className="w-full h-full font-['Poppins'] flex flex-col items-center justify-center">
        <div className="bg-white p-10 rounded-[2.5rem] border border-zinc-200 shadow-xl max-w-md w-full text-center">
          <div className="text-4xl mb-4">🏗️</div>
          <h2 className="text-xl font-bold text-zinc-900 mb-2">Site Operations Center</h2>
          <p className="text-zinc-500 text-xs font-medium mb-6">Select an active project to view Daily Reports, Documents, and Snag Lists.</p>
          <select value={activeProject} onChange={e => setActiveProject(e.target.value)} className={`${inputClass} cursor-pointer`}>
            <option value="" disabled>Select Project Site...</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full font-['Poppins'] flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-4 border-b border-zinc-200 mb-6 gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Site Operations</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Active Site:</span>
            <select value={activeProject} onChange={e => setActiveProject(e.target.value)} className="bg-transparent border-none text-[#1E3A8A] font-bold outline-none cursor-pointer p-0 text-sm">
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex bg-zinc-100 p-1.5 rounded-2xl">
          {['DPR', 'VAULT', 'SNAGS'].map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)} 
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab ? 'bg-[#1E3A8A] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {tab === 'DPR' ? 'Daily Reports' : tab === 'VAULT' ? 'Doc Vault' : 'Snag List'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-zinc-400 font-medium text-xs flex-1">Loading site data...</div>
      ) : (
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 gap-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          
          {/* LEFT SIDE: LISTS */}
          <div className="lg:col-span-2 space-y-4">
            {activeTab === 'DPR' && data.dprs?.map(d => (
              <div key={d.id} className="bg-white p-6 rounded-[2rem] border border-zinc-200 shadow-sm flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-zinc-900">{d.date}</span>
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-100 px-2.5 py-0.5 rounded-md">{d.logged_by}</span>
                </div>
                <p className="text-xs text-zinc-700 font-medium leading-relaxed mt-1">{d.summary}</p>
                {d.materials_needed && <p className="text-xs text-red-500 font-bold mt-1">Needed: {d.materials_needed}</p>}
                {d.photo_link && <a href={d.photo_link} target="_blank" rel="noreferrer" className="text-[10px] text-[#1E3A8A] font-bold uppercase tracking-wider mt-2 hover:underline">View Site Photos &rarr;</a>}
              </div>
            ))}

            {activeTab === 'VAULT' && data.docs?.map(d => (
              <div key={d.id} className="bg-white p-6 rounded-[2rem] border border-zinc-200 shadow-sm flex justify-between items-center gap-4">
                <div>
                  <span className="bg-blue-50 text-[#1E3A8A] text-[9px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider mb-1.5 inline-block">{d.doc_type}</span>
                  <h4 className="text-sm font-bold text-zinc-900">{d.title}</h4>
                  <p className="text-[10px] text-zinc-400 font-semibold mt-1">Uploaded {d.uploaded_at} by {d.uploaded_by}</p>
                </div>
                <a href={d.file_link} target="_blank" rel="noreferrer" className="bg-[#1E3A8A] hover:bg-blue-900 text-white px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm shrink-0">
                  Open File
                </a>
              </div>
            ))}

            {activeTab === 'SNAGS' && data.snags?.map(s => (
              <div key={s.id} className="bg-white p-6 rounded-[2rem] border border-zinc-200 shadow-sm flex justify-between items-center gap-4">
                <div className="flex-1">
                  <p className={`text-xs font-bold ${s.status === 'Resolved' ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>{s.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] font-bold text-zinc-500">Assignee: {s.assigned_to || 'Unassigned'}</span>
                    {s.photo_link && <a href={s.photo_link} target="_blank" rel="noreferrer" className="text-[10px] text-[#1E3A8A] font-bold uppercase tracking-wider hover:underline">Photo Link</a>}
                  </div>
                </div>
                <select 
                  value={s.status} 
                  onChange={e => { updateSnagStatus(s.id, e.target.value); refresh(); }}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border outline-none cursor-pointer ${s.status === 'Resolved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}
                >
                  <option value="Pending">Pending</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>
            ))}

            {data.dprs?.length === 0 && activeTab === 'DPR' && <div className="text-center text-zinc-400 font-medium text-xs py-16 bg-white border border-dashed border-zinc-200 rounded-[2rem]">No daily reports logged yet.</div>}
            {data.docs?.length === 0 && activeTab === 'VAULT' && <div className="text-center text-zinc-400 font-medium text-xs py-16 bg-white border border-dashed border-zinc-200 rounded-[2rem]">No site documents found.</div>}
            {data.snags?.length === 0 && activeTab === 'SNAGS' && <div className="text-center text-zinc-400 font-medium text-xs py-16 bg-white border border-dashed border-zinc-200 rounded-[2rem]">No snags or issues reported.</div>}
          </div>

          {/* RIGHT SIDE: FORMS */}
          <div className="bg-white border border-zinc-200 p-6 rounded-[2rem] shadow-sm h-fit">
            
            {activeTab === 'DPR' && (
              <form onSubmit={handleDprSubmit} className="space-y-4">
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest border-b border-zinc-100 pb-3 mb-2">Log Daily Report</h3>
                <div><label className={labelClass}>Date</label><input type="date" required value={dprForm.date} onChange={e => setDprForm({...dprForm, date: e.target.value})} className={inputClass} /></div>
                <div><label className={labelClass}>Work Completed Summary</label><textarea required rows="3" value={dprForm.summary} onChange={e => setDprForm({...dprForm, summary: e.target.value})} className={`${inputClass} resize-none`} placeholder="What got done today?"></textarea></div>
                <div><label className={labelClass}>Materials Needed Tomorrow</label><input type="text" value={dprForm.materials} onChange={e => setDprForm({...dprForm, materials: e.target.value})} className={inputClass} placeholder="e.g. 2 bags cement" /></div>
                <div><label className={labelClass}>Google Drive / Photo Link</label><input type="text" value={dprForm.photoLink} onChange={e => setDprForm({...dprForm, photoLink: e.target.value})} className={inputClass} placeholder="https://drive.google.com/..." /></div>
                <div><label className={labelClass}>Supervisor Name</label><input type="text" required value={dprForm.loggedBy} onChange={e => setDprForm({...dprForm, loggedBy: e.target.value})} className={inputClass} placeholder="Supervisor name..." /></div>
                <button type="submit" className="w-full py-3.5 bg-[#1E3A8A] hover:bg-blue-900 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all shadow-md cursor-pointer mt-2">
                  Submit DPR
                </button>
              </form>
            )}

            {activeTab === 'VAULT' && (
              <form onSubmit={handleDocSubmit} className="space-y-4">
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest border-b border-zinc-100 pb-3 mb-2">Upload Document</h3>
                <div><label className={labelClass}>Document Title</label><input type="text" required value={docForm.title} onChange={e => setDocForm({...docForm, title: e.target.value})} className={inputClass} placeholder="e.g. Approved Kitchen Layout" /></div>
                <div>
                  <label className={labelClass}>Type</label>
                  <select value={docForm.docType} onChange={e => setDocForm({...docForm, docType: e.target.value})} className={`${inputClass} cursor-pointer`}>
                    <option value="AutoCAD 2D">AutoCAD 2D</option>
                    <option value="3D Render">3D Render</option>
                    <option value="Contract / BOQ">Contract / BOQ</option>
                    <option value="Site Photos">Site Photos</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div><label className={labelClass}>File / Drive URL</label><input type="text" required value={docForm.fileLink} onChange={e => setDocForm({...docForm, fileLink: e.target.value})} className={inputClass} placeholder="https://drive.google.com/..." /></div>
                <div><label className={labelClass}>Uploaded By</label><input type="text" required value={docForm.uploadedBy} onChange={e => setDocForm({...docForm, uploadedBy: e.target.value})} className={inputClass} placeholder="Your name..." /></div>
                <button type="submit" className="w-full py-3.5 bg-[#1E3A8A] hover:bg-blue-900 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all shadow-md cursor-pointer mt-2">
                  Save Document
                </button>
              </form>
            )}

            {activeTab === 'SNAGS' && (
              <form onSubmit={handleSnagSubmit} className="space-y-4">
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest border-b border-zinc-100 pb-3 mb-2">Log New Defect / Snag</h3>
                <div><label className={labelClass}>Issue Description</label><textarea required rows="3" value={snagForm.description} onChange={e => setSnagForm({...snagForm, description: e.target.value})} className={`${inputClass} resize-none`} placeholder="e.g. Master bedroom wardrobe left door loose"></textarea></div>
                <div><label className={labelClass}>Assign To (Name or Agency)</label><input type="text" required value={snagForm.assignedTo} onChange={e => setSnagForm({...snagForm, assignedTo: e.target.value})} className={inputClass} placeholder="e.g. Ramesh Carpenter" /></div>
                <div><label className={labelClass}>Photo Link (Optional)</label><input type="text" value={snagForm.photoLink} onChange={e => setSnagForm({...snagForm, photoLink: e.target.value})} className={inputClass} placeholder="https://..." /></div>
                <button type="submit" className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all shadow-md cursor-pointer mt-2">
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