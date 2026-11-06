import React, { useState, useEffect } from 'react';
import { getProjects } from '../db';

export default function WarrantyDLP() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('DLP_PROJECTS'); // DLP_PROJECTS, TICKETS, RETENTIONS
  const [projects, setProjects] = useState([]);
  
  // Local State for tickets & retentions
  const [tickets, setTickets] = useState([]);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    projectId: '',
    issue: '',
    reportedBy: 'Client',
    assignedTo: '',
    estimatedCost: '',
    status: 'Open',
    priority: 'Medium'
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const projs = (await getProjects()) || [];
      // Focus on completed projects in the handover/DLP phase
      const completed = projs
        .filter(p => p.status === 'Completed')
        .map(p => {
          // Handover date calculation (mock baseline for demo)
          const handoverDate = new Date();
          handoverDate.setMonth(handoverDate.getMonth() - 3);
          
          // Standard 12-month (365 days) Defect Liability Period
          const expiryDate = new Date(handoverDate);
          expiryDate.setFullYear(expiryDate.getFullYear() + 1);
          
          const daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));

          return {
            ...p,
            handoverDate: handoverDate.toISOString().split('T')[0],
            dlpExpiry: expiryDate.toISOString().split('T')[0],
            daysLeft: daysLeft,
            retentionHeld: (parseFloat(p.budget) || 0) * 0.05,
            retentionReleased: false
          };
        });
      setProjects(completed);

      // Default service ticket seed
      if (completed.length > 0) {
        setTickets([
          { 
            id: 1, 
            projectId: completed[0].id || completed[0]._id, 
            projectName: completed[0].name || completed[0].projectName, 
            issue: 'Master bathroom shower pressure valve leakage', 
            reportedBy: 'Client', 
            assignedTo: 'Ali Plumbers', 
            estimatedCost: 1500, 
            status: 'Open', 
            priority: 'High', 
            date: new Date().toISOString().split('T')[0] 
          },
          { 
            id: 2, 
            projectId: completed[0].id || completed[0]._id, 
            projectName: completed[0].name || completed[0].projectName, 
            issue: 'Wardrobe soft-close hinge alignment loose', 
            reportedBy: 'Client', 
            assignedTo: 'Ramesh Carpentry', 
            estimatedCost: 200, 
            status: 'Resolved', 
            priority: 'Low', 
            date: new Date().toISOString().split('T')[0] 
          }
        ]);
      }
    } catch (err) {
      console.error("Failed to load DLP projects", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveTicket = (e) => {
    e.preventDefault();
    const proj = projects.find(p => String(p.id || p._id) === String(ticketForm.projectId));
    setTickets([{ 
      ...ticketForm, 
      id: Date.now(), 
      projectName: proj ? (proj.name || proj.projectName) : 'General Site', 
      date: new Date().toISOString().split('T')[0] 
    }, ...tickets]);
    setIsTicketModalOpen(false);
    setTicketForm({ projectId: '', issue: '', reportedBy: 'Client', assignedTo: '', estimatedCost: '', status: 'Open', priority: 'Medium' });
  };

  const handleStatusChange = (ticketId, newStatus) => {
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
  };

  const handleReleaseRetention = (projectId) => {
    if (window.confirm("Authorize release of the 5% retention funds for this project?")) {
      setProjects(prev => prev.map(p => (p.id === projectId || p._id === projectId) ? { ...p, retentionReleased: true } : p));
    }
  };

  const activeDlpCount = projects.filter(p => p.daysLeft > 0).length;
  const openTicketCount = tickets.filter(t => t.status === 'Open').length;
  const totalRepairCost = tickets.reduce((sum, t) => sum + (parseFloat(t.estimatedCost) || 0), 0);
  const pendingRetentionTotal = projects
    .filter(p => !p.retentionReleased)
    .reduce((sum, p) => sum + (p.retentionHeld || 0), 0);

  const inputClass = "w-full px-4 py-3 rounded-lg border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 text-sm font-medium transition-all shadow-sm disabled:opacity-75 disabled:cursor-not-allowed";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-0.5";

  return (
    <div className="w-full h-full flex flex-col font-['Inter',sans-serif]">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 mb-6 border-b border-zinc-200 shrink-0 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Post-Handover & Warranty (DLP)</h2>
          <p className="text-zinc-500 text-sm mt-1 font-medium">Track defect liability periods, client warranty service tickets, and retention payouts.</p>
        </div>
        <button 
          onClick={() => setIsTicketModalOpen(true)} 
          className="bg-zinc-900 hover:bg-black text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm flex items-center gap-2 h-10 border border-black cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Log Service Ticket
        </button>
      </div>

      {/* KPI STRIP */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6 shrink-0">
        <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Active DLP Projects</span>
          <p className="text-3xl font-black text-zinc-900 tracking-tight">{activeDlpCount}</p>
        </div>
        <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Open Service Tickets</span>
          <p className={`text-3xl font-black tracking-tight ${openTicketCount > 0 ? 'text-red-600' : 'text-zinc-900'}`}>{openTicketCount}</p>
        </div>
        <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Warranty Repairs Est.</span>
          <p className="text-2xl font-black text-zinc-900 tracking-tight">₹ {totalRepairCost.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-zinc-900 border border-black p-6 rounded-xl shadow-sm flex flex-col justify-center relative overflow-hidden">
          <svg className="absolute -right-4 -bottom-6 w-32 h-32 opacity-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2 relative z-10">Retentions Under Lock</span>
          <p className="text-2xl font-black text-white tracking-tight relative z-10">₹ {pendingRetentionTotal.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex bg-white p-1 rounded-lg shadow-sm border border-zinc-200 w-fit mb-6 shrink-0">
        {[
          { id: 'DLP_PROJECTS', label: 'Handover & DLP Sites' },
          { id: 'TICKETS', label: 'Service Tickets' },
          { id: 'RETENTIONS', label: 'Retention Releases' }
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id)} 
            className={`px-5 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
              activeTab === tab.id 
                ? 'bg-zinc-900 text-white shadow-sm' 
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-10">
        {loading ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-xs flex-1 flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin"></div>
            <p>Syncing warranty & DLP records from cloud DB...</p>
          </div>
        ) : activeTab === 'DLP_PROJECTS' ? (
          <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-0">
            <div className="p-6 border-b border-zinc-200 bg-white flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest">Completed Sites DLP Ledger</h3>
                <p className="text-xs text-zinc-500 font-medium mt-0.5">Projects undergoing standard 12-month Defect Liability Period.</p>
              </div>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-100 px-3 py-1.5 rounded-md border border-zinc-200">
                {projects.length} Sites Handed Over
              </span>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-500 text-[10px] uppercase tracking-widest font-bold border-b border-zinc-200 sticky top-0 z-10">
                    <th className="py-4 px-6 w-72">Project & Client</th>
                    <th className="py-4 px-6 text-center w-36">Handover Date</th>
                    <th className="py-4 px-6 text-center w-36">DLP Expiry</th>
                    <th className="py-4 px-6 text-center w-48">Warranty Status</th>
                    <th className="py-4 px-6 text-center w-36">Active Tickets</th>
                    <th className="py-4 px-6 text-right w-44">Retention (5%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-sm">
                  {projects.map(p => {
                    const projectTickets = tickets.filter(t => (t.projectId === p.id || t.projectId === p._id) && t.status === 'Open');
                    const isWarrantyActive = p.daysLeft > 0;

                    return (
                      <tr key={p.id || p._id} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="py-4 px-6">
                          <p className="font-bold text-zinc-900 tracking-tight">{p.name || p.projectName}</p>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">{p.clientName}</p>
                        </td>
                        <td className="py-4 px-6 text-center text-xs font-bold text-zinc-500 uppercase tracking-widest">{p.handoverDate}</td>
                        <td className="py-4 px-6 text-center text-xs font-bold text-zinc-500 uppercase tracking-widest">{p.dlpExpiry}</td>
                        <td className="py-4 px-6 text-center">
                          <span className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest border ${
                            isWarrantyActive 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                              : 'bg-zinc-100 text-zinc-600 border-zinc-300'
                          }`}>
                            {isWarrantyActive ? `${p.daysLeft} Days Remaining` : 'Warranty Expired'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className={`font-mono font-bold text-xs px-2.5 py-0.5 rounded ${
                            projectTickets.length > 0 
                              ? 'bg-red-50 text-red-700 border border-red-200 font-black' 
                              : 'text-zinc-400'
                          }`}>
                            {projectTickets.length} Open
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right font-black text-sm text-zinc-900">
                          ₹ {(p.retentionHeld || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    );
                  })}
                  {projects.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-16 text-center text-zinc-400 font-bold text-xs uppercase tracking-widest">
                        No completed handover sites found under warranty.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'TICKETS' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tickets.map(t => (
              <div key={t.id} className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm flex flex-col justify-between hover:border-zinc-400 transition-all">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest bg-zinc-100 border border-zinc-200 px-2.5 py-1 rounded-md truncate max-w-[160px]">
                      {t.projectName}
                    </span>
                    <select 
                      value={t.status} 
                      onChange={(e) => handleStatusChange(t.id, e.target.value)}
                      className={`appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2318181B%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%223%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.45rem_center] bg-[length:0.65rem_0.65rem] pr-6 pl-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest border outline-none cursor-pointer transition-all ${
                        t.status === 'Open' 
                          ? 'bg-red-50 text-red-700 border-red-200' 
                          : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      }`}
                    >
                      <option value="Open">Open</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>

                  <h4 className="font-bold text-zinc-900 text-sm mb-2 tracking-tight leading-snug">{t.issue}</h4>
                  <div className="space-y-1 mb-4 text-xs font-medium">
                    <p className="text-zinc-500">
                      Assigned To: <strong className="text-zinc-900 font-bold">{t.assignedTo || 'Unassigned Agency'}</strong>
                    </p>
                    <p className="text-zinc-500">
                      Reported By: <span className="text-zinc-700">{t.reportedBy}</span>
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-100 flex justify-between items-center mt-2">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Logged: {t.date}</span>
                  <span className="font-black text-xs text-zinc-900">
                    Est. Cost: ₹ {(parseFloat(t.estimatedCost) || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            ))}
            {tickets.length === 0 && (
              <div className="col-span-full py-16 text-center text-zinc-400 font-bold text-xs uppercase tracking-widest bg-white border border-dashed border-zinc-300 rounded-xl">
                No warranty service tickets reported.
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-0">
            <div className="p-6 border-b border-zinc-200 bg-white flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest">Subcontractor Retention Release Schedule</h3>
                <p className="text-xs text-zinc-500 font-medium mt-0.5">5% retention funds held across trade agencies released upon completion of the 12-month DLP.</p>
              </div>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-100 px-3 py-1.5 rounded-md border border-zinc-200">
                Total Pending: ₹ {pendingRetentionTotal.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-500 text-[10px] uppercase tracking-widest font-bold border-b border-zinc-200 sticky top-0 z-10">
                    <th className="py-4 px-6 w-72">Project / Contract</th>
                    <th className="py-4 px-6 text-right w-44">Contract Budget</th>
                    <th className="py-4 px-6 text-right w-44">Retention Amount (5%)</th>
                    <th className="py-4 px-6 text-center w-40">DLP Expiry</th>
                    <th className="py-4 px-6 text-center w-36">Release Status</th>
                    <th className="py-4 px-6 text-right w-44">Disbursement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-sm">
                  {projects.map(p => {
                    const isEligible = p.daysLeft <= 0;
                    return (
                      <tr key={p.id || p._id} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="py-4 px-6">
                          <p className="font-bold text-zinc-900 tracking-tight">{p.name || p.projectName}</p>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">{p.clientName}</p>
                        </td>
                        <td className="py-4 px-6 text-right font-medium text-xs text-zinc-700">
                          ₹ {(parseFloat(p.budget) || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-4 px-6 text-right font-black text-sm text-zinc-900">
                          ₹ {(p.retentionHeld || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-4 px-6 text-center font-bold text-xs uppercase tracking-widest text-zinc-500">
                          {p.dlpExpiry}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest border ${
                            p.retentionReleased 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : isEligible 
                              ? 'bg-zinc-100 text-zinc-900 border-zinc-400' 
                              : 'bg-zinc-50 text-zinc-400 border-zinc-200'
                          }`}>
                            {p.retentionReleased ? 'Disbursed' : isEligible ? 'Eligible for Release' : 'Locked in DLP'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          {p.retentionReleased ? (
                            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                              Payment Released
                            </span>
                          ) : (
                            <button 
                              onClick={() => handleReleaseRetention(p.id || p._id)}
                              disabled={!isEligible}
                              className={`px-4 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all shadow-sm ${
                                isEligible 
                                  ? 'bg-zinc-900 hover:bg-black text-white cursor-pointer border border-black' 
                                  : 'bg-zinc-100 text-zinc-400 border border-zinc-200 cursor-not-allowed opacity-60'
                              }`}
                            >
                              Release Payout
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {projects.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-16 text-center text-zinc-400 font-bold text-xs uppercase tracking-widest">
                        No retention payout records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* SERVICE TICKET MODAL */}
      {isTicketModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] border border-zinc-200">
            <div className="px-8 py-6 border-b border-zinc-200 flex justify-between items-center bg-white shrink-0">
              <div>
                <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Log Warranty Issue</h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">DLP Post-Handover Ticket</p>
              </div>
              <button 
                onClick={() => setIsTicketModalOpen(false)} 
                className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 transition-colors flex items-center justify-center cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-8 overflow-y-auto [&::-webkit-scrollbar]:hidden bg-[#F4F4F5]">
              <form id="ticketForm" onSubmit={handleSaveTicket} className="space-y-5 bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                <div>
                  <label className={labelClass}>Completed Project <span className="text-red-500">*</span></label>
                  <select 
                    required 
                    value={ticketForm.projectId} 
                    onChange={e => setTicketForm({...ticketForm, projectId: e.target.value})} 
                    className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2318181B%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
                  >
                    <option value="">Select Project Site...</option>
                    {projects.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name || p.projectName}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Issue Description <span className="text-red-500">*</span></label>
                  <textarea 
                    required 
                    value={ticketForm.issue} 
                    onChange={e => setTicketForm({...ticketForm, issue: e.target.value})} 
                    className={`${inputClass} resize-y min-h-[90px] leading-relaxed`} 
                    placeholder="e.g. Paint peeling along skirting line in living room" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Assign Repair To</label>
                    <input 
                      type="text" 
                      value={ticketForm.assignedTo} 
                      onChange={e => setTicketForm({...ticketForm, assignedTo: e.target.value})} 
                      className={inputClass} 
                      placeholder="Subcontractor name" 
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Estimated Cost (₹)</label>
                    <input 
                      type="number" 
                      step="any"
                      value={ticketForm.estimatedCost} 
                      onChange={e => setTicketForm({...ticketForm, estimatedCost: e.target.value})} 
                      className={`${inputClass} font-bold text-zinc-900`} 
                      placeholder="0.00" 
                    />
                  </div>
                </div>
              </form>
            </div>

            <div className="px-8 py-5 border-t border-zinc-200 flex justify-end gap-3 bg-white shrink-0">
              <button 
                type="button" 
                onClick={() => setIsTicketModalOpen(false)} 
                className="px-6 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="ticketForm"
                className="px-8 py-2.5 bg-zinc-900 hover:bg-black text-white rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-sm transition-all cursor-pointer border border-black"
              >
                Save Ticket
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}