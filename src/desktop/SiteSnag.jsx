import React, { useState, useEffect } from 'react';
import { getSnags, saveSnag, updateSnagStatus, deleteSnag, getProjects, getSubcontractors } from '../db';
import { sendWhatsAppMessage } from '../WhatsAppHelper';

export default function SiteSnag({ companySettings = {} }) {
  const [loading, setLoading] = useState(true);
  const [snags, setSnags] = useState([]);
  const [projects, setProjects] = useState([]);
  const [subcontractors, setSubcontractors] = useState([]);
  
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedProject, setSelectedProject] = useState('All');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    projectId: '', title: '', description: '', subcontractor: '', priority: 'Medium', status: 'Open', photoUrl: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [snagData, projData, subData] = await Promise.all([getSnags(), getProjects(), getSubcontractors()]);
      setSnags(snagData || []);
      setProjects(projData || []);
      setSubcontractors(subData || []);
    } catch (e) {
      console.warn("Ensure snag functions exist in db.js");
      setSnags([]);
      setProjects([]);
      setSubcontractors([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photoUrl: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.projectId) {
      alert("Please select a project site.");
      return;
    }
    await saveSnag(formData);
    setIsModalOpen(false);
    setFormData({ projectId: '', title: '', description: '', subcontractor: '', priority: 'Medium', status: 'Open', photoUrl: '' });
    await loadData();
  };

  const handleStatusChange = async (id, newStatus) => {
    await updateSnagStatus(id, newStatus);
    await loadData();
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this defect snag?")) {
      await deleteSnag(id);
      await loadData();
    }
  };

  const notifySubcontractor = (snag) => {
    const sub = subcontractors.find(s => s.name === snag.subcontractor);
    const phone = sub ? sub.phone : '';
    const msg = `*QUALITY DEFECT NOTICE - ${companySettings.companyName || 'Jyanipur Interiors'}*\n\n` +
                `Site: *${snag.projectName}*\n` +
                `Defect: *${snag.title}*\n` +
                `Priority: *${snag.priority}*\n` +
                `Details: ${snag.description || 'N/A'}\n\n` +
                `Please visit the site and clear this defect immediately.`;
    
    sendWhatsAppMessage(phone, msg);
  };

  const filteredSnags = snags.filter(s => {
    const matchesStatus = activeFilter === 'All' || s.status === activeFilter;
    const matchesProj = selectedProject === 'All' || String(s.projectId) === String(selectedProject);
    return matchesStatus && matchesProj;
  });

  const openCount = snags.filter(s => s.status === 'Open').length;
  const inProgressCount = snags.filter(s => s.status === 'In Progress').length;
  const resolvedCount = snags.filter(s => s.status === 'Resolved').length;

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-inset focus:ring-[#B45309] text-zinc-900 text-sm font-medium transition-all shadow-sm disabled:opacity-75 disabled:cursor-not-allowed";
  const labelClass = "block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 ml-0.5";

  return (
    <div className="w-full h-full flex flex-col" style={{ fontFamily: 'Poppins, sans-serif' }}>
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 mb-6 border-b border-zinc-200 shrink-0 gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Site Snag & Quality Punch List</h2>
          <p className="text-zinc-500 text-sm mt-0.5 font-medium">Log handover defects, assign subcontractors, and track resolution.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => window.print()} className="bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer flex items-center gap-1.5 h-10">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0v-2.25a2.25 2.25 0 012.25-2.25h6a2.25 2.25 0 012.25 2.25v2.25z" /></svg>
            Handover Report
          </button>
          <button onClick={() => setIsModalOpen(true)} className="bg-[#B45309] hover:bg-[#92400E] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer flex items-center gap-1.5 h-10">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Add Snag Defect
          </button>
        </div>
      </div>

      {/* KPI COUNTERS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 shrink-0 print:hidden">
        <div className="bg-white border border-red-200/80 p-5 rounded-2xl flex justify-between items-center shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest block mb-1">Open Snags</span>
            <p className="text-xl font-bold text-red-600">{openCount}</p>
          </div>
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600 text-lg">⚠️</div>
        </div>

        <div className="bg-white border border-amber-200/80 p-5 rounded-2xl flex justify-between items-center shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest block mb-1">In Progress</span>
            <p className="text-xl font-bold text-amber-600">{inProgressCount}</p>
          </div>
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 text-lg">🛠️</div>
        </div>

        <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl flex justify-between items-center shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block mb-1">Resolved Handovers</span>
            <p className="text-xl font-bold text-emerald-700">{resolvedCount}</p>
          </div>
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 text-lg shadow-xs">✅</div>
        </div>
      </div>

      {/* FILTER TABS & SITE SELECTOR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0 print:hidden">
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-zinc-200">
          {['All', 'Open', 'In Progress', 'Resolved'].map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveFilter(tab)} 
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeFilter === tab ? 'bg-[#B45309] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Site:</span>
          <select 
            value={selectedProject} 
            onChange={e => setSelectedProject(e.target.value)} 
            className="bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-800 outline-none cursor-pointer shadow-sm appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.8rem_center] bg-[length:1rem_1rem] pr-8"
          >
            <option value="All">All Sites</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {/* SNAGS GRID */}
      {loading ? (
        <div className="py-20 text-center text-zinc-400 font-medium text-sm flex flex-col items-center justify-center space-y-3 flex-1">
          <div className="w-10 h-10 border-4 border-zinc-200 border-t-[#B45309] rounded-full animate-spin"></div>
          <p>Loading quality defects...</p>
        </div>
      ) : filteredSnags.length === 0 ? (
        <div className="bg-white border border-dashed border-zinc-200 rounded-2xl p-12 text-center text-zinc-400 text-sm font-medium flex-1 flex items-center justify-center">
          No quality snags reported. Click "+ Add Snag Defect" to log site issues.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] print:block">
          {filteredSnags.map(snag => (
            <div key={snag.id} className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative print:mb-4 print:border-b print:shadow-none">
              <button 
                onClick={() => handleDelete(snag.id)} 
                className="absolute top-3 right-3 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer print:hidden"
                title="Delete Defect"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              
              <div>
                <div className="flex justify-between items-start mb-2 pr-6">
                  <span className="text-[10px] font-bold text-[#B45309] uppercase tracking-wider bg-amber-50 border border-amber-100 px-2 py-0.5 rounded">
                    {snag.projectName || 'General Site'}
                  </span>
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                    snag.priority === 'High' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-zinc-100 text-zinc-600'
                  }`}>
                    {snag.priority} Priority
                  </span>
                </div>

                <h4 className="font-bold text-zinc-900 text-base mb-1">{snag.title}</h4>
                {snag.description && <p className="text-xs text-zinc-500 mb-3 leading-relaxed">{snag.description}</p>}

                {snag.photoUrl && (
                  <div className="mb-4 rounded-xl overflow-hidden border border-zinc-200 h-36 bg-zinc-50 flex items-center justify-center">
                    <img src={snag.photoUrl} alt="Snag Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-zinc-100 space-y-3 mt-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[10px] font-semibold text-zinc-400 uppercase">Assigned Worker:</span>
                  <span className="font-semibold text-zinc-800">{snag.subcontractor || 'Unassigned'}</span>
                </div>

                <div className="flex justify-between items-center gap-2 print:hidden">
                  <button onClick={() => notifySubcontractor(snag)} className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 rounded-lg font-semibold cursor-pointer text-[10px] uppercase tracking-wider transition-all flex items-center gap-1">
                    💬 WhatsApp Task
                  </button>

                  <select 
                    value={snag.status} 
                    onChange={e => handleStatusChange(snag.id, e.target.value)} 
                    className={`appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23A1A1AA%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%223%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.6rem_center] bg-[length:0.8rem_0.8rem] pr-7 pl-3 py-1.5 rounded-full border outline-none cursor-pointer transition-all text-[10px] font-semibold uppercase tracking-wider ${
                      snag.status === 'Resolved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      snag.status === 'In Progress' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-red-50 text-red-700 border-red-200'
                    }`}
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL FORM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-5 border-b border-zinc-200 flex justify-between items-center bg-zinc-50 shrink-0">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900">Report Quality Snag</h2>
                <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mt-0.5">Handover Punch List</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <form id="snagForm" onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className={labelClass}>Project Site <span className="text-red-500">*</span></label>
                  <select 
                    required 
                    value={formData.projectId} 
                    onChange={e => setFormData({...formData, projectId: e.target.value})} 
                    className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
                  >
                    <option value="" disabled>Select Project Site...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Defect Title <span className="text-red-500">*</span></label>
                  <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Laminate peeling on master bed wardrobe" className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>Details / Instructions</label>
                  <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Re-apply adhesive and clamp overnight..." className={`${inputClass} resize-y min-h-[70px]`} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Assign Subcontractor</label>
                    <select 
                      value={formData.subcontractor} 
                      onChange={e => setFormData({...formData, subcontractor: e.target.value})} 
                      className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
                    >
                      <option value="">Select Trade Worker...</option>
                      {subcontractors.map(s => <option key={s.id} value={s.name}>{s.name} ({s.trade})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Priority</label>
                    <select 
                      value={formData.priority} 
                      onChange={e => setFormData({...formData, priority: e.target.value})} 
                      className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High (Critical Handover)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Attach Defect Photo</label>
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="w-full text-sm text-zinc-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#B45309] file:text-white hover:file:bg-[#92400E] cursor-pointer" />
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-zinc-200 flex justify-end gap-3 bg-zinc-50 shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-semibold rounded-xl text-sm transition-all cursor-pointer">
                Cancel
              </button>
              <button type="submit" form="snagForm" className="px-6 py-2.5 bg-[#B45309] hover:bg-[#92400E] text-white font-medium rounded-xl text-sm shadow-sm transition-all cursor-pointer">
                Save Defect Snag
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}