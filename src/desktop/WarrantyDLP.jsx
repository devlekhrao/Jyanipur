import React, { useState, useEffect } from 'react';
import { getProjects } from '../db'; // Assuming you have this

export default function WarrantyDLP() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('DLP_PROJECTS'); // DLP_PROJECTS, TICKETS, RETENTIONS
  const [projects, setProjects] = useState([]);
  
  // Local State for new module (Replace with DB calls later)
  const [tickets, setTickets] = useState([]);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    projectId: '', issue: '', reportedBy: 'Client', assignedTo: '', estimatedCost: '', status: 'Open', priority: 'Medium'
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const projs = await getProjects() || [];
        // Only get completed projects that are in the handover/DLP phase
        const completed = projs.filter(p => p.status === 'Completed').map(p => {
          // Mocking a handover date 3 months ago for demonstration
          const handoverDate = new Date();
          handoverDate.setMonth(handoverDate.getMonth() - 3);
          
          // Assuming a standard 12-month (365 days) DLP
          const expiryDate = new Date(handoverDate);
          expiryDate.setFullYear(expiryDate.getFullYear() + 1);
          
          const daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));

          return {
            ...p,
            handoverDate: handoverDate.toISOString().split('T')[0],
            dlpExpiry: expiryDate.toISOString().split('T')[0],
            daysLeft: daysLeft,
            retentionHeld: (p.budget || 0) * 0.05 // Assuming 5% retention for demo
          };
        });
        setProjects(completed);

        // Seed some mock tickets if projects exist
        if (completed.length > 0) {
          setTickets([
            { id: 1, projectId: completed[0].id, projectName: completed[0].name, issue: 'Master bathroom shower leaking', reportedBy: 'Client', assignedTo: 'Ali Plumbers', estimatedCost: 1500, status: 'Open', priority: 'High', date: new Date().toISOString().split('T')[0] },
            { id: 2, projectId: completed[0].id, projectName: completed[0].name, issue: 'Wardrobe hinge loose', reportedBy: 'Client', assignedTo: 'Ramesh Carpentry', estimatedCost: 200, status: 'Resolved', priority: 'Low', date: new Date().toISOString().split('T')[0] }
          ]);
        }
      } catch (err) {
        console.error("Failed to load DLP projects", err);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  const handleSaveTicket = (e) => {
    e.preventDefault();
    const proj = projects.find(p => String(p.id) === String(ticketForm.projectId));
    setTickets([{ 
      ...ticketForm, 
      id: Date.now(), 
      projectName: proj?.name || 'Unknown',
      date: new Date().toISOString().split('T')[0]
    }, ...tickets]);
    setIsTicketModalOpen(false);
    setTicketForm({ projectId: '', issue: '', reportedBy: 'Client', assignedTo: '', estimatedCost: '', status: 'Open', priority: 'Medium' });
  };

  const handleStatusChange = (ticketId, newStatus) => {
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
  };

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-inset focus:ring-[#B45309] text-zinc-900 text-sm font-medium transition-all shadow-sm";
  const labelClass = "block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 ml-0.5";

  return (
    <div className="w-full h-full flex flex-col bg-zinc-50" style={{ fontFamily: 'Poppins, sans-serif' }}>
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 mb-6 border-b border-zinc-200 shrink-0 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Post-Handover & Warranty (DLP)</h2>
          <p className="text-zinc-500 text-sm mt-0.5 font-medium">Track warranties, service tickets, and retention payouts for completed projects.</p>
        </div>
        <button onClick={() => setIsTicketModalOpen(true)} className="bg-[#B45309] hover:bg-[#92400E] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-1.5 h-10">
          <span className="text-lg leading-none">+</span> Log Service Ticket
        </button>
      </div>

      {/* KPI STRIP */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6 shrink-0">
        <div className="bg-white border border-zinc-200 p-5 rounded-2xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Active DLP Projects</span>
          <p className="text-xl font-bold text-zinc-900">{projects.filter(p => p.daysLeft > 0).length}</p>
        </div>
        <div className="bg-white border border-zinc-200 p-5 rounded-2xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest block mb-1">Open Service Tickets</span>
          <p className="text-xl font-bold text-red-600">{tickets.filter(t => t.status === 'Open').length}</p>
        </div>
        <div className="bg-white border border-zinc-200 p-5 rounded-2xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest block mb-1">Total Warranty Repair Cost</span>
          <p className="text-xl font-bold text-zinc-900">₹{tickets.reduce((sum, t) => sum + (parseFloat(t.estimatedCost) || 0), 0).toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block mb-1">Retention Payouts Pending</span>
          <p className="text-xl font-bold text-emerald-700">₹{projects.reduce((sum, p) => sum + (p.retentionHeld || 0), 0).toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex bg-white p-1 rounded-xl shadow-sm border border-zinc-200 w-fit mb-6 shrink-0">
        {[
          { id: 'DLP_PROJECTS', label: 'Completed Projects (DLP)' },
          { id: 'TICKETS', label: 'Service Tickets' },
          { id: 'RETENTIONS', label: 'Subcontractor Retentions' }
        ].map(tab => (
          <button 
            key={tab.id} onClick={() => setActiveTab(tab.id)} 
            className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === tab.id ? 'bg-[#B45309] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-10">
        {loading ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-sm flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-4 border-zinc-200 border-t-[#B45309] rounded-full animate-spin"></div>
            <p>Loading Warranty database...</p>
          </div>
        ) : activeTab === 'DLP_PROJECTS' ? (
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500 text-[10px] uppercase tracking-wider border-b border-zinc-200">
                  <th className="py-4 px-6 font-bold">Project & Client</th>
                  <th className="py-4 px-6 font-bold text-center">Handover Date</th>
                  <th className="py-4 px-6 font-bold text-center">DLP Expiry</th>
                  <th className="py-4 px-6 font-bold text-center">Time Remaining</th>
                  <th className="py-4 px-6 font-bold text-center">Open Tickets</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50 text-sm">
                {projects.map(p => {
                  const openCount = tickets.filter(t => t.projectId === p.id && t.status === 'Open').length;
                  return (
                    <tr key={p.id} className="hover:bg-amber-50/30 transition-colors">
                      <td className="py-4 px-6">
                        <p className="font-bold text-zinc-900">{p.name}</p>
                        <p className="text-[10px] text-zinc-500 font-semibold">{p.clientName}</p>
                      </td>
                      <td className="py-4 px-6 text-center text-zinc-600 font-medium">{p.handoverDate}</td>
                      <td className="py-4 px-6 text-center text-zinc-600 font-medium">{p.dlpExpiry}</td>
                      <td className="py-4 px-6 text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                          p.daysLeft > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {p.daysLeft > 0 ? `${p.daysLeft} Days Left` : 'Warranty Expired'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`font-bold ${openCount > 0 ? 'text-red-600' : 'text-zinc-400'}`}>{openCount}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'TICKETS' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tickets.map(t => (
              <div key={t.id} className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-bold text-[#B45309] uppercase tracking-wider bg-amber-50 border border-amber-100 px-2 py-0.5 rounded">{t.projectName}</span>
                    <select 
                      value={t.status} onChange={(e) => handleStatusChange(t.id, e.target.value)}
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border outline-none cursor-pointer ${
                        t.status === 'Open' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      <option value="Open">🔴 Open</option>
                      <option value="Resolved">🟢 Resolved</option>
                    </select>
                  </div>
                  <h4 className="font-bold text-zinc-900 text-sm mb-2">{t.issue}</h4>
                  <p className="text-xs text-zinc-500 mb-4">Assigned to: <strong className="text-zinc-700">{t.assignedTo}</strong></p>
                </div>
                <div className="pt-3 border-t border-zinc-100 flex justify-between items-center mt-2">
                  <span className="text-xs text-zinc-500 font-medium">Reported: {t.date}</span>
                  <span className="font-bold text-sm text-red-600">Cost: ₹{(parseFloat(t.estimatedCost) || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden p-16 text-center">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-lg font-bold text-zinc-900 mb-2">Subcontractor Retention Release</h3>
            <p className="text-sm text-zinc-500 max-w-md mx-auto">This section tracks the 5% retention money held from subcontractors during the execution phase, automatically flagging it for payout once the 12-month Project DLP expires.</p>
          </div>
        )}
      </div>

      {/* TICKET MODAL */}
      {isTicketModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-zinc-200 flex justify-between items-center bg-red-50 shrink-0">
              <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Log Warranty Issue</h2>
              <button onClick={() => setIsTicketModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSaveTicket} className="p-6 space-y-4">
              <div>
                <label className={labelClass}>Completed Project <span className="text-red-500">*</span></label>
                <select required value={ticketForm.projectId} onChange={e => setTicketForm({...ticketForm, projectId: e.target.value})} className={inputClass}>
                  <option value="">Select Project...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div><label className={labelClass}>Issue Description <span className="text-red-500">*</span></label><textarea required value={ticketForm.issue} onChange={e => setTicketForm({...ticketForm, issue: e.target.value})} className={`${inputClass} resize-y min-h-[80px]`} placeholder="e.g. Paint peeling in living room" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Assign Repair To</label><input type="text" value={ticketForm.assignedTo} onChange={e => setTicketForm({...ticketForm, assignedTo: e.target.value})} className={inputClass} placeholder="Subcontractor name" /></div>
                <div><label className={labelClass}>Est. Cost (₹)</label><input type="number" value={ticketForm.estimatedCost} onChange={e => setTicketForm({...ticketForm, estimatedCost: e.target.value})} className={inputClass} placeholder="0.00" /></div>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-zinc-100">
                <button type="button" onClick={() => setIsTicketModalOpen(false)} className="px-5 py-2.5 bg-white border border-zinc-300 rounded-xl text-xs font-bold uppercase tracking-widest text-zinc-700">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-[#B45309] text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-sm">Save Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}