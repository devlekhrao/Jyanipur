import React, { useState, useEffect } from 'react';
import { getSnags, saveSnag, updateSnagStatus, deleteSnag, getProjects, getSubcontractors } from '../db';
import { sendWhatsAppMessage } from '../WhatsAppHelper';

export default function MobileSiteSnag({ companySettings = {} }) {
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
    const matchesProj = selectedProject === 'All' || s.projectId === Number(selectedProject);
    return matchesStatus && matchesProj;
  });

  const openCount = snags.filter(s => s.status === 'Open').length;
  const inProgressCount = snags.filter(s => s.status === 'In Progress').length;
  const resolvedCount = snags.filter(s => s.status === 'Resolved').length;

  const inputClass = "w-full px-4 py-3.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-zinc-900 text-sm font-medium transition-all shadow-sm";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="w-full h-full flex flex-col font-sans">
      
      {/* HEADER SECTION */}
      <div className="mb-3 shrink-0">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Site Snag List</h2>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Defects & Quality Control</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[#1E3A8A] hover:bg-blue-900 text-white font-semibold text-[11px] px-3.5 py-2.5 rounded-xl text-[10px] uppercase tracking-wider transition-all shadow-md active:scale-95"
          >
            + Add Snag
          </button>
        </div>

        {/* SITE FILTER SELECTOR */}
        <div className="relative mb-2">
          <select 
            value={selectedProject} 
            onChange={e => setSelectedProject(e.target.value)}
            className="w-full bg-white border border-zinc-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-zinc-800 outline-none shadow-sm appearance-none pr-8"
          >
            <option value="All">All Sites Filter</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400 text-xs">▼</div>
        </div>

        {/* SWIPEABLE STATUS SEGMENTED CONTROL */}
        <div className="flex bg-zinc-200/80 p-1 rounded-2xl gap-1">
          {['All', 'Open', 'In Progress', 'Resolved'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`flex-1 py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all truncate ${
                activeFilter === tab ? 'bg-white text-[#1E3A8A] shadow-sm' : 'text-zinc-500'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* KPI METRICS STRIP */}
      <div className="grid grid-cols-3 gap-2 mb-3 shrink-0">
        <div className="bg-red-50 p-2.5 rounded-2xl border border-red-100 shadow-sm text-center">
          <span className="text-[8px] font-semibold text-[11px] text-red-500 uppercase tracking-widest block">Open</span>
          <p className="text-base font-semibold text-[11px] text-red-700 mt-0.5">{openCount}</p>
        </div>

        <div className="bg-amber-50 p-2.5 rounded-2xl border border-amber-100 shadow-sm text-center">
          <span className="text-[8px] font-semibold text-[11px] text-amber-600 uppercase tracking-widest block">In Progress</span>
          <p className="text-base font-semibold text-[11px] text-amber-700 mt-0.5">{inProgressCount}</p>
        </div>

        <div className="bg-emerald-50 p-2.5 rounded-2xl border border-emerald-100 shadow-sm text-center">
          <span className="text-[8px] font-semibold text-[11px] text-emerald-600 uppercase tracking-widest block">Resolved</span>
          <p className="text-base font-semibold text-[11px] text-emerald-700 mt-0.5">{resolvedCount}</p>
        </div>
      </div>

      {/* SNAG CARDS STREAM */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {loading ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-xs">Loading quality defects...</div>
        ) : filteredSnags.length === 0 ? (
          <div className="text-center py-12 bg-white/50 border border-zinc-200 border-dashed rounded-3xl mt-2">
            <span className="text-3xl mb-2 block">✅</span>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">No quality defects found</p>
          </div>
        ) : (
          filteredSnags.map(snag => (
            <div 
              key={snag.id} 
              className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-3 active:scale-[0.99] transition-transform"
            >
              {/* CARD HEADER */}
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[9px] font-bold text-[#1E3A8A] uppercase tracking-wider block">
                    {snag.projectName || 'General Site'}
                  </span>
                  <h4 className="font-bold text-zinc-900 text-sm mt-0.5">{snag.title}</h4>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[8px] font-semibold text-[11px] uppercase px-2 py-0.5 rounded ${
                    snag.priority === 'High' ? 'bg-red-100 text-red-600' : 'bg-zinc-100 text-zinc-600'
                  }`}>
                    {snag.priority}
                  </span>
                  <button 
                    onClick={() => handleDelete(snag.id)}
                    className="text-zinc-300 hover:text-red-500 text-xs font-bold p-0.5"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* DESCRIPTION & PHOTO */}
              {snag.description && (
                <p className="text-xs text-zinc-600 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                  {snag.description}
                </p>
              )}

              {snag.photoUrl && (
                <div className="rounded-xl overflow-hidden border border-zinc-200 max-h-36 bg-zinc-50">
                  <img src={snag.photoUrl} alt="Snag Photo" className="w-full h-full object-cover" />
                </div>
              )}

              {/* ASSIGNEE & ACTIONS */}
              <div className="pt-2 border-t border-zinc-100 flex justify-between items-center text-xs">
                <span className="text-[10px] font-bold text-zinc-500">
                  🧑 {snag.subcontractor || 'Unassigned'}
                </span>

                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => notifySubcontractor(snag)}
                    className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-xl text-[9px] font-semibold text-[11px] uppercase tracking-wider active:scale-95 transition-transform"
                  >
                    💬 WA
                  </button>

                  <div className="relative">
                    <select 
                      value={snag.status} 
                      onChange={e => handleStatusChange(snag.id, e.target.value)}
                      className={`text-[9px] font-semibold text-[11px] uppercase tracking-wider px-2 py-1 rounded-xl border outline-none appearance-none pr-5 ${
                        snag.status === 'Resolved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        snag.status === 'In Progress' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-red-50 text-red-700 border-red-200'
                      }`}
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-[8px] text-zinc-400">▼</div>
                  </div>
                </div>
              </div>

            </div>
          ))
        )}
      </div>

      {/* CREATE SNAG BOTTOM SHEET */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full h-[85vh] rounded-t-[2.5rem] shadow-2xl flex flex-col animate-in slide-in-from-bottom-full duration-300">
            
            {/* Modal Header */}
            <div className="px-6 pt-6 pb-4 border-b border-zinc-100 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">Report Defect / Snag</h2>
                <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest mt-0.5">Quality Control Log</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center bg-zinc-100 text-zinc-600 rounded-full font-bold active:bg-zinc-200"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <form id="snagForm" onSubmit={handleSave} className="space-y-4 pb-20">
                
                <div>
                  <label className={labelClass}>Project Site <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select 
                      required 
                      value={formData.projectId} 
                      onChange={e => setFormData({...formData, projectId: e.target.value})} 
                      className={`${inputClass} appearance-none font-bold`}
                    >
                      <option value="" disabled>Select Project Site...</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">▼</div>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Defect Title <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Wardrobe door laminate peeling" 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})} 
                    className={inputClass} 
                  />
                </div>

                <div>
                  <label className={labelClass}>Details & Action Required</label>
                  <textarea 
                    placeholder="Re-apply adhesive and clamp overnight..." 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                    className={`${inputClass} min-h-[80px] resize-none`} 
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>Assign Worker / Sub</label>
                    <div className="relative">
                      <select 
                        value={formData.subcontractor} 
                        onChange={e => setFormData({...formData, subcontractor: e.target.value})} 
                        className={`${inputClass} appearance-none`}
                      >
                        <option value="">Select Worker...</option>
                        {subcontractors.map(s => <option key={s.id} value={s.name}>{s.name} ({s.trade})</option>)}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">▼</div>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Priority</label>
                    <div className="relative">
                      <select 
                        value={formData.priority} 
                        onChange={e => setFormData({...formData, priority: e.target.value})} 
                        className={`${inputClass} appearance-none font-bold`}
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High (Handover)</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">▼</div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Defect Photo</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handlePhotoUpload} 
                    className="w-full text-xs text-zinc-600 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#1E3A8A] file:text-white cursor-pointer" 
                  />
                </div>

              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 pb-[calc(env(safe-area-inset-bottom,20px)+16px)] border-t border-zinc-100 bg-white shrink-0">
              <button 
                type="submit" 
                form="snagForm"
                className="w-full py-4 bg-[#1E3A8A] text-white font-semibold text-[11px] rounded-xl text-xs uppercase tracking-wider shadow-lg active:scale-[0.98] transition-transform"
              >
                Save Quality Defect
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}