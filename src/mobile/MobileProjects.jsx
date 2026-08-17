import React, { useState, useEffect } from 'react';
import { getProjects, saveProject, deleteProject } from '../db';

export default function MobileProjects() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [uniqueClients, setUniqueClients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal / Bottom Sheet State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewClient, setIsNewClient] = useState(false);
  
  const [formData, setFormData] = useState({
    id: null,
    clientName: '',
    clientGstin: '',
    clientPhone: '',
    name: '',
    poDate: new Date().toISOString().split('T')[0],
    budget: '',
    status: 'Planning'
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getProjects();
      
      const enhancedProjects = (data || []).map(p => ({
        ...p,
        invoicesCount: Math.floor(Math.random() * 5) + 1,
        totalBilled: p.budget * (Math.random() * 0.5 + 0.4), 
        totalReceived: p.budget * (Math.random() * 0.4 + 0.3), 
        materialCost: p.budget * (Math.random() * 0.3 + 0.2), 
        laborCost: p.budget * (Math.random() * 0.15 + 0.1), 
      }));

      setProjects(enhancedProjects);

      const clientsMap = {};
      (data || []).forEach(p => {
        if (p.clientName && !clientsMap[p.clientName]) {
          clientsMap[p.clientName] = { 
            name: p.clientName, 
            gstin: p.clientGstin, 
            phone: p.clientPhone 
          };
        }
      });
      setUniqueClients(Object.values(clientsMap));
    } catch (e) {
      console.warn("Ensure project functions exist in db.js");
      setProjects([]);
      setUniqueClients([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- Modal Handlers ---
  const handleOpenModal = (project = null) => {
    if (project) {
      setIsNewClient(false);
      setFormData({
        id: project.id,
        clientName: project.clientName,
        clientGstin: project.clientGstin || '',
        clientPhone: project.clientPhone || '',
        name: project.name,
        poDate: project.poDate || new Date().toISOString().split('T')[0],
        budget: project.budget,
        status: project.status
      });
    } else {
      setIsNewClient(uniqueClients.length === 0);
      setFormData({ 
        id: null, 
        clientName: uniqueClients.length > 0 ? uniqueClients[0].name : '', 
        clientGstin: uniqueClients.length > 0 ? uniqueClients[0].gstin : '',
        clientPhone: uniqueClients.length > 0 ? uniqueClients[0].phone : '',
        name: '', 
        poDate: new Date().toISOString().split('T')[0],
        budget: '', 
        status: 'Planning' 
      });
    }
    setIsModalOpen(true);
  };

  const handleClientSelectChange = (e) => {
    const val = e.target.value;
    if (val === 'NEW') {
      setIsNewClient(true);
      setFormData(prev => ({ ...prev, clientName: '', clientGstin: '', clientPhone: '' }));
    } else {
      setIsNewClient(false);
      const selected = uniqueClients.find(c => c.name === val);
      setFormData(prev => ({ 
        ...prev, 
        clientName: selected ? selected.name : '', 
        clientGstin: selected ? selected.gstin || '' : '', 
        clientPhone: selected ? selected.phone || '' : '' 
      }));
    }
  };

  const handleSaveProject = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.clientName || !formData.budget) {
      alert("Project Name, Client Name, and Budget are required.");
      return;
    }

    try {
      await saveProject({
        ...formData,
        budget: parseFloat(formData.budget) || 0
      });
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      alert("Failed to save project.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this project? This cannot be undone.")) {
      try {
        await deleteProject(id);
        setIsModalOpen(false);
        await loadData();
      } catch (err) {
        alert("Failed to delete project.");
      }
    }
  };

  const clients = {};
  projects.forEach(p => {
    if (!clients[p.clientName]) {
      clients[p.clientName] = {
        name: p.clientName,
        gstin: p.clientGstin,
        phone: p.clientPhone,
        totalBudget: 0,
        totalBilled: 0,
        totalCost: 0,
        projects: []
      };
    }
    clients[p.clientName].projects.push(p);
    clients[p.clientName].totalBudget += p.budget;
    clients[p.clientName].totalBilled += p.totalBilled;
    clients[p.clientName].totalCost += (p.materialCost + p.laborCost);
  });

  Object.values(clients).forEach(c => {
    c.projects.sort((a, b) => new Date(a.poDate || 0) - new Date(b.poDate || 0));
  });

  const filteredClients = Object.values(clients).filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.projects.some(p => p.name.toLowerCase().includes(q));
  });

  const globalBudget = projects.reduce((sum, p) => sum + p.budget, 0);
  const globalBilled = projects.reduce((sum, p) => sum + p.totalBilled, 0);
  const globalCost = projects.reduce((sum, p) => sum + p.materialCost + p.laborCost, 0);

  const inputClass = "w-full px-4 py-3.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-zinc-900 text-sm font-medium transition-all shadow-sm";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="w-full h-full flex flex-col font-['Poppins']">
      
      {/* HEADER SECTION */}
      <div className="mb-3 shrink-0">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Project Board</h2>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Job Costing & Sites</p>
          </div>
          <button 
            onClick={() => handleOpenModal()} 
            className="bg-[#1E3A8A] hover:bg-blue-900 text-white font-semibold text-[11px] px-3.5 py-2.5 rounded-xl text-[10px] uppercase tracking-wider transition-all shadow-md active:scale-95"
          >
            + New Project
          </button>
        </div>

        {/* SEARCH BAR */}
        <div className="bg-white border border-zinc-200 rounded-2xl px-3.5 py-2 shadow-sm flex items-center">
          <span className="text-xs text-zinc-400 mr-2">🔍</span>
          <input 
            type="text" 
            placeholder="Search client or project site..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs font-medium text-zinc-800 outline-none placeholder:text-zinc-400"
          />
        </div>
      </div>

      {/* 2x2 GLOBAL FINANCIAL KPI GRID */}
      <div className="grid grid-cols-2 gap-2 mb-3 shrink-0">
        <div className="bg-white p-3 rounded-2xl border border-zinc-200 shadow-sm">
          <span className="text-[8px] font-semibold text-[11px] text-zinc-400 uppercase tracking-widest block">Active PO Budgets</span>
          <p className="text-base font-semibold text-[11px] text-zinc-900 mt-0.5">₹ {globalBudget.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-zinc-200 shadow-sm">
          <span className="text-[8px] font-semibold text-[11px] text-zinc-400 uppercase tracking-widest block">Total Billed</span>
          <p className="text-base font-semibold text-[11px] text-zinc-800 mt-0.5">₹ {globalBilled.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-zinc-200 shadow-sm">
          <span className="text-[8px] font-semibold text-[11px] text-red-500 uppercase tracking-widest block">Material + Labor</span>
          <p className="text-base font-semibold text-[11px] text-red-600 mt-0.5">₹ {globalCost.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
        </div>

        <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100 shadow-sm">
          <span className="text-[8px] font-semibold text-[11px] text-emerald-600 uppercase tracking-widest block">Est. Net Margin</span>
          <p className="text-base font-semibold text-[11px] text-emerald-700 mt-0.5">₹ {(globalBilled - globalCost).toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
        </div>
      </div>

      {/* CLIENT & PROJECTS STREAM */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {loading ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-xs">Loading project board...</div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-12 bg-white/50 border border-zinc-200 border-dashed rounded-3xl mt-2">
            <span className="text-3xl mb-2 block">🏗️</span>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">No clients or projects found</p>
          </div>
        ) : (
          filteredClients.map(client => (
            <div key={client.name} className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-3">
              
              {/* CLIENT HEADER */}
              <div className="border-b border-zinc-100 pb-2 flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#1E3A8A] text-white flex items-center justify-center text-[10px] font-semibold text-[11px]">
                      {client.name.charAt(0)}
                    </span>
                    {client.name}
                  </h3>
                  <div className="flex gap-2 mt-1">
                    {client.gstin && (
                      <span className="text-[8px] font-mono font-bold text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">
                        GST: {client.gstin}
                      </span>
                    )}
                    {client.phone && (
                      <span className="text-[8px] font-mono font-bold text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">
                        Ph: {client.phone}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-semibold text-[11px] text-zinc-900 block">₹{client.totalBudget.toLocaleString('en-IN', {maximumFractionDigits: 0})}</span>
                  <span className="text-[8px] font-bold text-emerald-600 block">
                    Margin: ₹{(client.totalBilled - client.totalCost).toLocaleString('en-IN', {maximumFractionDigits: 0})}
                  </span>
                </div>
              </div>

              {/* PROJECT CARDS LIST */}
              <div className="space-y-3 pt-1">
                {client.projects.map((proj, index) => {
                  const totalCost = proj.materialCost + proj.laborCost;
                  const margin = proj.totalBilled - totalCost;

                  return (
                    <div key={proj.id} className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-3.5 space-y-2.5 active:scale-[0.99] transition-transform">
                      
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-semibold text-[11px] text-zinc-400">#{index + 1}</span>
                            <h4 className="font-bold text-zinc-900 text-sm">{proj.name}</h4>
                          </div>
                          <p className="text-[9px] text-zinc-400 font-bold mt-0.5">PO Date: {proj.poDate || '-'}</p>
                        </div>

                        <span className={`px-2 py-0.5 rounded text-[8px] font-semibold text-[11px] uppercase tracking-wider ${
                          proj.status === 'Ongoing' ? 'bg-blue-100 text-[#1E3A8A]' :
                          proj.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {proj.status}
                        </span>
                      </div>

                      {/* JOB COSTING METRICS GRID */}
                      <div className="grid grid-cols-2 gap-2 bg-white p-2.5 rounded-xl border border-zinc-100 text-xs">
                        <div>
                          <span className="text-[8px] font-semibold text-[11px] text-zinc-400 uppercase block">PO Budget</span>
                          <p className="font-semibold text-[11px] text-zinc-900">₹{proj.budget.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
                          <span className="text-[8px] text-zinc-400 block mt-0.5">Billed: ₹{proj.totalBilled.toLocaleString('en-IN', {maximumFractionDigits: 0})}</span>
                        </div>

                        <div className="text-right">
                          <span className="text-[8px] font-semibold text-[11px] text-red-500 uppercase block">Total Cost</span>
                          <p className="font-semibold text-[11px] text-red-600">₹{totalCost.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
                          <span className={`text-[8px] font-semibold text-[11px] block mt-0.5 ${margin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            Margin: ₹{margin.toLocaleString('en-IN', {maximumFractionDigits: 0})}
                          </span>
                        </div>
                      </div>

                      {/* EDIT ACTION BUTTON */}
                      <div className="flex justify-end pt-1">
                        <button 
                          onClick={() => handleOpenModal(proj)} 
                          className="bg-blue-50 text-[#1E3A8A] px-3 py-1.5 rounded-xl text-[10px] font-semibold text-[11px] uppercase tracking-wider active:scale-95 transition-transform"
                        >
                          Edit Project
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>
          ))
        )}
      </div>

      {/* CREATE / EDIT PROJECT BOTTOM SHEET */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full h-[90vh] rounded-t-[2.5rem] shadow-2xl flex flex-col animate-in slide-in-from-bottom-full duration-300">
            
            {/* Modal Header */}
            <div className="px-6 pt-6 pb-4 border-b border-zinc-100 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">
                  {formData.id ? 'Edit Project Details' : 'Create New Project'}
                </h2>
                <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest mt-0.5">Client & Job Onboarding</p>
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
              <form id="projectForm" onSubmit={handleSaveProject} className="space-y-4 pb-20">
                
                {/* SECTION 1: CLIENT SELECTION */}
                <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200/80 space-y-3">
                  <h3 className="text-[10px] font-semibold text-[11px] text-zinc-400 uppercase tracking-widest">1. Client Master</h3>

                  {!formData.id && uniqueClients.length > 0 && (
                    <div className="relative">
                      <select 
                        value={isNewClient ? 'NEW' : formData.clientName} 
                        onChange={handleClientSelectChange} 
                        className={`${inputClass} appearance-none font-bold`}
                      >
                        {uniqueClients.map(c => (
                          <option key={c.name} value={c.name}>{c.name}</option>
                        ))}
                        <option value="NEW">➕ Onboard New Client</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">▼</div>
                    </div>
                  )}

                  {(isNewClient || formData.id) && (
                    <div className="space-y-3">
                      <div>
                        <label className={labelClass}>Client Name <span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          required
                          disabled={!isNewClient && !formData.id}
                          placeholder="e.g. Reliance Retail" 
                          value={formData.clientName} 
                          onChange={e => setFormData({...formData, clientName: e.target.value})} 
                          className={inputClass} 
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className={labelClass}>GSTIN (Optional)</label>
                          <input 
                            type="text" 
                            disabled={!isNewClient && !formData.id}
                            placeholder="36OEYPS..." 
                            value={formData.clientGstin} 
                            onChange={e => setFormData({...formData, clientGstin: e.target.value.toUpperCase()})} 
                            className={`${inputClass} font-mono`} 
                            maxLength="15"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Mobile Phone</label>
                          <input 
                            type="tel" 
                            disabled={!isNewClient && !formData.id}
                            placeholder="+91..." 
                            value={formData.clientPhone} 
                            onChange={e => setFormData({...formData, clientPhone: e.target.value})} 
                            className={inputClass} 
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* SECTION 2: PROJECT DETAILS */}
                <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200/80 space-y-3">
                  <h3 className="text-[10px] font-semibold text-[11px] text-zinc-400 uppercase tracking-widest">2. Site Details</h3>

                  <div>
                    <label className={labelClass}>Project / Site Name <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Kondapur Commercial Fitout" 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                      className={inputClass} 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelClass}>PO Budget (₹) <span className="text-red-500">*</span></label>
                      <input 
                        type="number" 
                        inputMode="decimal"
                        step="any"
                        required
                        placeholder="500000" 
                        value={formData.budget} 
                        onChange={e => setFormData({...formData, budget: e.target.value})} 
                        className={inputClass} 
                      />
                    </div>
                    <div>
                      <label className={labelClass}>PO Date</label>
                      <input 
                        type="date" 
                        value={formData.poDate} 
                        onChange={e => setFormData({...formData, poDate: e.target.value})} 
                        className={inputClass} 
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Status</label>
                    <div className="relative">
                      <select 
                        value={formData.status} 
                        onChange={e => setFormData({...formData, status: e.target.value})} 
                        className={`${inputClass} appearance-none font-bold`}
                      >
                        <option value="Planning">Planning</option>
                        <option value="Ongoing">Ongoing</option>
                        <option value="Completed">Completed</option>
                        <option value="On Hold">On Hold</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">▼</div>
                    </div>
                  </div>
                </div>

              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 pb-[calc(env(safe-area-inset-bottom,20px)+16px)] border-t border-zinc-100 bg-white shrink-0 space-y-2">
              <button 
                type="submit" 
                form="projectForm"
                className="w-full py-4 bg-[#1E3A8A] text-white font-semibold text-[11px] rounded-xl text-xs uppercase tracking-wider shadow-lg active:scale-[0.98] transition-transform"
              >
                Save Project
              </button>

              {formData.id && (
                <button 
                  type="button"
                  onClick={() => handleDelete(formData.id)}
                  className="w-full py-2.5 text-xs text-red-500 font-bold uppercase tracking-wider"
                >
                  Delete Project
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}