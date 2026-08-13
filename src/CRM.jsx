import React, { useState, useEffect } from 'react';
import { getLeads, saveLead, updateLeadStatus, deleteLead } from './db';
import { exportToCSV } from './utils'; // Imported the export utility

export default function CRM() {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: null, clientName: '', phone: '', projectType: 'Residential 3BHK', estimatedValue: '', status: 'New Inquiry', notes: ''
  });

  const loadData = async () => {
    setLoading(true);
    const data = await getLeads();
    setLeads(data);
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

  // Added the handleExport function
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

  const inputClass = "w-full px-4 py-3 rounded-xl border-none bg-zinc-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 text-sm font-medium transition-all shadow-inner";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1";

  return (
    <div className="w-full font-['Poppins'] pb-12 relative h-full flex flex-col">
      <div className="flex justify-between items-end pb-4 border-b border-zinc-300/50 mb-6 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-zinc-800 tracking-tight">CRM Pipeline</h2>
          <p className="text-zinc-500 text-xs mt-1 font-medium">Track incoming inquiries and close more deals.</p>
        </div>
        <div className="flex gap-2">
           {/* Added Export Button */}
          <button onClick={handleExport} className="bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm">
            📥 Export CSV
          </button>
          <button onClick={() => setIsModalOpen(true)} className="bg-zinc-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md">+ Add New Lead</button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-zinc-400 font-medium text-xs">Loading sales pipeline...</div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1 items-start custom-scrollbar">
          {columns.map(col => (
            <div key={col} className="min-w-[280px] w-[280px] flex flex-col gap-3 bg-zinc-100/50 rounded-2xl p-3 border border-zinc-200/50">
              <div className="flex justify-between items-center px-2 py-1">
                <h3 className="text-xs font-bold text-zinc-700 uppercase tracking-widest">{col}</h3>
                <span className="bg-zinc-200 text-zinc-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{leads.filter(l => l.status === col).length}</span>
              </div>
              
              <div className="flex flex-col gap-3">
                {leads.filter(l => l.status === col).map(lead => (
                  <div key={lead.id} className="bg-white/90 backdrop-blur-sm border border-zinc-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow group relative">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-zinc-900 text-sm truncate pr-4">{lead.clientName}</h4>
                      <button onClick={() => handleDelete(lead.id)} className="absolute top-3 right-3 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-xs">&times;</button>
                    </div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">{lead.projectType}</p>
                    <p className="text-xs text-zinc-600 font-medium mb-3">Est: <span className="font-bold text-emerald-600">₹{lead.estimatedValue.toLocaleString('en-IN')}</span></p>
                    
                    <div className="flex justify-between items-center pt-3 border-t border-zinc-100">
                      <a href={`tel:${lead.phone}`} className="text-[10px] font-bold text-blue-500 hover:underline">📞 Call</a>
                      <select 
                        value={lead.status} 
                        onChange={(e) => handleStatusMove(lead.id, e.target.value)}
                        className="text-[9px] font-bold uppercase tracking-widest bg-zinc-100 text-zinc-600 rounded px-2 py-1 outline-none cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-8">
            <h2 className="text-xl font-bold text-zinc-900 mb-1">New Inquiry</h2>
            <p className="text-zinc-500 text-[10px] font-medium mb-6 uppercase tracking-widest">Add a potential client to your pipeline.</p>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className={labelClass}>Client Name *</label>
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
              <div className="flex gap-3 pt-4 border-t border-zinc-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-zinc-100 text-zinc-600 font-bold rounded-xl text-xs">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-zinc-900 text-white font-bold rounded-xl text-xs">Save Lead</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}