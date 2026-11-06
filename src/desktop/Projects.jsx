import React, { useState, useEffect } from 'react';
import { 
  getProjects, saveProject, deleteProject,
  getProjectPnL, getTasks, getInventoryMovements, 
  getIncomeRecords, getSiteOperations, getSubcontractorWorkOrders, getPettyCash
} from '../db';

export default function Projects() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [projects, setProjects] = useState([]);
  const [uniqueClients, setUniqueClients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // View State
  const [currentView, setCurrentView] = useState('list'); // 'list', 'form', 'report'
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

  // Master Report State
  const [activeProject, setActiveProject] = useState(null);
  const [reportData, setReportData] = useState({
    pnl: null, tasks: [], inventory: [], income: [], dprs: [], subWOs: [], pettyCash: [], transactions: []
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getProjects();
      
      const enhancedProjects = (data || []).map(p => ({
        ...p,
        invoicesCount: p.invoicesCount || 0,
        totalBilled: parseFloat(p.totalBilled) || 0, 
        totalReceived: parseFloat(p.totalReceived) || 0, 
        materialCost: parseFloat(p.materialCost) || 0, 
        laborCost: parseFloat(p.laborCost) || 0, 
      }));

      setProjects(enhancedProjects);

      const clientsMap = {};
      (data || []).forEach(p => {
        if (p.clientName && !clientsMap[p.clientName]) {
          clientsMap[p.clientName] = { 
            name: p.clientName, 
            gstin: p.clientGstin || '', 
            phone: p.clientPhone || '' 
          };
        }
      });
      setUniqueClients(Object.values(clientsMap));
    } catch (e) {
      console.error("Error fetching projects from cloud database:", e);
      setProjects([]);
      setUniqueClients([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleNewProject = () => {
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
    setCurrentView('form');
  };

  const handleEditProject = (project) => {
    setIsNewClient(false);
    setFormData({
      id: project.id,
      clientName: project.clientName,
      clientGstin: project.clientGstin || '',
      clientPhone: project.clientPhone || '',
      name: project.name || project.projectName,
      poDate: project.poDate || new Date().toISOString().split('T')[0],
      budget: project.budget,
      status: project.status || 'Planning'
    });
    setCurrentView('form');
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

    setSubmitting(true);
    try {
      await saveProject({
        ...formData,
        id: formData.id ? (Number(formData.id) || formData.id) : undefined,
        budget: parseFloat(formData.budget) || 0
      });
      setCurrentView('list');
      await loadData();
    } catch (err) {
      alert("Failed to save project. Check DB connection.");
    }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this project? This cannot be undone.")) {
      setLoading(true);
      try {
        await deleteProject(id);
        setCurrentView('list');
        await loadData();
      } catch (err) {
        alert("Failed to delete project.");
        setLoading(false);
      }
    }
  };

  // ============================================================================
  // MASTER PROJECT REPORT GENERATOR
  // ============================================================================
  const handleView = async (project) => {
    setLoading(true);
    setActiveProject(project);
    
    try {
      const pId = project.id;
      const [pnl, allTasks, allInv, allInc, ops, allSubWOs, allPetty] = await Promise.all([
        getProjectPnL(pId),
        getTasks ? getTasks() : Promise.resolve([]),
        getInventoryMovements ? getInventoryMovements() : Promise.resolve([]),
        getIncomeRecords ? getIncomeRecords() : Promise.resolve([]),
        getSiteOperations ? getSiteOperations(pId) : Promise.resolve({dprs:[], docs:[]}),
        getSubcontractorWorkOrders ? getSubcontractorWorkOrders() : Promise.resolve([]),
        getPettyCash ? getPettyCash() : Promise.resolve([])
      ]);

      const projTasks = allTasks.filter(t => String(t.projectId) === String(pId));
      const projInv = allInv.filter(i => String(i.projectId) === String(pId));
      const projInc = allInc.filter(i => String(i.projectId) === String(pId));
      const projSubWOs = allSubWOs.filter(w => String(w.projectName) === String(project.name));
      const projPetty = allPetty.filter(p => String(p.projectId) === String(pId));

      // Build unified transaction ledger
      const txns = [
        ...projInc.map(i => ({ id: `inc_${i.id}`, date: i.date, type: 'Income', amount: i.amount, desc: i.notes || i.paymentMode })),
        ...projPetty.map(p => ({ id: `exp_${p.id}`, date: p.date, type: 'Expense', amount: p.amount, desc: p.description }))
      ];
      projSubWOs.forEach(wo => {
        (wo.payments || []).forEach(pay => {
          txns.push({ id: `sub_${pay.id}`, date: pay.date, type: 'Sub Payment', amount: pay.amount, desc: `Paid to ${wo.subName}` });
        });
      });
      txns.sort((a,b) => new Date(b.date) - new Date(a.date));

      setReportData({
        pnl: pnl || { incomeReceived: 0, totalCost: 0, netProfit: 0, profitMargin: 0, budget: project.budget },
        tasks: projTasks,
        inventory: projInv,
        income: projInc,
        dprs: ops.dprs || [],
        subWOs: projSubWOs,
        pettyCash: projPetty,
        transactions: txns
      });
      
      setCurrentView('report');
    } catch (err) {
      console.error("Error generating report:", err);
      alert("Failed to load comprehensive project report.");
    }
    setLoading(false);
  };

  const calculateDaysActive = (poDate) => {
    if (!poDate) return 0;
    const start = new Date(poDate);
    const today = new Date();
    const diffTime = Math.abs(today - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Grouping for the List View
  const clients = {};
  projects.forEach(p => {
    const cName = p.clientName || 'General Client';
    if (!clients[cName]) {
      clients[cName] = {
        name: cName, gstin: p.clientGstin, phone: p.clientPhone,
        totalBudget: 0, totalBilled: 0, totalCost: 0, projects: []
      };
    }
    const b = Number(p.budget) || 0;
    const billed = Number(p.totalBilled) || 0;
    const matCost = Number(p.materialCost) || 0;
    const labCost = Number(p.laborCost) || 0;

    clients[cName].projects.push(p);
    clients[cName].totalBudget += b;
    clients[cName].totalBilled += billed;
    clients[cName].totalCost += (matCost + labCost);
  });

  Object.values(clients).forEach(c => {
    c.projects.sort((a, b) => new Date(a.poDate || 0) - new Date(b.poDate || 0));
  });

  const filteredClients = Object.values(clients).filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.projects.some(p => (p.name || p.projectName || '').toLowerCase().includes(q));
  });

  const globalBudget = projects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
  const globalBilled = projects.reduce((sum, p) => sum + (Number(p.totalBilled) || 0), 0);
  const globalCost = projects.reduce((sum, p) => sum + (Number(p.materialCost) || 0) + (Number(p.laborCost) || 0), 0);

  const inputClass = "w-full px-4 py-3 rounded-lg border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 text-sm font-medium transition-all disabled:opacity-75 disabled:cursor-not-allowed";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-0.5";

  // ==========================================
  // RENDER 1: LIST VIEW
  // ==========================================
  if (currentView === 'list') {
    return (
      <div className="w-full h-full flex flex-col font-['Inter',sans-serif]">
        
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-zinc-200 mb-6 gap-4 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Project Board & Job Costing</h2>
            <p className="text-zinc-500 text-sm mt-1 font-medium">Onboard clients and sequence multiple projects by PO Date.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center h-10 bg-white border border-zinc-200 rounded-lg px-3.5 shadow-sm focus-within:ring-2 focus-within:ring-zinc-900 transition-all">
              <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input 
                type="text" 
                placeholder="Search client or project..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-transparent border-none text-sm font-medium text-zinc-800 outline-none px-2 w-52 placeholder:text-zinc-400"
              />
            </div>
            <button 
              onClick={handleNewProject} 
              className="bg-zinc-900 hover:bg-black text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-2 h-10 uppercase tracking-widest border border-black"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Project
            </button>
          </div>
        </div>

        {/* Global Financial Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6 shrink-0">
          <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex flex-col justify-center">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Total Active PO Budgets</span>
            <p className="text-2xl font-black text-zinc-900 tracking-tight">₹ {globalBudget.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex flex-col justify-center">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Total Billed (Invoices)</span>
            <p className="text-2xl font-black text-zinc-900 tracking-tight">₹ {globalBilled.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
          </div>
          <div className="bg-red-50 p-6 rounded-xl border border-red-200 shadow-sm flex flex-col justify-center">
            <span className="text-[10px] font-bold text-red-700 uppercase tracking-widest block mb-2">Total Cost (Mat + Labor)</span>
            <p className="text-2xl font-black text-red-600 tracking-tight">₹ {globalCost.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
          </div>
          <div className="bg-zinc-900 p-6 rounded-xl border border-black shadow-sm flex flex-col justify-center relative overflow-hidden">
            <svg className="absolute -right-4 -bottom-6 w-32 h-32 opacity-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2 relative z-10">Estimated Net Margin</span>
            <p className="text-2xl font-black text-white tracking-tight relative z-10">₹ {(globalBilled - globalCost).toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
          </div>
        </div>

        {/* Client & Project Hierarchy */}
        <div className="flex-1 overflow-y-auto space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-10">
          {loading ? (
            <div className="py-20 text-center text-zinc-400 font-medium text-sm flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin"></div>
              <p>Syncing projects from cloud database...</p>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="py-20 text-center text-zinc-400 font-bold text-xs uppercase tracking-widest bg-white border border-dashed border-zinc-300 rounded-xl">No clients or projects found.</div>
          ) : (
            filteredClients.map(client => (
              <div key={client.name} className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
                
                {/* Client Header */}
                <div className="bg-white px-6 py-5 border-b border-zinc-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-3 tracking-tight">
                      <span className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center text-sm font-bold shadow-sm">
                        {client.name.charAt(0)}
                      </span>
                      {client.name}
                    </h3>
                    <div className="flex gap-4 mt-2 ml-11">
                      {client.gstin && <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 bg-zinc-50 px-2 py-1 rounded-md border border-zinc-200 shadow-sm">GST: <span className="text-zinc-900">{client.gstin}</span></p>}
                      {client.phone && <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 bg-zinc-50 px-2 py-1 rounded-md border border-zinc-200 shadow-sm">Ph: <span className="text-zinc-900">{client.phone}</span></p>}
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest py-1 px-1">
                        {client.projects.length} Project{client.projects.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Client Budget</p>
                    <p className="text-xl font-black text-zinc-900">₹{client.totalBudget.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
                    <p className="text-[10px] font-bold text-emerald-700 mt-1 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">Margin: ₹{(client.totalBilled - client.totalCost).toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
                  </div>
                </div>

                {/* Projects Table */}
                <div className="overflow-x-auto w-full bg-zinc-50/50">
                  <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1000px]">
                    <thead>
                      <tr className="text-zinc-500 text-[10px] uppercase tracking-widest border-b border-zinc-200 bg-zinc-50 font-bold">
                        <th className="py-4 px-6 w-64">Project / Site Name</th>
                        <th className="py-4 px-4 w-28">PO Date</th>
                        <th className="py-4 px-4 text-center w-24">Status</th>
                        <th className="py-4 px-4 text-right w-32">PO Budget</th>
                        <th className="py-4 px-4 text-right w-32">Billed (Sales)</th>
                        <th className="py-4 px-4 text-right w-32">Costs (Mat+Lab)</th>
                        <th className="py-4 px-4 text-right w-32">Site Margin</th>
                        <th className="py-4 px-6 text-right w-24">Action</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm text-zinc-800 divide-y divide-zinc-100">
                      {client.projects.map((proj, index) => {
                        const matCost = Number(proj.materialCost) || 0;
                        const labCost = Number(proj.laborCost) || 0;
                        const totalCost = matCost + labCost;
                        const margin = (Number(proj.totalBilled) || 0) - totalCost;
                        
                        return (
                          <tr key={proj.id} className="hover:bg-white transition-colors">
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold text-zinc-400 w-4">#{index + 1}</span>
                                <div>
                                  <p className="font-bold text-zinc-900 tracking-tight">{proj.name || proj.projectName}</p>
                                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
                                    {proj.invoicesCount || 0} Invoices
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-zinc-500 font-bold text-xs uppercase tracking-widest">
                              {proj.poDate || '-'}
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className={`inline-block px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest border ${
                                proj.status === 'Ongoing' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                proj.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                'bg-zinc-100 text-zinc-700 border-zinc-300'
                              }`}>
                                {proj.status || 'Planning'}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right font-bold text-sm text-zinc-900">
                              ₹{(Number(proj.budget) || 0).toLocaleString('en-IN', {maximumFractionDigits: 0})}
                            </td>
                            <td className="py-4 px-4 text-right">
                              <p className="font-bold text-sm text-zinc-900">₹{(Number(proj.totalBilled) || 0).toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
                              <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mt-1">₹{(Number(proj.totalReceived) || 0).toLocaleString('en-IN', {maximumFractionDigits: 0})} Recv</p>
                            </td>
                            <td className="py-4 px-4 text-right bg-red-50/30">
                              <p className="font-bold text-sm text-red-600">₹{totalCost.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
                              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Mat: ₹{matCost.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <span className={`font-black text-sm ${margin >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                {margin >= 0 ? '+' : ''}₹{margin.toLocaleString('en-IN', {maximumFractionDigits: 0})}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right space-x-2">
                              <div className="flex items-center justify-end gap-1.5">
                                <button onClick={() => handleEditProject(proj)} title="Edit Project" className="px-3 py-1.5 bg-zinc-100 text-zinc-600 hover:bg-zinc-900 hover:text-white border border-zinc-200 rounded-lg font-bold cursor-pointer text-[10px] uppercase tracking-widest transition-all shadow-sm">
                                  Edit
                                </button>
                                <button onClick={() => handleView(proj)} title="View Master Report" className="px-4 py-1.5 bg-zinc-900 text-white hover:bg-black shadow-sm rounded-lg font-bold cursor-pointer text-[10px] uppercase tracking-widest transition-all border border-black">
                                  Report
                                </button>
                              </div>
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
      </div>
    );
  }

  // ==========================================
  // RENDER 2: MASTER PROJECT REPORT VIEW
  // ==========================================
  if (currentView === 'report' && activeProject) {
    const latestDPR = reportData.dprs.length > 0 ? reportData.dprs[0] : null;
    const completedTasks = reportData.tasks.filter(t => t.status === 'Completed').length;
    const totalTasks = reportData.tasks.length;
    
    return (
      <div className="w-full h-full flex flex-col font-['Inter',sans-serif] print:bg-white">
        
        {/* Report Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-zinc-200 mb-6 shrink-0 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest border ${
                activeProject.status === 'Ongoing' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                activeProject.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                'bg-zinc-100 text-zinc-700 border-zinc-300'
              }`}>
                {activeProject.status || 'Planning'}
              </span>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{activeProject.clientName}</span>
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">{activeProject.name || activeProject.projectName}</h2>
          </div>
          <div className="flex gap-2 print:hidden">
            <button onClick={() => setCurrentView('list')} className="text-zinc-700 hover:text-zinc-900 text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer bg-white px-5 py-2.5 rounded-lg border border-zinc-200 shadow-sm flex items-center gap-2">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back to Projects
            </button>
            <button onClick={() => window.print()} className="bg-zinc-900 text-white px-5 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer hover:bg-black shadow-sm flex items-center gap-2 border border-black">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Report
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-10 space-y-6">
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex flex-col justify-center">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Days Active</span>
              <p className="text-2xl font-black text-zinc-900 tracking-tight">{calculateDaysActive(activeProject.poDate)} <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Days</span></p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex flex-col justify-center">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Task Progress</span>
              <p className="text-2xl font-black text-blue-600 tracking-tight">{completedTasks} <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">/ {totalTasks}</span></p>
            </div>
            <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-200 shadow-sm flex flex-col justify-center">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-2">Income Received</span>
              <p className="text-2xl font-black text-emerald-800 tracking-tight">₹ {(reportData.pnl?.incomeReceived || 0).toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-red-50 p-6 rounded-xl border border-red-200 shadow-sm flex flex-col justify-center">
              <span className="text-[10px] font-bold text-red-700 uppercase tracking-widest mb-2">Total Costs Incurred</span>
              <p className="text-2xl font-black text-red-800 tracking-tight">₹ {(reportData.pnl?.totalCost || 0).toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* LEFT COLUMN: Operations & Status */}
            <div className="space-y-6">
              
              {/* Where we stand (Latest DPR) */}
              <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden p-6">
                <h3 className="text-[10px] font-bold text-zinc-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Current Standing (Latest Daily Report)
                </h3>
                {latestDPR ? (
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[9px] font-bold text-zinc-700 bg-zinc-100 px-2.5 py-1 rounded-md border border-zinc-200 uppercase tracking-widest">Date: {latestDPR.date}</span>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">By: {latestDPR.loggedBy}</span>
                    </div>
                    <p className="text-sm text-zinc-800 font-medium leading-relaxed bg-zinc-50 p-4 rounded-lg border border-zinc-200 shadow-inner">{latestDPR.summary}</p>
                    
                    {latestDPR.materials_needed && (
                      <div className="mt-4">
                        <span className="text-[9px] font-bold text-red-600 uppercase tracking-widest block mb-2">Upcoming Material Purchase List</span>
                        <p className="text-sm text-red-900 bg-red-50 p-4 rounded-lg border border-red-200 font-medium leading-relaxed">{latestDPR.materials_needed}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold text-center py-6">No daily reports logged yet for this site.</p>
                )}
              </div>

              {/* Tasks / Work Status */}
              <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden p-6">
                <h3 className="text-[10px] font-bold text-zinc-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Work Schedule & Tasks
                </h3>
                {reportData.tasks.length === 0 ? (
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold text-center py-6">No tasks assigned to this project.</p>
                ) : (
                  <div className="space-y-3">
                    {reportData.tasks.slice(0, 5).map(task => (
                      <div key={task.id} className="flex justify-between items-center p-4 bg-zinc-50 rounded-lg border border-zinc-200 hover:border-zinc-300 transition-colors shadow-sm">
                        <div>
                          <p className={`text-sm font-bold tracking-tight ${task.status === 'Completed' ? 'text-zinc-400 line-through' : 'text-zinc-900'}`}>{task.title}</p>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Assigned to: {task.assignedTo || 'Unassigned'}</p>
                        </div>
                        <span className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border ${
                          task.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          task.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-zinc-600 border-zinc-200'
                        }`}>
                          {task.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* RIGHT COLUMN: Resources & Finances */}
            <div className="space-y-6">

              {/* Subcontractors Deployed */}
              <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden p-6">
                <h3 className="text-[10px] font-bold text-zinc-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  Subcontractors Deployed
                </h3>
                {reportData.subWOs.length === 0 ? (
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold text-center py-6">No subcontractors allocated.</p>
                ) : (
                  <div className="space-y-3">
                    {reportData.subWOs.map(wo => (
                      <div key={wo.id} className="flex justify-between items-center p-4 bg-zinc-50 rounded-lg border border-zinc-200 shadow-sm hover:border-zinc-300 transition-colors">
                        <div>
                          <p className="text-sm font-bold text-zinc-900 tracking-tight">{wo.subName}</p>
                          <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-1">{wo.trade}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Contract Value</p>
                          <p className="text-sm font-black text-zinc-900">₹ {(wo.contractValue || 0).toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Materials on Project (Inventory) */}
              <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden p-6">
                <h3 className="text-[10px] font-bold text-zinc-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                  Materials Logged to Site
                </h3>
                {reportData.inventory.length === 0 ? (
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold text-center py-6">No materials requested or dispatched to site.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {reportData.inventory.map(inv => (
                      <div key={inv.id} className="flex justify-between items-center border-b border-zinc-100 pb-3 mb-3 last:border-0 last:pb-0 last:mb-0">
                        <div>
                          <p className="text-xs font-bold text-zinc-900 tracking-tight">{inv.itemName}</p>
                          <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">{inv.date}</p>
                        </div>
                        <span className={`text-[11px] font-black ${inv.type === 'IN' ? 'text-emerald-700' : 'text-red-600'}`}>
                          {inv.type === 'IN' ? '+' : '-'}{inv.quantity} <span className="text-[9px] uppercase tracking-widest ml-0.5 font-bold">{inv.unit}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Financial Ledger (Transactions) */}
              <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden p-6">
                <h3 className="text-[10px] font-bold text-zinc-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Project Ledger (Receipts & Payments)
                </h3>
                {reportData.transactions.length === 0 ? (
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold text-center py-6">No financial transactions recorded.</p>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {reportData.transactions.map(txn => (
                      <div key={txn.id} className="flex justify-between items-center p-4 bg-zinc-50 rounded-lg border border-zinc-200 shadow-sm hover:border-zinc-300 transition-colors">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border ${
                              txn.type === 'Income' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                            }`}>
                              {txn.type}
                            </span>
                            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{txn.date}</span>
                          </div>
                          <p className="text-xs font-bold text-zinc-900 mt-2 truncate max-w-[200px] tracking-tight">{txn.desc}</p>
                        </div>
                        <p className={`text-sm font-black ${txn.type === 'Income' ? 'text-emerald-700' : 'text-zinc-900'}`}>
                          {txn.type === 'Income' ? '+' : '-'}₹{(txn.amount || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER 3: FORM VIEW (CREATE / EDIT)
  // ==========================================
  return (
    <div className="w-full h-full flex flex-col font-['Inter',sans-serif]">
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 pb-6 mb-6 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">
              {formData.id ? 'Edit Project Details' : 'Create New Project'}
            </h2>
            <p className="text-zinc-500 text-sm mt-1 font-medium">Link this project to a client to track budgets and costs.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setCurrentView('list')} className="text-zinc-700 hover:text-zinc-900 text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer bg-white px-5 py-2.5 rounded-lg border border-zinc-200 flex items-center gap-2 shadow-sm hover:bg-zinc-50">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back
            </button>
          </div>
        </div>

        <form onSubmit={handleSaveProject} className="max-w-4xl space-y-8 pb-10">
          
          {/* CLIENT SECTION */}
          <div className="bg-white p-8 rounded-xl border border-zinc-200 shadow-sm space-y-6">
            <h3 className="text-[10px] font-bold text-zinc-900 uppercase tracking-widest border-b border-zinc-100 pb-3">1. Client Details</h3>

            {!formData.id && uniqueClients.length > 0 && (
              <div>
                <label className={labelClass}>Select Existing Client or Create New</label>
                <select 
                  value={isNewClient ? 'NEW' : formData.clientName} 
                  onChange={handleClientSelectChange} 
                  className={`${inputClass} bg-zinc-50 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2318181B%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
                >
                  {uniqueClients.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                  <option value="NEW">➕ Onboard New Client</option>
                </select>
              </div>
            )}

            {(isNewClient || formData.id || uniqueClients.length === 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className={labelClass}>Client / Company Name <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required
                    disabled={!isNewClient && !formData.id && uniqueClients.length > 0}
                    placeholder="e.g., TechCorp Inc." 
                    value={formData.clientName} 
                    onChange={e => setFormData({...formData, clientName: e.target.value})} 
                    className={`${inputClass} ${(!isNewClient && !formData.id && uniqueClients.length > 0) ? 'opacity-60 cursor-not-allowed bg-zinc-100' : 'bg-zinc-50'}`} 
                  />
                </div>
                <div>
                  <label className={labelClass}>GSTIN (Optional)</label>
                  <input 
                    type="text" 
                    disabled={!isNewClient && !formData.id && uniqueClients.length > 0}
                    placeholder="e.g., 29ABCDE1234F1Z5" 
                    value={formData.clientGstin} 
                    onChange={e => setFormData({...formData, clientGstin: e.target.value.toUpperCase()})} 
                    className={`${inputClass} font-mono ${(!isNewClient && !formData.id && uniqueClients.length > 0) ? 'opacity-60 cursor-not-allowed bg-zinc-100' : 'bg-zinc-50'}`} 
                    maxLength="15"
                  />
                </div>
                <div>
                  <label className={labelClass}>Phone (Optional)</label>
                  <input 
                    type="text" 
                    disabled={!isNewClient && !formData.id && uniqueClients.length > 0}
                    placeholder="Contact Number" 
                    value={formData.clientPhone} 
                    onChange={e => setFormData({...formData, clientPhone: e.target.value})} 
                    className={`${inputClass} ${(!isNewClient && !formData.id && uniqueClients.length > 0) ? 'opacity-60 cursor-not-allowed bg-zinc-100' : 'bg-zinc-50'}`} 
                  />
                </div>
              </div>
            )}
          </div>

          {/* PROJECT SECTION */}
          <div className="bg-white p-8 rounded-xl border border-zinc-200 shadow-sm space-y-6">
            <h3 className="text-[10px] font-bold text-zinc-900 uppercase tracking-widest border-b border-zinc-100 pb-3">2. Project Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className={labelClass}>Project / Site Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g., Office Floor 3 Fitout" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className={`${inputClass} bg-zinc-50`} 
                />
              </div>

              <div>
                <label className={labelClass}>PO Budget (₹) <span className="text-red-500">*</span></label>
                <input 
                  type="number" 
                  step="any"
                  required
                  placeholder="0.00" 
                  value={formData.budget} 
                  onChange={e => setFormData({...formData, budget: e.target.value})} 
                  className={`${inputClass} bg-zinc-50`} 
                />
              </div>
              
              <div>
                <label className={labelClass}>PO Date</label>
                <input 
                  type="date" 
                  value={formData.poDate} 
                  onChange={e => setFormData({...formData, poDate: e.target.value})} 
                  className={`${inputClass} bg-zinc-50`} 
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>Project Status</label>
                <select 
                  value={formData.status} 
                  onChange={e => setFormData({...formData, status: e.target.value})} 
                  className={`${inputClass} bg-zinc-50 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2318181B%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
                >
                  <option value="Planning">Planning</option>
                  <option value="Ongoing">Ongoing</option>
                  <option value="Completed">Completed</option>
                  <option value="On Hold">On Hold</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            {formData.id && (
              <button 
                type="button"
                onClick={() => handleDelete(formData.id)}
                className="px-6 py-3.5 text-red-600 hover:text-white bg-red-50 hover:bg-red-600 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-colors cursor-pointer mr-auto border border-red-200 hover:border-red-600 shadow-sm"
              >
                Delete Project
              </button>
            )}
            <button 
              type="button" 
              onClick={() => setCurrentView('list')}
              className="px-8 py-3.5 bg-white border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 text-zinc-700 font-bold rounded-lg transition-colors text-[10px] uppercase tracking-widest cursor-pointer shadow-sm"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={submitting}
              className="px-10 py-3.5 bg-zinc-900 hover:bg-black text-white font-bold rounded-lg transition-all shadow-sm text-[10px] uppercase tracking-widest cursor-pointer disabled:opacity-50 border border-black flex items-center gap-2"
            >
              {submitting ? (
                <><svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg> Saving...</>
              ) : 'Save Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}