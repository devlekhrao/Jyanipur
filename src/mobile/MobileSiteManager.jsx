import React, { useState, useEffect } from 'react';
import { getProjects, getSiteOperations, saveDPR, saveDocument, saveSnag, updateSnagStatus } from '.../db';

export default function MobileSiteManager() {
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState('');
  const [activeTab, setActiveTab] = useState('DPR'); // DPR, VAULT, SNAGS
  const [data, setData] = useState({ dprs: [], docs: [], snags: [] });
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Forms
  const [dprForm, setDprForm] = useState({ date: new Date().toISOString().split('T')[0], summary: '', materials: '', photoLink: '', loggedBy: '' });
  const [docForm, setDocForm] = useState({ title: '', docType: 'AutoCAD 2D', fileLink: '', uploadedBy: '' });
  const [snagForm, setSnagForm] = useState({ description: '', assignedTo: '', photoLink: '' });

  useEffect(() => {
    getProjects().then(p => {
      const activeProjs = (p || []).filter(proj => proj.status !== 'Completed');
      setProjects(activeProjs);
      if (activeProjs.length > 0 && !activeProject) {
        setActiveProject(activeProjs[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (activeProject) {
      setLoading(true);
      getSiteOperations(activeProject)
        .then(d => { setData(d || { dprs: [], docs: [], snags: [] }); setLoading(false); })
        .catch(() => {
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
    setIsModalOpen(false);
    refresh();
  };

  const handleDocSubmit = async (e) => {
    e.preventDefault();
    await saveDocument({ ...docForm, projectId: activeProject });
    setDocForm({ title: '', docType: 'AutoCAD 2D', fileLink: '', uploadedBy: '' });
    setIsModalOpen(false);
    refresh();
  };

  const handleSnagSubmit = async (e) => {
    e.preventDefault();
    await saveSnag({ ...snagForm, projectId: activeProject });
    setSnagForm({ description: '', assignedTo: '', photoLink: '' });
    setIsModalOpen(false);
    refresh();
  };

  const inputClass = "w-full px-4 py-3.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-zinc-900 text-sm font-medium transition-all shadow-sm";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1";

  // EMPTY SELECTION STATE
  if (!activeProject) {
    return (
      <div className="w-full h-full flex flex-col font-['Poppins'] items-center justify-center p-4">
        <div className="bg-white p-6 rounded-[2rem] border border-zinc-200 shadow-lg w-full text-center space-y-4">
          <span className="text-4xl block">🏗️</span>
          <h2 className="text-xl font-extrabold text-zinc-900">Site Operations Center</h2>
          <p className="text-zinc-500 text-xs font-medium">Select an active project site to view Daily Reports, Document Vaults, and Snag Lists.</p>
          
          <div className="relative">
            <select 
              value={activeProject} 
              onChange={e => setActiveProject(e.target.value)} 
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3.5 text-xs font-bold text-zinc-900 outline-none appearance-none pr-8"
            >
              <option value="" disabled>Select Project Site...</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400 text-xs">▼</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col font-['Poppins']">
      
      {/* HEADER SECTION */}
      <div className="mb-3 shrink-0">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Site Operations</h2>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Field DPRs & Quality Logs</p>
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[#1E3A8A] hover:bg-blue-900 text-white font-black px-3.5 py-2 rounded-xl text-[10px] uppercase tracking-wider shadow-md active:scale-95 transition-transform"
          >
            {activeTab === 'DPR' ? '+ DPR' : activeTab === 'VAULT' ? '+ Doc' : '+ Snag'}
          </button>
        </div>

        {/* ACTIVE SITE SELECTOR DROPDOWN */}
        <div className="relative mb-2">
          <select 
            value={activeProject} 
            onChange={e => setActiveProject(e.target.value)} 
            className="w-full bg-white border border-zinc-200 rounded-2xl px-3.5 py-2.5 text-xs font-extrabold text-[#1E3A8A] outline-none shadow-sm appearance-none pr-8"
          >
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400 text-xs">▼</div>
        </div>

        {/* SEGMENTED TAB CONTROL */}
        <div className="flex bg-zinc-200/80 p-1 rounded-2xl gap-1">
          {[
            { id: 'DPR', label: `DPR (${data.dprs?.length || 0})` },
            { id: 'VAULT', label: `Vault (${data.docs?.length || 0})` },
            { id: 'SNAGS', label: `Snags (${data.snags?.length || 0})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all truncate ${
                activeTab === tab.id ? 'bg-white text-[#1E3A8A] shadow-sm' : 'text-zinc-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* STREAM LIST AREA */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {loading ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-xs">Loading site data...</div>
        ) : activeTab === 'DPR' ? (
          data.dprs?.length === 0 ? (
            <div className="text-center py-12 bg-white/50 border border-zinc-200 border-dashed rounded-3xl mt-2">
              <span className="text-3xl mb-2 block">📝</span>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">No daily progress reports logged</p>
            </div>
          ) : (
            data.dprs?.map(d => (
              <div key={d.id} className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-2 active:scale-[0.99] transition-transform">
                <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
                  <span className="text-xs font-extrabold text-zinc-900">{d.date}</span>
                  <span className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-widest bg-zinc-100 px-2.5 py-0.5 rounded-md">
                    {d.logged_by || 'Supervisor'}
                  </span>
                </div>

                <p className="text-xs text-zinc-700 font-medium leading-relaxed">{d.summary}</p>
                
                {d.materials_needed && (
                  <p className="text-[10px] text-red-600 font-bold bg-red-50 p-2 rounded-xl border border-red-100">
                    Required: {d.materials_needed}
                  </p>
                )}

                {d.photo_link && (
                  <a href={d.photo_link} target="_blank" rel="noreferrer" className="text-[10px] text-[#1E3A8A] font-black uppercase tracking-wider block pt-1">
                    View Site Photos →
                  </a>
                )}
              </div>
            ))
          )
        ) : activeTab === 'VAULT' ? (
          data.docs?.length === 0 ? (
            <div className="text-center py-12 bg-white/50 border border-zinc-200 border-dashed rounded-3xl mt-2">
              <span className="text-3xl mb-2 block">📁</span>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">No site documents found in vault</p>
            </div>
          ) : (
            data.docs?.map(d => (
              <div key={d.id} className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-2 active:scale-[0.99] transition-transform flex items-center justify-between">
                <div>
                  <span className="bg-blue-50 text-[#1E3A8A] text-[8px] font-black px-2.5 py-0.5 rounded uppercase tracking-wider inline-block">
                    {d.doc_type}
                  </span>
                  <h4 className="text-sm font-extrabold text-zinc-900 mt-1">{d.title}</h4>
                  <p className="text-[9px] text-zinc-400 font-semibold mt-0.5">
                    {d.uploaded_at} • {d.uploaded_by}
                  </p>
                </div>

                <a 
                  href={d.file_link} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="bg-[#1E3A8A] text-white px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 active:scale-95 transition-transform"
                >
                  Open
                </a>
              </div>
            ))
          )
        ) : (
          data.snags?.length === 0 ? (
            <div className="text-center py-12 bg-white/50 border border-zinc-200 border-dashed rounded-3xl mt-2">
              <span className="text-3xl mb-2 block">🛠️</span>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">No snags or defects reported</p>
            </div>
          ) : (
            data.snags?.map(s => (
              <div key={s.id} className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-3 active:scale-[0.99] transition-transform">
                <div>
                  <p className={`text-xs font-extrabold ${s.status === 'Resolved' ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>
                    {s.description}
                  </p>
                  <p className="text-[10px] text-zinc-400 font-bold mt-1">
                    Assignee: {s.assigned_to || 'Unassigned'}
                  </p>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-zinc-100">
                  {s.photo_link ? (
                    <a href={s.photo_link} target="_blank" rel="noreferrer" className="text-[10px] text-[#1E3A8A] font-black uppercase tracking-wider">
                      Photo Link
                    </a>
                  ) : (
                    <div></div>
                  )}

                  <div className="relative">
                    <select 
                      value={s.status} 
                      onChange={e => { updateSnagStatus(s.id, e.target.value); refresh(); }}
                      className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest outline-none appearance-none pr-6 ${
                        s.status === 'Resolved' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                      }`}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-[8px] text-zinc-400">▼</div>
                  </div>
                </div>
              </div>
            ))
          )
        )}
      </div>

      {/* DYNAMIC BOTTOM SHEET MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full h-[85vh] rounded-t-[2.5rem] shadow-2xl flex flex-col animate-in slide-in-from-bottom-full duration-300">
            
            {/* Modal Header */}
            <div className="px-6 pt-6 pb-4 border-b border-zinc-100 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-extrabold text-zinc-900">
                  {activeTab === 'DPR' ? 'Log Daily Progress' : activeTab === 'VAULT' ? 'Upload Document' : 'Log New Defect / Snag'}
                </h2>
                <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest mt-0.5">Site Operations Log</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center bg-zinc-100 text-zinc-600 rounded-full font-bold active:bg-zinc-200"
              >
                ✕
              </button>
            </div>

            {/* Modal Form Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {activeTab === 'DPR' && (
                <form id="siteForm" onSubmit={handleDprSubmit} className="space-y-4 pb-20">
                  <div>
                    <label className={labelClass}>Date</label>
                    <input type="date" required value={dprForm.date} onChange={e => setDprForm({...dprForm, date: e.target.value})} className={inputClass} />
                  </div>

                  <div>
                    <label className={labelClass}>Work Summary</label>
                    <textarea required placeholder="What was completed today?" value={dprForm.summary} onChange={e => setDprForm({...dprForm, summary: e.target.value})} className={`${inputClass} min-h-[90px] resize-none`} />
                  </div>

                  <div>
                    <label className={labelClass}>Materials Needed Tomorrow</label>
                    <input type="text" placeholder="e.g. 10 bags adhesive, 2 boxes screws" value={dprForm.materials} onChange={e => setDprForm({...dprForm, materials: e.target.value})} className={inputClass} />
                  </div>

                  <div>
                    <label className={labelClass}>Google Drive / Photo Link</label>
                    <input type="text" placeholder="https://drive.google.com/..." value={dprForm.photoLink} onChange={e => setDprForm({...dprForm, photoLink: e.target.value})} className={inputClass} />
                  </div>

                  <div>
                    <label className={labelClass}>Supervisor Name</label>
                    <input type="text" required placeholder="Supervisor name..." value={dprForm.loggedBy} onChange={e => setDprForm({...dprForm, loggedBy: e.target.value})} className={inputClass} />
                  </div>
                </form>
              )}

              {activeTab === 'VAULT' && (
                <form id="siteForm" onSubmit={handleDocSubmit} className="space-y-4 pb-20">
                  <div>
                    <label className={labelClass}>Document Title</label>
                    <input type="text" required placeholder="e.g. Kitchen Elevation Rev 2" value={docForm.title} onChange={e => setDocForm({...docForm, title: e.target.value})} className={inputClass} />
                  </div>

                  <div>
                    <label className={labelClass}>Document Type</label>
                    <div className="relative">
                      <select value={docForm.docType} onChange={e => setDocForm({...docForm, docType: e.target.value})} className={`${inputClass} appearance-none font-bold`}>
                        <option value="AutoCAD 2D">AutoCAD 2D</option>
                        <option value="3D Render">3D Render</option>
                        <option value="Contract / BOQ">Contract / BOQ</option>
                        <option value="Site Photos">Site Photos</option>
                        <option value="Other">Other</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">▼</div>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>File / Drive Link</label>
                    <input type="text" required placeholder="https://drive.google.com/..." value={docForm.fileLink} onChange={e => setDocForm({...docForm, fileLink: e.target.value})} className={inputClass} />
                  </div>

                  <div>
                    <label className={labelClass}>Uploaded By</label>
                    <input type="text" required placeholder="Your name..." value={docForm.uploadedBy} onChange={e => setDocForm({...docForm, uploadedBy: e.target.value})} className={inputClass} />
                  </div>
                </form>
              )}

              {activeTab === 'SNAGS' && (
                <form id="siteForm" onSubmit={handleSnagSubmit} className="space-y-4 pb-20">
                  <div>
                    <label className={labelClass}>Defect / Issue Description</label>
                    <textarea required placeholder="e.g. Master bedroom wardrobe left door misaligned" value={snagForm.description} onChange={e => setSnagForm({...snagForm, description: e.target.value})} className={`${inputClass} min-h-[90px] resize-none`} />
                  </div>

                  <div>
                    <label className={labelClass}>Assign To (Name or Agency)</label>
                    <input type="text" required placeholder="e.g. Ramesh Lead Carpenter" value={snagForm.assignedTo} onChange={e => setSnagForm({...snagForm, assignedTo: e.target.value})} className={inputClass} />
                  </div>

                  <div>
                    <label className={labelClass}>Photo Link (Optional)</label>
                    <input type="text" placeholder="https://..." value={snagForm.photoLink} onChange={e => setSnagForm({...snagForm, photoLink: e.target.value})} className={inputClass} />
                  </div>
                </form>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 pb-[calc(env(safe-area-inset-bottom,20px)+16px)] border-t border-zinc-100 bg-white shrink-0">
              <button 
                type="submit" 
                form="siteForm"
                className={`w-full py-4 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-lg active:scale-[0.98] transition-transform ${
                  activeTab === 'SNAGS' ? 'bg-red-600' : 'bg-[#1E3A8A]'
                }`}
              >
                {activeTab === 'DPR' ? 'Submit Daily Report' : activeTab === 'VAULT' ? 'Save Document' : 'Log Snag Defect'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}