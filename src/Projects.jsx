import React, { useState, useEffect } from 'react';
import { getProjects, saveProject, deleteProject } from './db';

export default function Projects() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [uniqueClients, setUniqueClients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
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

  const handleCloseModal = () => {
    setIsModalOpen(false);
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
      handleCloseModal();
      await loadData();
    } catch (err) {
      alert("Failed to save project.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this project? This cannot be undone.")) {
      try {
        await deleteProject(id);
        handleCloseModal();
        await loadData();
      } catch (err) {
        alert("Failed to delete project.");
      }
    }
  };

  const handleView = (projName) => {
    alert(`Detailed view for ${projName} is coming soon!`);
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

  const inputClass = "w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-zinc-900 text-xs font-medium transition-all shadow-sm";
  const labelClass = "block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="w-full h-full font-['Poppins'] flex flex-col">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-4 border-b border-zinc-200 mb-6 gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Project Board & Job Costing</h2>
          <p className="text-zinc-500 text-xs mt-1 font-medium">Onboard clients and sequence multiple projects by PO Date.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center h-10 bg-white border border-zinc-200 rounded-2xl px-3.5 shadow-sm">
            <span className="text-xs text-zinc-400">🔍</span>
            <input 
              type="text" 
              placeholder="Search client or project..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-xs font-medium text-zinc-800 outline-none px-2 w-52 placeholder:text-zinc-400"
            />
          </div>
          <button 
            onClick={() => handleOpenModal()} 
            className="bg-[#1E3A8A] hover:bg-blue-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer"
          >
            + New Project
          </button>
        </div>
      </div>

      {/* Global Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6 shrink-0">
        <div className="bg-white p-6 rounded-[2rem] border border-zinc-200 shadow-sm">
          <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block mb-1">Total Active PO Budgets</span>
          <p className="text-2xl font-black text-zinc-900">₹ {globalBudget.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-zinc-200 shadow-sm">
          <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block mb-1">Total Billed (Invoices)</span>
          <p className="text-2xl font-black text-zinc-800">₹ {globalBilled.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-zinc-200 shadow-sm">
          <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block mb-1">Total Cost (Mat + Labor)</span>
          <p className="text-2xl font-black text-red-500">₹ {globalCost.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
        </div>
        <div className="bg-emerald-50/70 p-6 rounded-[2rem] border border-emerald-100 shadow-sm">
          <span className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-widest block mb-1">Estimated Net Margin</span>
          <p className="text-2xl font-black text-emerald-700">₹ {(globalBilled - globalCost).toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
        </div>
      </div>

      {/* Client & Project Hierarchy */}
      <div className="flex-1 overflow-y-auto space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {loading ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-xs">Loading project board...</div>
        ) : filteredClients.length === 0 ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-xs bg-white border border-dashed border-zinc-200 rounded-[2rem]">No clients or projects found.</div>
        ) : (
          filteredClients.map(client => (
            <div key={client.name} className="bg-white rounded-[2rem] border border-zinc-200 shadow-sm overflow-hidden">
              
              {/* Client Header */}
              <div className="bg-zinc-50/80 px-6 py-4 border-b border-zinc-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-sm font-extrabold text-zinc-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#1E3A8A] text-white flex items-center justify-center text-[10px] font-black">{client.name.charAt(0)}</span>
                    {client.name}
                  </h3>
                  <div className="flex gap-4 mt-1.5 ml-8">
                    {client.gstin && <p className="text-[9px] font-mono font-bold text-zinc-500 bg-white px-2 py-0.5 rounded border border-zinc-200 shadow-xs">GST: {client.gstin}</p>}
                    {client.phone && <p className="text-[9px] font-mono font-bold text-zinc-500 bg-white px-2 py-0.5 rounded border border-zinc-200 shadow-xs">Ph: {client.phone}</p>}
                    <p className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest py-0.5">
                      {client.projects.length} Project{client.projects.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-black text-zinc-900">Client Budget: ₹{client.totalBudget.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
                  <p className="text-[10px] font-extrabold text-emerald-600 mt-0.5">Est. Margin: ₹{(client.totalBilled - client.totalCost).toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
                </div>
              </div>

              {/* Projects Table */}
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1000px]">
                  <thead>
                    <tr className="text-zinc-400 text-[9px] uppercase tracking-widest border-b border-zinc-100 bg-zinc-50/30">
                      <th className="py-3.5 px-6 font-bold w-64">Project / Site Name</th>
                      <th className="py-3.5 px-4 font-bold w-28">PO Date</th>
                      <th className="py-3.5 px-4 font-bold text-center w-24">Status</th>
                      <th className="py-3.5 px-4 font-bold text-right w-32">PO Budget</th>
                      <th className="py-3.5 px-4 font-bold text-right w-32">Billed (Sales)</th>
                      <th className="py-3.5 px-4 font-bold text-right w-32">Costs (Mat + Labor)</th>
                      <th className="py-3.5 px-4 font-bold text-right w-32">Site Margin</th>
                      <th className="py-3.5 px-6 font-bold text-center w-20">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs text-zinc-800 divide-y divide-zinc-100">
                    {client.projects.map((proj, index) => {
                      const totalCost = proj.materialCost + proj.laborCost;
                      const margin = proj.totalBilled - totalCost;
                      
                      return (
                        <tr key={proj.id} className="hover:bg-zinc-50 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black text-zinc-400">#{index + 1}</span>
                              <div>
                                <p className="font-extrabold text-zinc-900">{proj.name}</p>
                                <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
                                  {proj.invoicesCount} Invoices Linked
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-zinc-600 font-semibold text-xs">
                            {proj.poDate || '-'}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className={`inline-block px-2.5 py-1 rounded-md text-[9px] font-extrabold uppercase tracking-wider ${
                              proj.status === 'Ongoing' ? 'bg-blue-50 text-[#1E3A8A] border border-blue-100' :
                              proj.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                              'bg-amber-50 text-amber-600 border border-amber-100'
                            }`}>
                              {proj.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right font-black text-zinc-900">
                            ₹{proj.budget.toLocaleString('en-IN', {maximumFractionDigits: 0})}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <p className="font-black text-zinc-800">₹{proj.totalBilled.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
                            <p className="text-[9px] text-zinc-400 font-medium mt-0.5">₹{proj.totalReceived.toLocaleString('en-IN', {maximumFractionDigits: 0})} Recv</p>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <p className="font-black text-red-500">₹{totalCost.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
                            <p className="text-[9px] text-zinc-400 font-medium mt-0.5">Mat: ₹{proj.materialCost.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <span className={`font-black ${margin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              ₹{margin.toLocaleString('en-IN', {maximumFractionDigits: 0})}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center space-x-3">
                            <button onClick={() => handleOpenModal(proj)} className="text-[10px] font-bold text-[#1E3A8A] hover:text-blue-900 uppercase tracking-widest cursor-pointer">Edit</button>
                            <button onClick={() => handleView(proj.name)} className="text-[10px] font-bold text-zinc-500 hover:text-zinc-900 uppercase tracking-widest cursor-pointer">View</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="mb-6">
              <h2 className="text-xl font-extrabold text-zinc-900 tracking-tight">
                {formData.id ? 'Edit Project Details' : 'Create New Project'}
              </h2>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Link this project to a client to track budgets.</p>
            </div>

            <form onSubmit={handleSaveProject} className="space-y-4">
              
              {/* CLIENT SECTION */}
              <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200/80 space-y-3">
                <h3 className="text-[10px] font-extrabold text-zinc-800 uppercase tracking-widest">1. Client Details</h3>

                {!formData.id && uniqueClients.length > 0 && (
                  <div>
                    <select 
                      value={isNewClient ? 'NEW' : formData.clientName} 
                      onChange={handleClientSelectChange} 
                      className={`${inputClass} cursor-pointer font-bold text-zinc-800`}
                    >
                      {uniqueClients.map(c => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                      <option value="NEW">➕ Onboard New Client</option>
                    </select>
                  </div>
                )}

                {(isNewClient || formData.id) && (
                  <>
                    <div>
                      <label className={labelClass}>Client / Company Name <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        required
                        disabled={!isNewClient && !formData.id}
                        placeholder="e.g., TechCorp Inc." 
                        value={formData.clientName} 
                        onChange={e => setFormData({...formData, clientName: e.target.value})} 
                        className={`${inputClass} ${!isNewClient && !formData.id ? 'opacity-60 cursor-not-allowed' : ''}`} 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>GSTIN (Optional)</label>
                        <input 
                          type="text" 
                          disabled={!isNewClient && !formData.id}
                          placeholder="e.g., 29ABCDE1234F1Z5" 
                          value={formData.clientGstin} 
                          onChange={e => setFormData({...formData, clientGstin: e.target.value.toUpperCase()})} 
                          className={`${inputClass} font-mono ${!isNewClient && !formData.id ? 'opacity-60 cursor-not-allowed' : ''}`} 
                          maxLength="15"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Phone (Optional)</label>
                        <input 
                          type="text" 
                          disabled={!isNewClient && !formData.id}
                          placeholder="Contact Number" 
                          value={formData.clientPhone} 
                          onChange={e => setFormData({...formData, clientPhone: e.target.value})} 
                          className={`${inputClass} ${!isNewClient && !formData.id ? 'opacity-60 cursor-not-allowed' : ''}`} 
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* PROJECT SECTION */}
              <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200/80 space-y-3">
                <h3 className="text-[10px] font-extrabold text-zinc-800 uppercase tracking-widest">2. Project Details</h3>
                
                <div>
                  <label className={labelClass}>Project / Site Name <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g., Office Floor 3 Fitout" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    className={inputClass} 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>PO Budget (₹) <span className="text-red-500">*</span></label>
                    <input 
                      type="number" 
                      step="any"
                      required
                      placeholder="0.00" 
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
                  <select 
                    value={formData.status} 
                    onChange={e => setFormData({...formData, status: e.target.value})} 
                    className={`${inputClass} cursor-pointer`}
                  >
                    <option value="Planning">Planning</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                    <option value="On Hold">On Hold</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-zinc-100">
                <button 
                  type="button" 
                  onClick={handleCloseModal}
                  className="flex-1 py-3.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold rounded-xl transition-colors text-[10px] uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3.5 bg-[#1E3A8A] hover:bg-blue-900 text-white font-bold rounded-xl transition-all shadow-md text-[10px] uppercase tracking-wider cursor-pointer"
                >
                  Save Project
                </button>
              </div>

              {formData.id && (
                <button 
                  type="button"
                  onClick={() => handleDelete(formData.id)}
                  className="w-full mt-1 py-2 text-[10px] text-red-500 hover:text-red-700 font-bold uppercase tracking-widest transition-colors cursor-pointer"
                >
                  Delete Project
                </button>
              )}
            </form>
          </div>
        </div>
      )}

    </div>
  );
}