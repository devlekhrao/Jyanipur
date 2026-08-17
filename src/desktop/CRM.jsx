import React, { useState, useEffect } from 'react';
import { getLeads, saveLead, updateLeadStatus, deleteLead } from '../db';
import { exportToCSV } from '../utils';

export default function CRM() {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: null, 
    clientName: '', 
    phone: '', 
    email: '',
    occupation: '', // What work they do
    address: '',    // Where they live
    projectType: 'Residential 3BHK', 
    estimatedValue: '', 
    source: 'Direct Inquiry',
    status: 'New Inquiry', 
    notes: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getLeads();
      setLeads(data || []);
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
        // Clean currency string to number
        const numericValue = typeof lead.value === 'string' ? parseFloat(lead.value.replace(/[^0-9.-]+/g, "")) : (lead.value || 0);
        
        await saveLead({
          clientName: lead.name,
          phone: lead.phone || '',
          email: lead.email || '',
          occupation: lead.company || '', // Mapped from Estimation Project/Company
          address: lead.address || '',
          projectType: 'Estimation Sync',
          estimatedValue: numericValue,
          source: lead.source || 'Estimation',
          status: lead.status || 'Negotiation', // Put straight into negotiation
          notes: 'Auto-imported from Estimation module.'
        });
      }
      // Clear them so they don't import twice
      localStorage.removeItem('jyanipur_crm_leads');
      await loadData();
    }
  };

  useEffect(() => {
    checkPendingEstimationLeads().then(() => loadData());
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    await saveLead({ ...formData, estimatedValue: parseFloat(formData.estimatedValue) || 0 });
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
      notes: lead.notes || ''
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({ id: null, clientName: '', phone: '', email: '', occupation: '', address: '', projectType: 'Residential 3BHK', estimatedValue: '', source: 'Direct Inquiry', status: 'New Inquiry', notes: '' });
  };

  const handleStatusMove = async (id, newStatus) => {
    await updateLeadStatus(id, newStatus);
    await loadData();
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this lead permanently?")) {
      await deleteLead(id);
      await loadData();
    }
  };

  const handleExport = () => {
    const exportData = leads.map(l => ({
      'Client Name': l.clientName,
      'Phone': l.phone,
      'Email': l.email,
      'Occupation / Company': l.occupation,
      'Address': l.address,
      'Project Type': l.projectType,
      'Source': l.source,
      'Status': l.status,
      'Est. Value (INR)': l.estimatedValue,
      'Notes': l.notes
    }));
    exportToCSV('Jyanipur_CRM_Leads', exportData);
  };

  const columns = ['New Inquiry', 'Site Visited', 'Negotiation', 'Won', 'Lost'];

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-inset focus:ring-[#B45309] text-zinc-900 text-xs font-medium transition-all disabled:opacity-75 disabled:cursor-not-allowed";
  const labelClass = "block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 ml-0.5";

  return (
    <div className="w-full h-full font-['Poppins'] flex flex-col">
      {/* HEADER */}
      <div className="flex justify-between items-center pb-5 mb-6 border-b border-zinc-200 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">CRM Pipeline</h2>
          <p className="text-zinc-500 text-xs mt-0.5 font-medium">Track incoming inquiries, build client profiles, and close more deals.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExport} className="bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export CSV
          </button>
          <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-[#B45309] hover:bg-[#92400E] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add New Lead
          </button>
        </div>
      </div>

      {/* KANBAN BOARD */}
      {loading ? (
        <div className="py-20 text-center text-zinc-400 font-medium text-xs flex-1 flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-4 border-zinc-200 border-t-[#B45309] rounded-full animate-spin"></div>
          <p>Loading sales pipeline...</p>
        </div>
      ) : (
        <div className="flex w-full gap-5 flex-1 min-h-0 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {columns.map(col => (
            <div key={col} className="flex-1 min-w-[280px] flex flex-col bg-zinc-50/50 border border-zinc-200/80 rounded-2xl shadow-sm overflow-hidden">
              
              {/* Column Header */}
              <div className="px-4 py-3.5 border-b border-zinc-200 bg-white flex justify-between items-center shrink-0">
                <h3 className="text-[10px] font-black text-zinc-800 uppercase tracking-widest flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    col === 'Won' ? 'bg-emerald-500' : 
                    col === 'Lost' ? 'bg-red-500' : 
                    col === 'Negotiation' ? 'bg-amber-500' : 'bg-blue-500'
                  }`}></span>
                  {col}
                </h3>
                <span className="bg-zinc-100 text-zinc-500 text-[10px] font-black px-2 py-0.5 rounded-md">
                  {leads.filter(l => l.status === col).length}
                </span>
              </div>
              
              {/* Column Body */}
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {leads.filter(l => l.status === col).map(lead => (
                  <div key={lead.id} className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-[#B45309]/30 transition-all group relative cursor-pointer" onClick={() => handleEdit(lead)}>
                    
                    {/* Header: Name & Action */}
                    <div className="flex justify-between items-start mb-1.5">
                      <h4 className="font-bold text-zinc-900 text-sm truncate pr-6">{lead.clientName}</h4>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(lead.id); }} className="absolute top-4 right-3 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>

                    {/* Metadata Sub-text */}
                    {lead.occupation && (
                      <p className="text-[10px] text-zinc-500 font-medium mb-1 truncate flex items-center gap-1.5">
                        <svg className="w-3 h-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        {lead.occupation}
                      </p>
                    )}
                    {lead.address && (
                      <p className="text-[10px] text-zinc-500 font-medium mb-3 truncate flex items-center gap-1.5">
                        <svg className="w-3 h-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        {lead.address}
                      </p>
                    )}

                    {/* Tags & Value */}
                    <div className="flex justify-between items-end mb-3">
                      <div className="space-y-1">
                        <span className="inline-block bg-zinc-100 text-zinc-600 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded mr-1.5">{lead.projectType}</span>
                        {lead.source && <span className="inline-block border border-zinc-200 text-zinc-400 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded">{lead.source}</span>}
                      </div>
                      <p className="text-xs font-black text-[#B45309]">₹{(lead.estimatedValue || 0).toLocaleString('en-IN')}</p>
                    </div>
                    
                    {/* Status Dropdown & Fast Actions */}
                    <div className="flex justify-between items-center pt-3 border-t border-zinc-100 mt-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        {lead.phone && (
                          <a href={`tel:${lead.phone}`} title="Call Client" className="text-emerald-600 hover:bg-emerald-50 p-1.5 rounded-md transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                          </a>
                        )}
                      </div>
                      
                      <select 
                        value={lead.status} 
                        onChange={(e) => handleStatusMove(lead.id, e.target.value)}
                        className={`appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23A1A1AA%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%223%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.4rem_center] bg-[length:0.6rem_0.6rem] pr-6 pl-2 py-1 rounded text-[9px] font-black uppercase tracking-wider border outline-none cursor-pointer transition-all ${
                          lead.status === 'Won' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                          lead.status === 'Lost' ? 'bg-red-50 border-red-200 text-red-700' :
                          lead.status === 'Negotiation' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                          'bg-zinc-50 border-zinc-200 text-zinc-700'
                        }`}
                      >
                        {columns.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* ADD/EDIT LEAD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-3xl rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-zinc-200 flex justify-between items-center bg-zinc-50 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">{formData.id ? 'Edit Client Profile' : 'New Client Inquiry'}</h2>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">Comprehensive CRM Lead Details</p>
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
                  <h3 className="text-[10px] font-black text-[#B45309] uppercase tracking-widest mb-3 border-b border-zinc-100 pb-2">1. Primary Contact</h3>
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
                  <h3 className="text-[10px] font-black text-[#B45309] uppercase tracking-widest mb-3 border-b border-zinc-100 pb-2">2. Requirement Details</h3>
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
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-bold rounded-xl text-xs transition-all cursor-pointer">
                Cancel
              </button>
              <button type="submit" form="leadForm" className="px-6 py-2.5 bg-[#B45309] hover:bg-[#92400E] text-white font-bold rounded-xl text-xs shadow-sm transition-all cursor-pointer">
                {formData.id ? 'Update Lead' : 'Save Lead'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}