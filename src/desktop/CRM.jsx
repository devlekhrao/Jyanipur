import React, { useState, useEffect } from 'react';
import { getLeads, saveLead, updateLeadStatus, deleteLead } from '../db';
import { exportToCSV } from '../utils';

export default function CRM() {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: null, 
    clientName: '', 
    phone: '', 
    email: '',
    occupation: '', 
    address: '',    
    projectType: 'Residential 3BHK', 
    estimatedValue: '', 
    source: 'Direct Inquiry',
    status: 'New Inquiry', 
    notes: '',
    followUpCount: 0,
    dateAdded: new Date().toISOString().split('T')[0]
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getLeads();
      // Sort by newest first based on dateAdded or id
      const sortedData = (data || []).sort((a, b) => (b.id || 0) - (a.id || 0));
      setLeads(sortedData);
    } catch (e) {
      console.warn("Ensure getLeads is in db.js");
      setLeads([]);
    }
    setLoading(false);
  };

  // Intercept leads pushed from the Estimation module
  const checkPendingEstimationLeads = async () => {
    const pending = JSON.parse(localStorage.getItem('jyanipur_crm_leads') || '[]');
    if (pending.length > 0) {
      for (let lead of pending) {
        const numericValue = typeof lead.value === 'string' ? parseFloat(lead.value.replace(/[^0-9.-]+/g, "")) : (lead.value || 0);
        
        await saveLead({
          clientName: lead.name,
          phone: lead.phone || '',
          email: lead.email || '',
          occupation: lead.company || '', 
          address: lead.address || '',
          projectType: 'Estimation Sync',
          estimatedValue: numericValue,
          source: lead.source || 'Estimation',
          status: lead.status || 'Negotiation', 
          notes: 'Auto-imported from Estimation module.',
          followUpCount: 0,
          dateAdded: new Date().toISOString().split('T')[0]
        });
      }
      localStorage.removeItem('jyanipur_crm_leads');
      await loadData();
    }
  };

  useEffect(() => {
    checkPendingEstimationLeads().then(() => loadData());
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    await saveLead({ 
      ...formData, 
      estimatedValue: parseFloat(formData.estimatedValue) || 0,
      followUpCount: formData.followUpCount || 0,
      dateAdded: formData.dateAdded || new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(false);
    resetForm();
    await loadData();
  };

  const handleEdit = (lead) => {
    setFormData({
      id: lead.id,
      clientName: lead.clientName || '',
      phone: lead.phone || '',
      email: lead.email || '',
      occupation: lead.occupation || '',
      address: lead.address || '',
      projectType: lead.projectType || 'Residential 3BHK',
      estimatedValue: lead.estimatedValue || '',
      source: lead.source || 'Direct Inquiry',
      status: lead.status || 'New Inquiry',
      notes: lead.notes || '',
      followUpCount: lead.followUpCount || 0,
      dateAdded: lead.dateAdded || new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({ 
      id: null, clientName: '', phone: '', email: '', occupation: '', address: '', 
      projectType: 'Residential 3BHK', estimatedValue: '', source: 'Direct Inquiry', 
      status: 'New Inquiry', notes: '', followUpCount: 0, dateAdded: new Date().toISOString().split('T')[0] 
    });
  };

  const handleStatusMove = async (id, newStatus) => {
    try {
      const lead = leads.find(l => l.id === id);
      if(lead) {
        await saveLead({ ...lead, status: newStatus });
        await loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddFollowUp = async (lead) => {
    try {
      const newCount = (lead.followUpCount || 0) + 1;
      await saveLead({ ...lead, followUpCount: newCount });
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this lead permanently?")) {
      await deleteLead(id);
      await loadData();
    }
  };

  const handleCreateEstimation = (lead) => {
    const draft = {
      partyName: lead.clientName || '',
      partyAddress: lead.address || '',
      projectName: lead.occupation || lead.projectType || '',
      description: lead.notes || ''
    };
    localStorage.setItem('crm_to_estimation', JSON.stringify(draft));
    alert(`Details for ${lead.clientName} saved to clipboard memory! Navigate to "Estimation" and create a new estimate to use this data.`);
  };

  const handleExport = () => {
    const exportData = leads.map(l => ({
      'Date Added': l.dateAdded || '',
      'Client Name': l.clientName,
      'Phone': l.phone,
      'Email': l.email,
      'Occupation / Company': l.occupation,
      'Address': l.address,
      'Project Type': l.projectType,
      'Source': l.source,
      'Status': l.status,
      'Follow-ups': l.followUpCount || 0,
      'Est. Value (INR)': l.estimatedValue,
      'Notes': l.notes
    }));
    exportToCSV('Jyanipur_CRM_Leads', exportData);
  };

  const filteredLeads = leads.filter(l => {
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (
        (l.clientName && l.clientName.toLowerCase().includes(q)) ||
        (l.phone && l.phone.toLowerCase().includes(q)) ||
        (l.email && l.email.toLowerCase().includes(q)) ||
        (l.projectType && l.projectType.toLowerCase().includes(q)) ||
        (l.status && l.status.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const columns = ['New Inquiry', 'Site Visited', 'Negotiation', 'Won', 'Lost'];

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-inset focus:ring-[#B45309] text-zinc-900 text-sm font-medium transition-all disabled:opacity-75 disabled:cursor-not-allowed";
  const labelClass = "block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 ml-0.5";

  return (
    <div className="w-full h-full flex flex-col" style={{ fontFamily: 'Poppins, sans-serif' }}>
      {/* HEADER & FILTERS */}
      <div className="flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center pb-5 mb-6 border-b border-zinc-200 shrink-0 gap-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 tracking-tight">CRM Pipeline</h2>
          <p className="text-zinc-500 text-sm mt-0.5 font-medium">Manage leads, track contact attempts, and convert to estimates.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          
          <div className="flex items-center h-10 bg-white border border-zinc-200 rounded-xl px-3.5 shadow-sm w-full md:w-auto">
            <span className="text-sm text-zinc-400">🔍</span>
            <input type="text" placeholder="Search name, phone, status..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-transparent border-none text-sm font-medium text-zinc-800 outline-none px-2 w-full md:w-56 placeholder:text-zinc-400" />
          </div>

          <button onClick={handleExport} className="h-10 bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 px-4 rounded-xl text-sm font-medium transition-all shadow-sm cursor-pointer flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            <span className="hidden sm:inline">Export</span>
          </button>
          
          <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="h-10 bg-[#B45309] hover:bg-[#92400E] text-white px-5 rounded-xl text-sm font-medium transition-all shadow-sm cursor-pointer flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add New Lead
          </button>
        </div>
      </div>

      {/* TABLE VIEW */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-zinc-50/80 text-zinc-500 text-[11px] uppercase tracking-wider border-b border-zinc-200">
                <th className="py-4 px-6 font-semibold">Date Added</th>
                <th className="py-4 px-6 font-semibold">Client Profile</th>
                <th className="py-4 px-6 font-semibold">Contact Details</th>
                <th className="py-4 px-6 font-semibold">Project / Source</th>
                <th className="py-4 px-6 font-semibold text-center">Follow-ups</th>
                <th className="py-4 px-6 font-semibold text-center">Status</th>
                <th className="py-4 px-6 font-semibold text-right">Est. Value</th>
                <th className="py-4 px-6 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-sm">
              {loading ? (
                <tr><td colSpan="8" className="py-12 text-center text-zinc-400 font-medium text-sm">Loading leads...</td></tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-500">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                      </div>
                      <p className="text-zinc-500 font-medium text-sm">No leads found in pipeline.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="transition-all hover:bg-zinc-50/80 group">
                    <td className="py-4 px-6 text-sm font-medium text-zinc-500">{lead.dateAdded || '-'}</td>
                    
                    <td className="py-4 px-6">
                      <p className="font-semibold text-sm text-zinc-900">{lead.clientName}</p>
                      {lead.occupation && <p className="text-[11px] font-medium text-zinc-500 mt-0.5 truncate max-w-[150px]">{lead.occupation}</p>}
                    </td>
                    
                    <td className="py-4 px-6">
                      <p className="text-sm font-medium text-zinc-800">{lead.phone || 'No Phone'}</p>
                      {lead.email && <p className="text-[11px] font-medium text-zinc-500 mt-0.5">{lead.email}</p>}
                    </td>
                    
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="inline-block bg-zinc-100 text-zinc-600 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded">{lead.projectType}</span>
                        {lead.source && <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">{lead.source}</span>}
                      </div>
                    </td>

                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="font-medium text-zinc-800 text-sm bg-white border border-zinc-200 w-7 h-7 flex items-center justify-center rounded-md shadow-sm">
                          {lead.followUpCount || 0}
                        </span>
                        <button onClick={() => handleAddFollowUp(lead)} title="Add Attempt" className="text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 rounded p-1 transition-all cursor-pointer">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                        </button>
                      </div>
                    </td>
                    
                    <td className="py-4 px-6 text-center">
                      <select
                        value={lead.status || 'New Inquiry'}
                        onChange={(e) => handleStatusMove(lead.id, e.target.value)}
                        className={`appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23A1A1AA%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.6rem_center] bg-[length:0.8rem_0.8rem] pr-7 pl-3 py-1.5 rounded-full border outline-none cursor-pointer transition-all text-[11px] font-semibold uppercase tracking-wider ${
                          lead.status === 'Won' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 focus:ring-2 focus:ring-emerald-500/20' :
                          lead.status === 'Lost' ? 'bg-red-50 text-red-700 border-red-200 focus:ring-2 focus:ring-red-500/20' :
                          lead.status === 'Negotiation' ? 'bg-amber-50 text-amber-700 border-amber-200 focus:ring-2 focus:ring-amber-500/20' :
                          lead.status === 'Site Visited' ? 'bg-blue-50 text-blue-700 border-blue-200 focus:ring-2 focus:ring-blue-500/20' :
                          'bg-zinc-50 text-zinc-700 border-zinc-200 focus:ring-2 focus:ring-zinc-500/20'
                        }`}
                      >
                        {columns.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>

                    <td className="py-4 px-6 text-right font-medium text-sm text-[#B45309]">
                      ₹{(lead.estimatedValue || 0).toLocaleString('en-IN')}
                    </td>
                    
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        
                        {/* Direct Communication Buttons */}
                        {lead.phone && (
                          <a href={`tel:${lead.phone}`} title="Call Client" className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 rounded-lg transition-all">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                          </a>
                        )}
                        {lead.email && (
                          <a href={`mailto:${lead.email}`} title="Email Client" className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-200 rounded-lg transition-all">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                          </a>
                        )}

                        <button onClick={() => handleEdit(lead)} title="Edit Profile" className="px-3 py-1.5 bg-zinc-50 text-zinc-600 hover:bg-zinc-200 border border-zinc-200 rounded-lg font-semibold cursor-pointer text-[11px] uppercase tracking-wider transition-all">
                          Edit
                        </button>
                        
                        <button onClick={() => handleCreateEstimation(lead)} title="Create Estimation for Lead" className="px-3 py-1.5 bg-amber-50 text-[#B45309] hover:bg-[#B45309] hover:text-white border border-amber-200/60 rounded-lg font-semibold cursor-pointer text-[11px] uppercase tracking-wider transition-all">
                          Est.
                        </button>
                        
                        <button onClick={() => handleDelete(lead.id)} title="Delete Lead" className="p-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 rounded-lg transition-all">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD/EDIT LEAD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-3xl rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-zinc-200 flex justify-between items-center bg-zinc-50 shrink-0">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900">{formData.id ? 'Edit Client Profile' : 'New Client Inquiry'}</h2>
                <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mt-0.5">Comprehensive CRM Lead Details</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <form id="leadForm" onSubmit={handleSave} className="space-y-6">
                
                {/* Section 1: Contact Details */}
                <div>
                  <h3 className="text-[11px] font-semibold text-[#B45309] uppercase tracking-wider mb-3 border-b border-zinc-100 pb-2">1. Primary Contact</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Client Full Name <span className="text-red-500">*</span></label>
                      <input type="text" required value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} className={inputClass} placeholder="e.g. John Doe" />
                    </div>
                    <div>
                      <label className={labelClass}>Occupation / Company</label>
                      <input type="text" value={formData.occupation} onChange={e => setFormData({...formData, occupation: e.target.value})} className={inputClass} placeholder="What work do they do?" />
                    </div>
                    <div>
                      <label className={labelClass}>Phone Number</label>
                      <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className={inputClass} placeholder="+91 98765 43210" />
                    </div>
                    <div>
                      <label className={labelClass}>Email Address</label>
                      <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className={inputClass} placeholder="client@example.com" />
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelClass}>Location / Address</label>
                      <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className={inputClass} placeholder="Where do they live?" />
                    </div>
                  </div>
                </div>

                {/* Section 2: Project Details */}
                <div>
                  <h3 className="text-[11px] font-semibold text-[#B45309] uppercase tracking-wider mb-3 border-b border-zinc-100 pb-2">2. Requirement Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={labelClass}>Project Type</label>
                      <select value={formData.projectType} onChange={e => setFormData({...formData, projectType: e.target.value})} className={`${inputClass} appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}>
                        <option value="Residential 2BHK">Residential 2BHK</option>
                        <option value="Residential 3BHK">Residential 3BHK</option>
                        <option value="Villa">Villa</option>
                        <option value="Commercial Office">Commercial Office</option>
                        <option value="Retail Store">Retail Store</option>
                        <option value="Estimation Sync">Estimation Sync</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Estimated Value (₹)</label>
                      <input type="number" step="any" value={formData.estimatedValue} onChange={e => setFormData({...formData, estimatedValue: e.target.value})} className={inputClass} placeholder="0.00" />
                    </div>
                    <div>
                      <label className={labelClass}>Lead Source</label>
                      <select value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})} className={`${inputClass} appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}>
                        <option value="Direct Inquiry">Direct Inquiry</option>
                        <option value="Instagram">Instagram</option>
                        <option value="Referral">Referral</option>
                        <option value="Website">Website</option>
                        <option value="Estimation">Estimation Module</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="md:col-span-3">
                      <label className={labelClass}>Internal Notes / Requirements</label>
                      <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Specific client requests, design preferences, timeline requirements..." className={`${inputClass} resize-y min-h-[80px]`} />
                    </div>
                  </div>
                </div>

              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-zinc-200 flex justify-end gap-3 bg-zinc-50 shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-semibold rounded-xl text-sm transition-all cursor-pointer">
                Cancel
              </button>
              <button type="submit" form="leadForm" className="px-6 py-2.5 bg-[#B45309] hover:bg-[#92400E] text-white font-medium rounded-xl text-sm shadow-sm transition-all cursor-pointer">
                {formData.id ? 'Update Lead' : 'Save Lead'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}