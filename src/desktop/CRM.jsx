import React, { useState, useEffect } from 'react';
import { getLeads, saveLead, updateLeadStatus, deleteLead } from '.../db';
import { exportToCSV } from '../utils';

export default function CRM() {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: null, clientName: '', phone: '', projectType: 'Residential 3BHK', estimatedValue: '', status: 'New Inquiry', notes: ''
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

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    await saveLead({ ...formData, estimatedValue: parseFloat(formData.estimatedValue) || 0 });
    setIsModalOpen(false);
    setFormData({ id: null, clientName: '', phone: '', projectType: 'Residential 3BHK', estimatedValue: '', status: 'New Inquiry', notes: '' });
    await loadData();
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
      'Project Type': l.projectType,
      'Status': l.status,
      'Est. Value (INR)': l.estimatedValue,
      'Notes': l.notes
    }));
    exportToCSV('Jyanipur_CRM_Leads', exportData);
  };

  const columns = ['New Inquiry', 'Site Visited', 'Quote Sent', 'Won', 'Lost'];

  const inputClass = "w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-zinc-900 text-xs font-medium transition-all shadow-sm";
  const labelClass = "block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="w-full h-full font-['Poppins'] flex flex-col">
      {/* HEADER */}
      <div className="flex justify-between items-end pb-4 border-b border-zinc-200 mb-6 shrink-0">
        <div>
          <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">CRM Pipeline</h2>
          <p className="text-zinc-500 text-xs mt-1 font-medium">Track incoming inquiries and close more deals.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer">
            📥 Export CSV
          </button>
          <button onClick={() => setIsModalOpen(true)} className="bg-[#1E3A8A] hover:bg-blue-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer">
            + Add New Lead
          </button>
        </div>
      </div>

      {/* KANBAN BOARD */}
      {loading ? (
        <div className="py-20 text-center text-zinc-400 font-medium text-xs flex-1">Loading sales pipeline...</div>
      ) : (
        /* min-h-0 prevents the flexbox from expanding beyond the screen height */
        <div className="flex w-full gap-4 flex-1 min-h-0">
          {columns.map(col => (
            <div key={col} className="flex-1 flex flex-col bg-white border border-zinc-200 rounded-[1.5rem] shadow-sm overflow-hidden">
              
              {/* Column Header */}
              <div className="px-4 py-3 border-b border-zinc-100 flex justify-between items-center shrink-0 bg-zinc-50/50">
                <h3 className="text-[10px] font-extrabold text-zinc-800 uppercase tracking-widest">{col}</h3>
                <span className="bg-zinc-200 text-zinc-700 text-[10px] font-bold px-2 py-0.5 rounded-md">{leads.filter(l => l.status === col).length}</span>
              </div>
              
              {/* Column Body (Scrollable with hidden scrollbars) */}
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {leads.filter(l => l.status === col).map(lead => (
                  <div key={lead.id} className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow group relative">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-extrabold text-zinc-900 text-sm truncate pr-4">{lead.clientName}</h4>
                      <button onClick={() => handleDelete(lead.id)} className="absolute top-3 right-3 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-sm cursor-pointer">&times;</button>
                    </div>
                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">{lead.projectType}</p>
                    <p className="text-xs text-zinc-600 font-medium mb-3">Est: <span className="font-bold text-emerald-600">₹{lead.estimatedValue.toLocaleString('en-IN')}</span></p>
                    
                    <div className="flex justify-between items-center pt-3 border-t border-zinc-100">
                      <a href={`tel:${lead.phone}`} className="text-[10px] font-bold text-[#1E3A8A] hover:underline">📞 Call</a>
                      <select 
                        value={lead.status} 
                        onChange={(e) => handleStatusMove(lead.id, e.target.value)}
                        className="text-[9px] font-bold uppercase tracking-widest bg-zinc-100 border border-zinc-200 text-zinc-700 rounded-lg px-2 py-1 outline-none cursor-pointer"
                      >
                        {columns.map(c => <option key={c} value={c}>Move to {c}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* ADD LEAD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-extrabold text-zinc-900 mb-1">New Inquiry</h2>
            <p className="text-zinc-500 text-[10px] font-bold mb-6 uppercase tracking-widest">Add a potential client to your pipeline.</p>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className={labelClass}>Client Name <span className="text-red-500">*</span></label>
                <input type="text" required value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Phone</label>
                  <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Est. Value (₹)</label>
                  <input type="number" value={formData.estimatedValue} onChange={e => setFormData({...formData, estimatedValue: e.target.value})} className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Project Type</label>
                <select value={formData.projectType} onChange={e => setFormData({...formData, projectType: e.target.value})} className={`${inputClass} cursor-pointer`}>
                  <option value="Residential 2BHK">Residential 2BHK</option>
                  <option value="Residential 3BHK">Residential 3BHK</option>
                  <option value="Villa">Villa</option>
                  <option value="Commercial Office">Commercial Office</option>
                  <option value="Retail Store">Retail Store</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Notes</label>
                <input type="text" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Met via Instagram, wants minimal theme..." className={inputClass} />
              </div>
              <div className="flex gap-3 pt-6 border-t border-zinc-100 mt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-3.5 bg-[#1E3A8A] hover:bg-blue-900 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all shadow-md cursor-pointer">
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}