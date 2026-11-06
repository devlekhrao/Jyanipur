import React, { useState, useEffect } from 'react';
import * as db from '../db';
import { sendWhatsAppMessage } from '../WhatsAppHelper';
import { exportToCSV } from '../utils';

export default function ClientSupport({ companySettings = {} }) {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    projectId: '',
    clientName: '',
    phone: '',
    title: '',
    category: 'Carpentry & Hardware',
    priority: 'Normal',
    status: 'Open',
    dateLogged: new Date().toISOString().split('T')[0],
    assignedTechnician: '',
    resolutionDate: '',
    notes: '',
    csatRating: 5
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [projs] = await Promise.all([
        db.getProjects ? db.getProjects() : Promise.resolve([])
      ]);
      setProjects(projs || []);
      const savedTickets = JSON.parse(localStorage.getItem('jyanipur_support_tickets') || '[]');
      setTickets(savedTickets);
    } catch (e) {
      console.error("Error loading support tickets:", e);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSaveTicket = (e) => {
    e.preventDefault();
    if (!formData.clientName || !formData.title) return alert("Please fill client name and issue description.");

    const selectedProj = projects.find(p => String(p.id || p._id) === String(formData.projectId));
    const newTicket = {
      ...formData,
      id: formData.id || Date.now(),
      ticketNo: formData.ticketNo || `SR-${Date.now().toString().slice(-4)}`,
      projectName: selectedProj ? (selectedProj.name || selectedProj.projectName) : 'Direct Client Request'
    };

    const existingIndex = tickets.findIndex(t => t.id === newTicket.id);
    let updated = [];
    if (existingIndex >= 0) {
      updated = [...tickets];
      updated[existingIndex] = newTicket;
    } else {
      updated = [newTicket, ...tickets];
    }

    setTickets(updated);
    localStorage.setItem('jyanipur_support_tickets', JSON.stringify(updated));
    setIsModalOpen(false);
    setFormData({ projectId: '', clientName: '', phone: '', title: '', category: 'Carpentry & Hardware', priority: 'Normal', status: 'Open', dateLogged: new Date().toISOString().split('T')[0], assignedTechnician: '', resolutionDate: '', notes: '', csatRating: 5 });
  };

  const handleQuickStatus = (ticket, newStatus) => {
    const updated = tickets.map(t => t.id === ticket.id ? { 
      ...t, 
      status: newStatus,
      resolutionDate: newStatus === 'Resolved' ? new Date().toISOString().split('T')[0] : t.resolutionDate 
    } : t);
    setTickets(updated);
    localStorage.setItem('jyanipur_support_tickets', JSON.stringify(updated));
  };

  const handleSendWhatsAppUpdate = (ticket) => {
    if (!ticket.phone) return alert("No client contact number saved.");
    const msg = `Hello ${ticket.clientName},\n\nUpdate on your service ticket *[${ticket.ticketNo}] - ${ticket.title}*:\nStatus: *${ticket.status.toUpperCase()}*\nAssigned Technician: *${ticket.assignedTechnician || 'Jyanipur Site Team'}*\n\nIf you have any questions, our support desk is at your service.\n- *${companySettings.companyName || 'Jyanipur Interiors'}*`;
    sendWhatsAppMessage(ticket.phone, msg);
  };

  const handleExport = () => {
    const data = filteredTickets.map(t => ({
      'Ticket No': t.ticketNo,
      'Date': t.dateLogged,
      'Client': t.clientName,
      'Phone': t.phone,
      'Project': t.projectName,
      'Issue Category': t.category,
      'Issue Title': t.title,
      'Priority': t.priority,
      'Status': t.status,
      'Technician': t.assignedTechnician,
      'Rating': `${t.csatRating} / 5`
    }));
    exportToCSV('Jyanipur_Client_Support_Tickets', data);
  };

  const filteredTickets = tickets.filter(t => {
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
    const matchesSearch = !searchQuery.trim() || 
      (t.clientName && t.clientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.ticketNo && t.ticketNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.title && t.title.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const openCount = tickets.filter(t => t.status === 'Open' || t.status === 'In Progress').length;
  const resolvedCount = tickets.filter(t => t.status === 'Resolved').length;

  return (
    <div className="w-full h-full flex flex-col font-['Inter',sans-serif]">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 mb-4 border-b border-zinc-200 shrink-0 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Client Care & Service Desk</h2>
          <p className="text-zinc-500 text-sm mt-1 font-medium">Manage warranty requests, after-handover maintenance visits, and customer satisfaction.</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleExport}
            className="h-10 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 px-4 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-2"
          >
            Export CSV
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="h-10 bg-zinc-900 hover:bg-black text-white px-5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-2 border border-black"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Log Service Request
          </button>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6 shrink-0">
        <div className="bg-white border border-zinc-200 p-5 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Active Tickets</span>
          <p className="text-3xl font-black text-zinc-900 tracking-tight">{openCount}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest block mb-1">Resolved Service Calls</span>
          <p className="text-3xl font-black text-emerald-800 tracking-tight">{resolvedCount}</p>
        </div>
        <div className="bg-zinc-900 border border-black p-5 rounded-xl shadow-sm text-white">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Average CSAT Score</span>
          <p className="text-3xl font-black tracking-tight">4.9 ★</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 p-1 bg-zinc-100 rounded-lg w-fit shrink-0 border border-zinc-200">
        {['All', 'Open', 'In Progress', 'Resolved'].map(tab => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
              statusFilter === tab ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tickets Table */}
      <div className="bg-white border border-zinc-200 rounded-xl shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden">
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[950px]">
            <thead>
              <tr className="bg-zinc-50 text-zinc-500 text-[10px] font-bold uppercase tracking-widest border-b border-zinc-200 sticky top-0 z-10">
                <th className="py-4 px-6 w-32">Ticket #</th>
                <th className="py-4 px-6 w-36">Logged Date</th>
                <th className="py-4 px-6">Client & Site</th>
                <th className="py-4 px-6 w-44">Category</th>
                <th className="py-4 px-6">Issue Summary</th>
                <th className="py-4 px-6 w-36">Technician</th>
                <th className="py-4 px-6 text-center w-36">Status</th>
                <th className="py-4 px-6 text-right w-44">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-sm">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-zinc-400 text-xs font-bold uppercase tracking-widest">
                    No client service tickets found. Click "+ Log Service Request" above.
                  </td>
                </tr>
              ) : (
                filteredTickets.map(ticket => (
                  <tr key={ticket.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-xs text-zinc-900">{ticket.ticketNo}</td>
                    <td className="py-4 px-6 text-xs text-zinc-500 font-mono">{ticket.dateLogged}</td>
                    <td className="py-4 px-6">
                      <p className="font-bold text-sm text-zinc-900 tracking-tight">{ticket.clientName}</p>
                      <span className="text-[10px] text-zinc-400 font-medium">{ticket.projectName}</span>
                    </td>
                    <td className="py-4 px-6 text-xs text-zinc-600 font-medium">{ticket.category}</td>
                    <td className="py-4 px-6 text-xs font-bold text-zinc-800 max-w-[240px] truncate">{ticket.title}</td>
                    <td className="py-4 px-6 text-xs font-bold text-zinc-700">{ticket.assignedTechnician || 'Unassigned'}</td>
                    <td className="py-4 px-6 text-center">
                      <select
                        value={ticket.status}
                        onChange={(e) => handleQuickStatus(ticket, e.target.value)}
                        className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border outline-none cursor-pointer ${
                          ticket.status === 'Resolved' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                          ticket.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleSendWhatsAppUpdate(ticket)}
                        title="Send WhatsApp update to client"
                        className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-900 hover:text-white rounded-lg text-[9px] font-bold uppercase tracking-widest text-zinc-700 transition-all border border-zinc-200"
                      >
                        Notify WA
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-zinc-200">
            <div className="px-6 py-5 border-b border-zinc-200 flex justify-between items-center bg-white shrink-0">
              <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Log Client Support Call</h2>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveTicket} className="p-6 overflow-y-auto space-y-4 bg-zinc-50/50">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Client Name *</label>
                  <input required type="text" value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} placeholder="e.g. Ramesh Reddy" className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 bg-white text-xs font-bold outline-none focus:ring-2 focus:ring-zinc-900" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Phone Number</label>
                  <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+91 98765 43210" className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 bg-white text-xs font-medium outline-none focus:ring-2 focus:ring-zinc-900" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Project Site (Optional)</label>
                <select value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value})} className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 bg-white text-xs font-bold outline-none cursor-pointer">
                  <option value="">Direct Client / Unassigned</option>
                  {projects.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name || p.projectName}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Issue Category</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 bg-white text-xs font-bold outline-none cursor-pointer">
                    <option value="Carpentry & Hardware">Carpentry & Hardware</option>
                    <option value="Electrical & Lighting">Electrical & Lighting</option>
                    <option value="Plumbing & Drainage">Plumbing & Drainage</option>
                    <option value="Paint Touch-up">Paint Touch-up</option>
                    <option value="Waterproofing">Waterproofing</option>
                    <option value="Glass & Mirrors">Glass & Mirrors</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Assign Technician</label>
                  <input type="text" value={formData.assignedTechnician} onChange={e => setFormData({...formData, assignedTechnician: e.target.value})} placeholder="e.g. Ali (Carpenter)" className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 bg-white text-xs font-medium outline-none focus:ring-2 focus:ring-zinc-900" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Issue Title / Description *</label>
                <textarea required rows="3" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Master bedroom wardrobe sliding door alignment required..." className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 bg-white text-xs font-medium outline-none focus:ring-2 focus:ring-zinc-900" />
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-zinc-200">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-white border border-zinc-200 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-700 cursor-pointer">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-zinc-900 hover:bg-black text-white rounded-lg text-[10px] font-bold uppercase tracking-widest cursor-pointer">Save Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}