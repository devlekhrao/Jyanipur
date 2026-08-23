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

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-inset focus:ring-[#B45309] text-zinc-900 text-sm font-medium transition-all disabled:opacity-75 disabled:cursor-not-allowed";
  const labelClass = "block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 ml-0.5";

  // ==========================================
  // RENDER 1: LIST VIEW
  // ==========================================
  if (currentView === 'list') {
    return (
      <div className="w-full h-full flex flex-col" style={{ fontFamily: 'Poppins, sans-serif' }}>
        
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 border-b border-zinc-200 mb-6 gap-4 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Project Board & Job Costing</h2>
            <p className="text-zinc-500 text-sm mt-0.5 font-medium">Onboard clients and sequence multiple projects by PO Date.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center h-10 bg-white border border-zinc-200 rounded-xl px-3.5 shadow-sm">
              <span className="text-sm text-zinc-400">🔍</span>
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
              className="h-10 bg-[#B45309] hover:bg-[#92400E] text-white px-5 rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Project
            </button>
          </div>
        </div>

        {/* Global Financial Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6 shrink-0">
          <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-center">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Total Active PO Budgets</span>
            <p className="text-xl font-bold text-zinc-900">₹ {globalBudget.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-center">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Total Billed (Invoices)</span>
            <p className="text-xl font-bold text-zinc-800">₹ {globalBilled.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-center">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Total Cost (Mat + Labor)</span>
            <p className="text-xl font-bold text-red-500">₹ {globalCost.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
          </div>
          <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-center">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block mb-1">Estimated Net Margin</span>
            <p className="text-xl font-bold text-emerald-700">₹ {(globalBilled - globalCost).toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
          </div>
        </div>

        {/* Client & Project Hierarchy */}
        <div className="flex-1 overflow-y-auto space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-10">
          {loading ? (
            <div className="py-20 text-center text-zinc-400 font-medium text-sm flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-4 border-zinc-200 border-t-[#B45309] rounded-full animate-spin"></div>
              <p>Syncing projects from cloud database...</p>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="py-20 text-center text-zinc-400 font-medium text-sm bg-white border border-dashed border-zinc-200 rounded-2xl">No clients or projects found.</div>
          ) : (
            filteredClients.map(client => (
              <div key={client.name} className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                
                {/* Client Header */}
                <div className="bg-zinc-50 px-6 py-4 border-b border-zinc-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-[#B45309] text-white flex items-center justify-center text-xs font-semibold">
                        {client.name.charAt(0)}
                      </span>
                      {client.name}
                    </h3>
                    <div className="flex gap-4 mt-2 ml-9">
                      {client.gstin && <p className="text-[10px] font-mono font-semibold text-zinc-500 bg-white px-2 py-0.5 rounded border border-zinc-200 shadow-sm">GST: {client.gstin}</p>}
                      {client.phone && <p className="text-[10px] font-mono font-semibold text-zinc-500 bg-white px-2 py-0.5 rounded border border-zinc-200 shadow-sm">Ph: {client.phone}</p>}
                      <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest py-0.5">
                        {client.projects.length} Project{client.projects.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-semibold text-zinc-900">Client Budget: ₹{client.totalBudget.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
                    <p className="text-[11px] font-semibold text-emerald-600 mt-1">Est. Margin: ₹{(client.totalBilled - client.totalCost).toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
                  </div>
                </div>

                {/* Projects Table */}
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1000px]">
                    <thead>
                      <tr className="text-zinc-500 text-[11px] uppercase tracking-wider border-b border-zinc-100 bg-white">
                        <th className="py-3.5 px-6 font-semibold w-64">Project / Site Name</th>
                        <th className="py-3.5 px-4 font-semibold w-28">PO Date</th>
                        <th className="py-3.5 px-4 font-semibold text-center w-24">Status</th>
                        <th className="py-3.5 px-4 font-semibold text-right w-32">PO Budget</th>
                        <th className="py-3.5 px-4 font-semibold text-right w-32">Billed (Sales)</th>
                        <th className="py-3.5 px-4 font-semibold text-right w-32">Costs (Mat+Lab)</th>
                        <th className="py-3.5 px-4 font-semibold text-right w-32">Site Margin</th>
                        <th className="py-3.5 px-6 font-semibold text-right w-24">Action</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm text-zinc-800 divide-y divide-zinc-50">
                      {client.projects.map((proj, index) => {
                        const matCost = Number(proj.materialCost) || 0;
                        const labCost = Number(proj.laborCost) || 0;
                        const totalCost = matCost + labCost;
                        const margin = (Number(proj.totalBilled) || 0) - totalCost;
                        
                        return (
                          <tr key={proj.id} className="hover:bg-zinc-50 transition-colors">
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-zinc-400 w-4">#{index + 1}</span>
                                <div>
                                  <p className="font-semibold text-zinc-900">{proj.name || proj.projectName}</p>
                                  <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                                    {proj.invoicesCount || 0} Invoices Linked
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-zinc-500 font-medium text-sm">
                              {proj.poDate || '-'}
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                proj.status === 'Ongoing' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                proj.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                'bg-amber-50 text-amber-700 border border-amber-100'
                              }`}>
                                {proj.status || 'Planning'}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right font-medium text-sm text-zinc-900">
                              ₹{(Number(proj.budget) || 0).toLocaleString('en-IN', {maximumFractionDigits: 0})}
                            </td>
                            <td className="py-4 px-4 text-right">
                              <p className="font-medium text-sm text-zinc-800">₹{(Number(proj.totalBilled) || 0).toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
                              <p className="text-[10px] text-zinc-400 font-medium mt-0.5">₹{(Number(proj.totalReceived) || 0).toLocaleString('en-IN', {maximumFractionDigits: 0})} Recv</p>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <p className="font-medium text-sm text-red-500">₹{totalCost.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
                              <p className="text-[10px] text-zinc-400 font-medium mt-0.5">Mat: ₹{matCost.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <span className={`font-semibold text-sm ${margin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                ₹{margin.toLocaleString('en-IN', {maximumFractionDigits: 0})}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right space-x-2">
                              <div className="flex items-center justify-end gap-1.5">
                                <button onClick={() => handleEditProject(proj)} title="Edit Project" className="px-2.5 py-1.5 bg-amber-50 text-[#B45309] hover:bg-[#B45309] hover:text-white border border-amber-200/60 rounded-lg font-semibold cursor-pointer text-[11px] uppercase tracking-wider transition-all">
                                  Edit
                                </button>
                                <button onClick={() => handleView(proj)} title="View Master Report" className="px-3 py-1.5 bg-[#B45309] text-white hover:bg-[#92400E] shadow-sm rounded-lg font-bold cursor-pointer text-[11px] uppercase tracking-wider transition-all">
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
      <div className="w-full h-full flex flex-col bg-zinc-50 print:bg-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
        
        {/* Report Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 border-b border-zinc-200 mb-6 shrink-0 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                activeProject.status === 'Ongoing' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                activeProject.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {activeProject.status || 'Planning'}
              </span>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{activeProject.clientName}</span>
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">{activeProject.name || activeProject.projectName}</h2>
          </div>
          <div className="flex gap-2 print:hidden">
            <button onClick={() => setCurrentView('list')} className="text-zinc-600 hover:text-zinc-900 text-xs font-bold transition-colors cursor-pointer bg-white px-4 py-2 rounded-xl border border-zinc-200 shadow-sm flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back to Projects
            </button>
            <button onClick={() => window.print()} className="bg-[#B45309] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer hover:bg-[#92400E] shadow-sm flex items-center gap-1.5">
              🖨️ Print Report
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-10 space-y-6">
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-center">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Days Active</span>
              <p className="text-2xl font-black text-zinc-900">{calculateDaysActive(activeProject.poDate)} <span className="text-sm font-semibold text-zinc-400">Days</span></p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-center">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Task Progress</span>
              <p className="text-2xl font-black text-blue-600">{completedTasks} <span className="text-sm font-semibold text-zinc-400">/ {totalTasks}</span></p>
            </div>
            <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-center">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Income Received</span>
              <p className="text-xl font-black text-emerald-700">₹ {(reportData.pnl?.incomeReceived || 0).toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-red-50 p-5 rounded-2xl border border-red-100 shadow-sm flex flex-col justify-center">
              <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-1">Total Costs Incurred</span>
              <p className="text-xl font-black text-red-600">₹ {(reportData.pnl?.totalCost || 0).toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* LEFT COLUMN: Operations & Status */}
            <div className="space-y-6">
              
              {/* Where we stand (Latest DPR) */}
              <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden p-6">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span>📍</span> Current Standing (Latest Daily Report)
                </h3>
                {latestDPR ? (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-bold text-[#B45309] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Date: {latestDPR.date}</span>
                      <span className="text-[10px] font-medium text-zinc-500">By: {latestDPR.loggedBy}</span>
                    </div>
                    <p className="text-sm text-zinc-800 font-medium leading-relaxed bg-zinc-50 p-3 rounded-xl border border-zinc-100">{latestDPR.summary}</p>
                    
                    {latestDPR.materials_needed && (
                      <div className="mt-4">
                        <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest block mb-1">Upcoming Material Purchase List</span>
                        <p className="text-sm text-zinc-700 bg-red-50/50 p-3 rounded-xl border border-red-100">{latestDPR.materials_needed}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 italic">No daily reports logged yet for this site.</p>
                )}
              </div>

              {/* Tasks / Work Status */}
              <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden p-6">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span>✅</span> Work Schedule & Tasks
                </h3>
                {reportData.tasks.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">No tasks assigned to this project.</p>
                ) : (
                  <div className="space-y-3">
                    {reportData.tasks.slice(0, 5).map(task => (
                      <div key={task.id} className="flex justify-between items-center p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                        <div>
                          <p className={`text-sm font-semibold ${task.status === 'Completed' ? 'text-zinc-400 line-through' : 'text-zinc-800'}`}>{task.title}</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">Assigned to: {task.assignedTo || 'Unassigned'}</p>
                        </div>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          task.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                          task.status === 'In Progress' ? 'bg-amber-100 text-[#B45309]' : 'bg-zinc-200 text-zinc-600'
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
              <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden p-6">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span>👷</span> Subcontractors Deployed
                </h3>
                {reportData.subWOs.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">No subcontractors allocated.</p>
                ) : (
                  <div className="space-y-3">
                    {reportData.subWOs.map(wo => (
                      <div key={wo.id} className="flex justify-between items-center p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                        <div>
                          <p className="text-sm font-bold text-zinc-800">{wo.subName}</p>
                          <p className="text-[10px] font-semibold text-[#B45309] uppercase tracking-wider mt-0.5">{wo.trade}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-zinc-500 font-medium">Contract Value</p>
                          <p className="text-sm font-bold text-zinc-900">₹ {(wo.contractValue || 0).toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Materials on Project (Inventory) */}
              <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden p-6">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span>🧱</span> Materials Logged to Site
                </h3>
                {reportData.inventory.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">No materials requested or dispatched to site.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {reportData.inventory.map(inv => (
                      <div key={inv.id} className="flex justify-between items-center border-b border-zinc-100 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0">
                        <div>
                          <p className="text-xs font-semibold text-zinc-800">{inv.itemName}</p>
                          <p className="text-[9px] text-zinc-400">{inv.date}</p>
                        </div>
                        <span className={`text-[11px] font-bold ${inv.type === 'IN' ? 'text-emerald-600' : 'text-red-500'}`}>
                          {inv.type === 'IN' ? '+' : '-'}{inv.quantity} {inv.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Financial Ledger (Transactions) */}
              <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden p-6">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span>💸</span> Project Ledger (Receipts & Payments)
                </h3>
                {reportData.transactions.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">No financial transactions recorded.</p>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {reportData.transactions.map(txn => (
                      <div key={txn.id} className="flex justify-between items-center p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                              txn.type === 'Income' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {txn.type}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-medium">{txn.date}</span>
                          </div>
                          <p className="text-xs font-semibold text-zinc-700 mt-1 truncate max-w-[200px]">{txn.desc}</p>
                        </div>
                        <p className={`text-sm font-bold ${txn.type === 'Income' ? 'text-emerald-600' : 'text-zinc-900'}`}>
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
    <div className="w-full h-full flex flex-col" style={{ fontFamily: 'Poppins, sans-serif' }}>
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 pb-4 mb-6 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
              {formData.id ? 'Edit Project Details' : 'Create New Project'}
            </h2>
            <p className="text-zinc-500 text-sm mt-0.5 font-medium">Link this project to a client to track budgets and costs.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setCurrentView('list')} className="text-zinc-600 hover:text-zinc-900 text-sm font-semibold transition-colors cursor-pointer bg-white px-4 py-2 rounded-xl border border-zinc-200 flex items-center gap-1.5 shadow-sm">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back
            </button>
          </div>
        </div>

        <form onSubmit={handleSaveProject} className="max-w-4xl space-y-6 pb-8">
          
          {/* CLIENT SECTION */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-[#B45309] uppercase tracking-wider border-b border-zinc-100 pb-2">1. Client Details</h3>

            {!formData.id && uniqueClients.length > 0 && (
              <div>
                <label className={labelClass}>Select Existing Client or Create New</label>
                <select 
                  value={isNewClient ? 'NEW' : formData.clientName} 
                  onChange={handleClientSelectChange} 
                  className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
                >
                  {uniqueClients.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                  <option value="NEW">➕ Onboard New Client</option>
                </select>
              </div>
            )}

            {(isNewClient || formData.id || uniqueClients.length === 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className={labelClass}>Client / Company Name <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required
                    disabled={!isNewClient && !formData.id && uniqueClients.length > 0}
                    placeholder="e.g., TechCorp Inc." 
                    value={formData.clientName} 
                    onChange={e => setFormData({...formData, clientName: e.target.value})} 
                    className={`${inputClass} ${(!isNewClient && !formData.id && uniqueClients.length > 0) ? 'opacity-60 cursor-not-allowed bg-zinc-50' : ''}`} 
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
                    className={`${inputClass} font-mono ${(!isNewClient && !formData.id && uniqueClients.length > 0) ? 'opacity-60 cursor-not-allowed bg-zinc-50' : ''}`} 
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
                    className={`${inputClass} ${(!isNewClient && !formData.id && uniqueClients.length > 0) ? 'opacity-60 cursor-not-allowed bg-zinc-50' : ''}`} 
                  />
                </div>
              </div>
            )}
          </div>

          {/* PROJECT SECTION */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-[#B45309] uppercase tracking-wider border-b border-zinc-100 pb-2">2. Project Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
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

              <div className="md:col-span-2">
                <label className={labelClass}>Project Status</label>
                <select 
                  value={formData.status} 
                  onChange={e => setFormData({...formData, status: e.target.value})} 
                  className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
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
                className="px-5 py-3 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-xl font-bold text-sm transition-colors cursor-pointer mr-auto"
              >
                Delete Project
              </button>
            )}
            <button 
              type="button" 
              onClick={() => setCurrentView('list')}
              className="px-6 py-3 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 font-semibold rounded-xl transition-colors text-sm cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={submitting}
              className="px-8 py-3 bg-[#B45309] hover:bg-[#92400E] text-white font-semibold rounded-xl transition-all shadow-sm text-sm cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}