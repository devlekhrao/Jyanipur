import React, { useState, useEffect } from 'react';
import { getSnags, saveSnag, updateSnagStatus, deleteSnag, getProjects, getSubcontractors } from '.../db';
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
    const matchesProj = selectedProject === 'All' || s.projectId === Number(selectedProject);
    return matchesStatus && matchesProj;
  });

  const openCount = snags.filter(s => s.status === 'Open').length;
  const inProgressCount = snags.filter(s => s.status === 'In Progress').length;
  const resolvedCount = snags.filter(s => s.status === 'Resolved').length;

  const inputClass = "w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-zinc-900 text-xs font-medium transition-all shadow-sm";
  const labelClass = "block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="w-full h-full font-['Poppins'] flex flex-col">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-4 border-b border-zinc-200 mb-6 gap-4 shrink-0 print:hidden">
        <div>
          <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Site Snag & Quality Punch List</h2>
          <p className="text-zinc-500 text-xs mt-1 font-medium">Log handover defects, assign subcontractors, and track resolution.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer">
            🖨️ Handover Report (PDF)
          </button>
          <button onClick={() => setIsModalOpen(true)} className="bg-[#1E3A8A] hover:bg-blue-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer">
            + Add Snag Defect
          </button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 shrink-0 print:hidden">
        <div className="bg-red-50/70 border border-red-200 p-6 rounded-[2rem] flex justify-between items-center shadow-sm">
          <div><span className="text-[9px] font-extrabold text-red-500 uppercase tracking-widest block">Open Snags</span><p className="text-2xl font-black text-red-700">{openCount}</p></div>
          <span className="text-2xl">⚠️</span>
        </div>
        <div className="bg-amber-50/70 border border-amber-200 p-6 rounded-[2rem] flex justify-between items-center shadow-sm">
          <div><span className="text-[9px] font-extrabold text-amber-600 uppercase tracking-widest block">In Progress</span><p className="text-2xl font-black text-amber-700">{inProgressCount}</p></div>
          <span className="text-2xl">🛠️</span>
        </div>
        <div className="bg-emerald-50/70 border border-emerald-200 p-6 rounded-[2rem] flex justify-between items-center shadow-sm">
          <div><span className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-widest block">Resolved Handovers</span><p className="text-2xl font-black text-emerald-700">{resolvedCount}</p></div>
          <span className="text-2xl">✅</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-6 shrink-0 print:hidden">
        <div className="flex bg-zinc-100 p-1.5 rounded-2xl">
          {['All', 'Open', 'In Progress', 'Resolved'].map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveFilter(tab)} 
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeFilter === tab ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">Site:</span>
          <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} className="bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-800 outline-none cursor-pointer shadow-sm">
            <option value="All">All Sites</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {/* Snags Grid */}
      {loading ? (
        <div className="py-20 text-center text-zinc-400 font-medium text-xs flex-1">Loading quality defects...</div>
      ) : filteredSnags.length === 0 ? (
        <div className="bg-white border border-dashed border-zinc-200 rounded-[2rem] p-12 text-center text-zinc-400 text-xs font-medium flex-1 flex items-center justify-center">
          No quality snags reported. Click "+ Add Snag Defect" to log site issues.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] print:block">
          {filteredSnags.map(snag => (
            <div key={snag.id} className="bg-white border border-zinc-200 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative print:mb-4 print:border-b print:shadow-none">
              <button onClick={() => handleDelete(snag.id)} className="absolute top-3 right-3 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-sm cursor-pointer print:hidden">&times;</button>
              
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[9px] font-extrabold text-[#1E3A8A] uppercase tracking-widest">{snag.projectName || 'General Site'}</span>
                  <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-md ${snag.priority === 'High' ? 'bg-red-100 text-red-600' : 'bg-zinc-100 text-zinc-600'}`}>
                    {snag.priority} Priority
                  </span>
                </div>

                <h4 className="font-extrabold text-zinc-900 text-base mb-1">{snag.title}</h4>
                {snag.description && <p className="text-xs text-zinc-500 mb-3 leading-relaxed">{snag.description}</p>}

                {snag.photoUrl && (
                  <div className="mb-4 rounded-xl overflow-hidden border border-zinc-200 max-h-40 bg-zinc-50 flex items-center justify-center">
                    <img src={snag.photoUrl} alt="Snag Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-zinc-100 space-y-3 mt-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase">Assigned Worker:</span>
                  <span className="font-bold text-zinc-800">🧑 {snag.subcontractor || 'Unassigned'}</span>
                </div>

                <div className="flex justify-between items-center gap-2 print:hidden">
                  <button onClick={() => notifySubcontractor(snag)} className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer">
                    💬 WhatsApp Task
                  </button>

                  <select 
                    value={snag.status} 
                    onChange={e => handleStatusChange(snag.id, e.target.value)} 
                    className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-1.5 rounded-xl border outline-none cursor-pointer ${
                      snag.status === 'Resolved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      snag.status === 'In Progress' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-red-50 text-red-700 border-red-200'
                    }`}
                  >
                    <option value="Open">Status: Open</option>
                    <option value="In Progress">Status: In Progress</option>
                    <option value="Resolved">Status: Resolved</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-extrabold text-zinc-900 mb-1">Report Quality Snag</h2>
            <p className="text-zinc-500 text-[10px] font-bold mb-6 uppercase tracking-widest">Handover Punch List</p>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className={labelClass}>Project Site <span className="text-red-500">*</span></label>
                <select required value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value})} className={`${inputClass} cursor-pointer`}>
                  <option value="">Select Project Site...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div>
                <label className={labelClass}>Defect Title <span className="text-red-500">*</span></label>
                <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Laminate peeling on master bed wardrobe" className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Details / Instructions</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Re-apply Fevicol and clamp overnight..." className={`${inputClass} resize-none h-16`} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Assign Subcontractor</label>
                  <select value={formData.subcontractor} onChange={e => setFormData({...formData, subcontractor: e.target.value})} className={`${inputClass} cursor-pointer`}>
                    <option value="">Select Trade Worker...</option>
                    {subcontractors.map(s => <option key={s.id} value={s.name}>{s.name} ({s.trade})</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Priority</label>
                  <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} className={`${inputClass} cursor-pointer`}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High (Critical Handover)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Attach Defect Photo</label>
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="w-full text-xs text-zinc-600 file:mr-4 file:py-2.5 px-1 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#1E3A8A] file:text-white hover:file:bg-blue-900 cursor-pointer" />
              </div>

              <div className="flex gap-3 pt-6 border-t border-zinc-100 mt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all cursor-pointer">Cancel</button>
                <button type="submit" className="flex-1 py-3.5 bg-[#1E3A8A] hover:bg-blue-900 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all shadow-md cursor-pointer">Save Defect Snag</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}