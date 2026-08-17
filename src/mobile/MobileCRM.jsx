import React, { useState, useEffect } from 'react';
import { getLeads, saveLead, updateLeadStatus, deleteLead } from '../db';
import { exportToCSV } from '../utils';

export default function MobileCRM() {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  
  // Mobile specific: Track which status tab is currently selected
  const [activeStatusTab, setActiveStatusTab] = useState('New Inquiry');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: null, clientName: '', phone: '', projectType: 'Residential 3BHK', estimatedValue: '', status: 'New Inquiry', notes: ''
  });

  const columns = ['New Inquiry', 'Site Visited', 'Quote Sent', 'Won', 'Lost'];

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

  const inputClass = "w-full px-4 py-3.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-zinc-900 text-sm font-medium transition-all shadow-sm";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1";

  // Filter leads for the currently selected mobile tab
  const activeLeads = leads.filter(l => l.status === activeStatusTab);

  return (
    <div className="w-full h-full flex flex-col font-['Poppins']">
      
      {/* HEADER SECTION */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Pipeline</h2>
            <p className="text-zinc-500 text-[10px] mt-0.5 font-bold uppercase tracking-widest">Client CRM</p>
          </div>
          <button 
            onClick={handleExport} 
            className="p-2 bg-white border border-zinc-200 rounded-xl shadow-sm text-lg text-zinc-600 active:scale-95 transition-transform"
            aria-label="Export to CSV"
          >
            📥
          </button>
        </div>
        
        {/* ADD NEW LEAD BUTTON */}
        <button 
          onClick={() => setIsModalOpen(true)} 
          className="w-full mt-3 bg-[#1E3A8A] hover:bg-blue-900 text-white py-3.5 rounded-xl text-xs font-semibold text-[11px] uppercase tracking-wider transition-all shadow-md active:scale-[0.98]"
        >
          + Add New Inquiry
        </button>
      </div>

      {/* SWIPEABLE STATUS TABS */}
      <div className="flex overflow-x-auto gap-2 pb-2 mb-2 -mx-4 px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {columns.map(col => {
          const count = leads.filter(l => l.status === col).length;
          const isActive = activeStatusTab === col;
          return (
            <button
              key={col}
              onClick={() => setActiveStatusTab(col)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-[10px] font-semibold text-[11px] uppercase tracking-widest shrink-0 transition-all ${
                isActive 
                  ? 'bg-zinc-900 text-white shadow-md' 
                  : 'bg-white border border-zinc-200 text-zinc-500'
              }`}
            >
              {col}
              <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${isActive ? 'bg-zinc-700 text-white' : 'bg-zinc-100 text-zinc-400'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ACTIVE LEADS LIST */}
      {loading ? (
        <div className="py-20 text-center text-zinc-400 font-medium text-xs flex-1">Loading pipeline...</div>
      ) : (
        <div className="flex-1 overflow-y-auto pb-4 space-y-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {activeLeads.length === 0 ? (
            <div className="text-center py-12 bg-white/50 border border-zinc-200 border-dashed rounded-3xl mt-4">
              <span className="text-3xl mb-2 block">📭</span>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">No leads in {activeStatusTab}</p>
            </div>
          ) : (
            activeLeads.map(lead => (
              <div key={lead.id} className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm active:scale-[0.99] transition-transform">
                
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-bold text-zinc-900 text-base leading-tight pr-4">{lead.clientName}</h4>
                  <button 
                    onClick={() => handleDelete(lead.id)} 
                    className="text-zinc-300 hover:text-red-500 active:text-red-600 p-1 -mr-2 -mt-2 transition-colors"
                  >
                    ✕
                  </button>
                </div>
                
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">
                  {lead.projectType} • <span className="text-emerald-600">₹{lead.estimatedValue.toLocaleString('en-IN')}</span>
                </p>
                
                {lead.notes && (
                  <p className="text-xs text-zinc-600 mb-4 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100 line-clamp-2">
                    {lead.notes}
                  </p>
                )}
                
                <div className="flex justify-between items-center gap-3 pt-3 border-t border-zinc-100">
                  <a 
                    href={`tel:${lead.phone}`} 
                    className="flex-1 text-center py-2.5 bg-green-50 text-green-700 rounded-xl text-[10px] font-semibold text-[11px] uppercase tracking-widest active:bg-green-100 transition-colors"
                  >
                    📞 Call
                  </a>
                  
                  <div className="flex-1 relative">
                    <select 
                      value={lead.status} 
                      onChange={(e) => handleStatusMove(lead.id, e.target.value)}
                      className="w-full appearance-none py-2.5 px-3 bg-zinc-100 text-zinc-700 rounded-xl text-[10px] font-semibold text-[11px] uppercase tracking-widest border border-zinc-200 focus:outline-none active:bg-zinc-200 text-center"
                    >
                      {columns.map(c => <option key={c} value={c}>Move to {c}</option>)}
                    </select>
                    {/* Custom Dropdown Arrow */}
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-400">
                      <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                  </div>
                </div>

              </div>
            ))
          )}
        </div>
      )}

      {/* MOBILE FULL-SCREEN MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full h-[90vh] rounded-t-[2.5rem] shadow-2xl flex flex-col animate-in slide-in-from-bottom-full duration-300">
            
            {/* Modal Header */}
            <div className="px-6 pt-6 pb-4 border-b border-zinc-100 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">New Inquiry</h2>
                <p className="text-zinc-500 text-[9px] font-bold mt-1 uppercase tracking-widest">Add Client details</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center bg-zinc-100 text-zinc-600 rounded-full font-bold active:bg-zinc-200"
              >
                ✕
              </button>
            </div>
            
            {/* Modal Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              <form id="leadForm" onSubmit={handleSave} className="space-y-4 pb-20">
                <div>
                  <label className={labelClass}>Client Name <span className="text-red-500">*</span></label>
                  <input type="text" required value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} className={inputClass} placeholder="e.g. John Doe" />
                </div>
                
                <div>
                  <label className={labelClass}>Phone Number</label>
                  <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className={inputClass} placeholder="+91 99999 99999" />
                </div>
                
                <div>
                  <label className={labelClass}>Estimated Value (₹)</label>
                  <input type="number" inputMode="numeric" value={formData.estimatedValue} onChange={e => setFormData({...formData, estimatedValue: e.target.value})} className={inputClass} placeholder="e.g. 500000" />
                </div>
                
                <div>
                  <label className={labelClass}>Project Type</label>
                  <div className="relative">
                    <select value={formData.projectType} onChange={e => setFormData({...formData, projectType: e.target.value})} className={`${inputClass} appearance-none`}>
                      <option value="Residential 2BHK">Residential 2BHK</option>
                      <option value="Residential 3BHK">Residential 3BHK</option>
                      <option value="Villa">Villa</option>
                      <option value="Commercial Office">Commercial Office</option>
                      <option value="Retail Store">Retail Store</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">
                      ▼
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className={labelClass}>Notes</label>
                  <textarea 
                    value={formData.notes} 
                    onChange={e => setFormData({...formData, notes: e.target.value})} 
                    placeholder="Wants minimal theme, met via Instagram..." 
                    className={`${inputClass} min-h-[100px] resize-none`} 
                  />
                </div>
              </form>
            </div>
            
            {/* Modal Footer (Sticky Bottom with Safe Area) */}
            <div className="px-6 py-4 pb-[calc(env(safe-area-inset-bottom,20px)+16px)] border-t border-zinc-100 bg-white shrink-0">
              <button 
                type="submit" 
                form="leadForm"
                className="w-full py-4 bg-[#1E3A8A] text-white font-semibold text-[11px] rounded-xl text-xs uppercase tracking-wider shadow-lg active:scale-[0.98] transition-transform"
              >
                Save Lead
              </button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}