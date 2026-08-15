import React, { useState, useEffect } from 'react';
import { getTools, saveTool, updateToolStatus, deleteTool, getEmployees, getProjects } from '.../db';

export default function MobileTools() {
  const [loading, setLoading] = useState(true);
  const [tools, setTools] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    id: null, name: '', category: 'Power Tool', serialNumber: '', purchasePrice: '', purchaseDate: new Date().toISOString().split('T')[0]
  });
  
  const [checkoutData, setCheckoutData] = useState({
    toolId: null, status: 'Checked Out', assignedTo: '', location: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [t, e, p] = await Promise.all([getTools(), getEmployees(), getProjects()]);
      setTools(t || []);
      setEmployees((e || []).filter(emp => emp.status === 'Active'));
      setProjects((p || []).filter(proj => proj.status !== 'Completed'));
    } catch (err) {
      console.warn("Ensure tool functions exist in db.js");
      setTools([]);
      setEmployees([]);
      setProjects([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      alert("Tool name is required.");
      return;
    }
    await saveTool({ ...formData, purchasePrice: parseFloat(formData.purchasePrice) || 0 });
    setIsModalOpen(false);
    setFormData({ id: null, name: '', category: 'Power Tool', serialNumber: '', purchasePrice: '', purchaseDate: new Date().toISOString().split('T')[0] });
    await loadData();
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    await updateToolStatus(checkoutData.toolId, checkoutData.status, checkoutData.assignedTo, checkoutData.location);
    setIsCheckoutModalOpen(false);
    await loadData();
  };

  const openCheckout = (tool) => {
    setCheckoutData({
      toolId: tool.id, status: 'Checked Out', assignedTo: tool.assignedTo || '', location: tool.location || ''
    });
    setIsCheckoutModalOpen(true);
  };

  const markAvailable = async (id) => {
    await updateToolStatus(id, 'Available', null, null);
    await loadData();
  };

  const handleDelete = async (id) => {
    if (window.confirm("Permanently remove this asset?")) {
      await deleteTool(id);
      await loadData();
    }
  };

  const filteredTools = tools.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (t.serialNumber && t.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const inputClass = "w-full px-4 py-3.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-zinc-900 text-sm font-medium transition-all shadow-sm";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="w-full h-full flex flex-col font-['Poppins']">
      
      {/* HEADER SECTION */}
      <div className="mb-3 shrink-0">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Tools & Assets</h2>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Equipment Checkouts</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[#1E3A8A] hover:bg-blue-900 text-white font-black px-3.5 py-2.5 rounded-xl text-[10px] uppercase tracking-wider transition-all shadow-md active:scale-95"
          >
            + New Asset
          </button>
        </div>

        {/* SEARCH BAR */}
        <div className="bg-white border border-zinc-200 rounded-2xl px-3 py-2 shadow-sm flex items-center">
          <span className="text-xs text-zinc-400 mr-2">🔍</span>
          <input 
            type="text" 
            placeholder="Search tool or serial number..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs font-medium text-zinc-800 outline-none placeholder:text-zinc-400"
          />
        </div>
      </div>

      {/* 2x2 KPI GRID */}
      <div className="grid grid-cols-2 gap-2 mb-3 shrink-0">
        <div className="bg-white p-3 rounded-2xl border border-zinc-200 shadow-sm">
          <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block">Total Assets</span>
          <p className="text-base font-black text-zinc-900 mt-0.5">{tools.length}</p>
        </div>

        <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100 shadow-sm">
          <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest block">In Godown</span>
          <p className="text-base font-black text-emerald-700 mt-0.5">{tools.filter(t => t.status === 'Available').length}</p>
        </div>

        <div className="bg-blue-50 p-3 rounded-2xl border border-blue-100 shadow-sm">
          <span className="text-[8px] font-black text-[#1E3A8A] uppercase tracking-widest block">On Site</span>
          <p className="text-base font-black text-[#1E3A8A] mt-0.5">{tools.filter(t => t.status === 'Checked Out').length}</p>
        </div>

        <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 shadow-sm">
          <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest block">Maintenance</span>
          <p className="text-base font-black text-amber-700 mt-0.5">{tools.filter(t => t.status === 'Maintenance').length}</p>
        </div>
      </div>

      {/* ASSET STREAM CARDS */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {loading ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-xs">Loading equipment assets...</div>
        ) : filteredTools.length === 0 ? (
          <div className="text-center py-12 bg-white/50 border border-zinc-200 border-dashed rounded-3xl mt-2">
            <span className="text-3xl mb-2 block">🧰</span>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">No tools or assets found</p>
          </div>
        ) : (
          filteredTools.map(t => (
            <div 
              key={t.id} 
              className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-3 active:scale-[0.99] transition-transform"
            >
              {/* CARD HEADER */}
              <div className="flex justify-between items-start">
                <div>
                  <span className="bg-zinc-100 text-zinc-700 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                    {t.category}
                  </span>
                  <h4 className="font-extrabold text-zinc-900 text-sm mt-1">{t.name}</h4>
                  <p className="text-[9px] font-mono text-zinc-400 mt-0.5">S/N: {t.serialNumber || 'N/A'}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[8px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                    t.status === 'Available' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    t.status === 'Checked Out' ? 'bg-blue-50 text-[#1E3A8A] border-blue-100' :
                    'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {t.status}
                  </span>

                  <button 
                    onClick={() => handleDelete(t.id)} 
                    className="text-zinc-300 hover:text-red-500 text-xs font-bold p-0.5"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* LOCATION / ASSIGNEE INFORMATION */}
              <div className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-100 flex justify-between items-center text-xs">
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Location</span>
                <div className="text-right">
                  {t.status === 'Checked Out' ? (
                    <>
                      <p className="font-extrabold text-zinc-900 text-xs">{t.location || 'Unknown Site'}</p>
                      <p className="text-[9px] text-zinc-500 font-bold">With: {t.assignedTo || 'Staff'}</p>
                    </>
                  ) : (
                    <span className="text-zinc-400 font-semibold italic text-xs">Godown / In-Store</span>
                  )}
                </div>
              </div>

              {/* CHECKOUT / RETURN ACTIONS */}
              <div className="pt-1">
                {t.status === 'Available' ? (
                  <button 
                    onClick={() => openCheckout(t)}
                    className="w-full py-2.5 bg-[#1E3A8A] text-white font-black rounded-xl text-[10px] uppercase tracking-wider active:scale-95 transition-transform shadow-sm"
                  >
                    Check Out to Site
                  </button>
                ) : (
                  <button 
                    onClick={() => markAvailable(t.id)}
                    className="w-full py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-black rounded-xl text-[10px] uppercase tracking-wider active:scale-95 transition-transform"
                  >
                    Mark Returned to Godown
                  </button>
                )}
              </div>

            </div>
          ))
        )}
      </div>

      {/* MODAL 1: ADD ASSET BOTTOM SHEET */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full rounded-t-[2.5rem] shadow-2xl p-6 flex flex-col animate-in slide-in-from-bottom-full duration-300">
            
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3 mb-4">
              <div>
                <h2 className="text-xl font-extrabold text-zinc-900">Add Equipment Asset</h2>
                <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest mt-0.5">Register Tool Master</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center bg-zinc-100 text-zinc-600 rounded-full font-bold active:bg-zinc-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 pb-6">
              <div>
                <label className={labelClass}>Tool Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Bosch Circular Saw 7 Inch" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className={inputClass} 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Category</label>
                  <div className="relative">
                    <select 
                      value={formData.category} 
                      onChange={e => setFormData({...formData, category: e.target.value})} 
                      className={`${inputClass} appearance-none font-bold`}
                    >
                      <option value="Power Tool">Power Tool</option>
                      <option value="Measurement">Measurement</option>
                      <option value="Scaffolding">Scaffolding</option>
                      <option value="Other">Other</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">▼</div>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Serial Number</label>
                  <input 
                    type="text" 
                    placeholder="S/N ID..." 
                    value={formData.serialNumber} 
                    onChange={e => setFormData({...formData, serialNumber: e.target.value})} 
                    className={`${inputClass} font-mono`} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Purchase Price (₹)</label>
                  <input 
                    type="number" 
                    inputMode="decimal"
                    placeholder="0.00" 
                    value={formData.purchasePrice} 
                    onChange={e => setFormData({...formData, purchasePrice: e.target.value})} 
                    className={inputClass} 
                  />
                </div>
                <div>
                  <label className={labelClass}>Purchase Date</label>
                  <input 
                    type="date" 
                    value={formData.purchaseDate} 
                    onChange={e => setFormData({...formData, purchaseDate: e.target.value})} 
                    className={inputClass} 
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full py-4 bg-[#1E3A8A] text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-lg active:scale-[0.98] transition-transform mt-2"
              >
                Save Asset Master
              </button>
            </form>

          </div>
        </div>
      )}

      {/* MODAL 2: CHECKOUT ASSET BOTTOM SHEET */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full rounded-t-[2.5rem] shadow-2xl p-6 flex flex-col animate-in slide-in-from-bottom-full duration-300">
            
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3 mb-4">
              <div>
                <h2 className="text-xl font-extrabold text-zinc-900">Check Out Equipment</h2>
                <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest mt-0.5">Asset Assignment</p>
              </div>
              <button 
                onClick={() => setIsCheckoutModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center bg-zinc-100 text-zinc-600 rounded-full font-bold active:bg-zinc-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCheckout} className="space-y-4 pb-6">
              <div>
                <label className={labelClass}>Status</label>
                <div className="relative">
                  <select 
                    value={checkoutData.status} 
                    onChange={e => setCheckoutData({...checkoutData, status: e.target.value})} 
                    className={`${inputClass} appearance-none font-bold`}
                  >
                    <option value="Checked Out">Checked Out to Site</option>
                    <option value="Maintenance">Sent for Maintenance</option>
                    <option value="Lost">Lost / Broken</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">▼</div>
                </div>
              </div>

              {checkoutData.status === 'Checked Out' && (
                <>
                  <div>
                    <label className={labelClass}>Assign Staff Member <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <select 
                        required 
                        value={checkoutData.assignedTo} 
                        onChange={e => setCheckoutData({...checkoutData, assignedTo: e.target.value})} 
                        className={`${inputClass} appearance-none font-bold`}
                      >
                        <option value="" disabled>Select Staff...</option>
                        {employees.map(emp => <option key={emp.id} value={emp.fullName}>{emp.fullName}</option>)}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">▼</div>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Destination Project Site <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <select 
                        required 
                        value={checkoutData.location} 
                        onChange={e => setCheckoutData({...checkoutData, location: e.target.value})} 
                        className={`${inputClass} appearance-none font-bold`}
                      >
                        <option value="" disabled>Select Site...</option>
                        {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">▼</div>
                    </div>
                  </div>
                </>
              )}

              <button 
                type="submit" 
                className="w-full py-4 bg-[#1E3A8A] text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-lg active:scale-[0.98] transition-transform mt-2"
              >
                Update Asset Status
              </button>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}