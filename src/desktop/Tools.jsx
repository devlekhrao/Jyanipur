import React, { useState, useEffect } from 'react';
import { getTools, saveTool, updateToolStatus, deleteTool, getEmployees, getProjects } from '../db';

export default function Tools() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tools, setTools] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Expand/Collapse state for Categories
  const [expandedCategories, setExpandedCategories] = useState({});

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
      console.error("Error loading tools and assets from cloud DB:", err);
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
    if (!formData.name) return alert("Tool name required.");

    setSubmitting(true);
    try {
      await saveTool({ 
        ...formData, 
        purchasePrice: parseFloat(formData.purchasePrice) || 0 
      });
      setIsModalOpen(false);
      setFormData({ id: null, name: '', category: 'Power Tool', serialNumber: '', purchasePrice: '', purchaseDate: new Date().toISOString().split('T')[0] });
      await loadData();
    } catch (err) {
      alert("Failed to save asset.");
    }
    setSubmitting(false);
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updateToolStatus(checkoutData.toolId, checkoutData.status, checkoutData.assignedTo, checkoutData.location);
      setIsCheckoutModalOpen(false);
      await loadData();
    } catch (err) {
      alert("Failed to update checkout status.");
    }
    setSubmitting(false);
  };

  const openCheckout = (tool) => {
    setCheckoutData({
      toolId: tool.id || tool._id, 
      status: 'Checked Out', 
      assignedTo: tool.assignedTo || '', 
      location: tool.location || ''
    });
    setIsCheckoutModalOpen(true);
  };

  const markAvailable = async (id) => {
    setLoading(true);
    await updateToolStatus(id, 'Available', null, null);
    await loadData();
  };

  const handleDelete = async (id) => {
    if (window.confirm("Permanently remove this asset?")) {
      setLoading(true);
      await deleteTool(id);
      await loadData();
    }
  };

  // --- CATEGORIZATION ENGINE ---
  const filteredTools = tools.filter(t => 
    (t.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (t.serialNumber && t.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const groupedTools = {};
  filteredTools.forEach(t => {
    const cat = t.category || 'Uncategorized';
    if (!groupedTools[cat]) groupedTools[cat] = [];
    groupedTools[cat].push(t);
  });

  // Auto-expand all categories if searching
  useEffect(() => {
    if (searchQuery.trim() !== '') {
      const allExpanded = {};
      Object.keys(groupedTools).forEach(cat => allExpanded[cat] = true);
      setExpandedCategories(allExpanded);
    }
  }, [searchQuery, tools]);

  const toggleCategory = (catName) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catName]: prev[catName] !== undefined ? !prev[catName] : false 
      // defaults to true on first click if undefined, but we'll map them as true by default
    }));
  };

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-inset focus:ring-[#B45309] text-zinc-900 text-sm font-medium transition-all shadow-sm disabled:opacity-75 disabled:cursor-not-allowed";
  const labelClass = "block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 ml-0.5";

  return (
    <div className="w-full h-full flex flex-col" style={{ fontFamily: 'Poppins, sans-serif' }}>

      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 mb-6 border-b border-zinc-200 shrink-0 gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Tools & Assets</h2>
          <p className="text-zinc-500 text-sm mt-0.5 font-medium">Manage company equipment, site checkouts, and maintenance records.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)} 
          className="bg-[#B45309] hover:bg-[#92400E] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer flex items-center gap-1.5 h-10"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Add New Asset
        </button>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6 shrink-0">
        <div className="bg-white border border-zinc-200 p-5 rounded-2xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Total Assets Owned</span>
          <p className="text-xl font-bold text-zinc-900">{tools.length}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block mb-1">Available in Godown</span>
          <p className="text-xl font-bold text-emerald-700">{tools.filter(t => t.status === 'Available').length}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200/80 p-5 rounded-2xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-[#B45309] uppercase tracking-widest block mb-1">Checked Out (On Site)</span>
          <p className="text-xl font-bold text-[#B45309]">{tools.filter(t => t.status === 'Checked Out').length}</p>
        </div>
        <div className="bg-white border border-zinc-200 p-5 rounded-2xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Under Maintenance</span>
          <p className="text-xl font-bold text-amber-600">{tools.filter(t => t.status === 'Maintenance').length}</p>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="flex items-center h-10 bg-white border border-zinc-200 rounded-xl px-3.5 shadow-sm w-full max-w-sm mb-6 shrink-0">
        <span className="text-sm text-zinc-400">🔍</span>
        <input 
          type="text" 
          placeholder="Search tool name or serial number..." 
          value={searchQuery} 
          onChange={e => setSearchQuery(e.target.value)} 
          className="bg-transparent border-none text-sm font-medium text-zinc-800 outline-none px-2 w-full placeholder:text-zinc-400" 
        />
      </div>

      {/* TOOLS CATEGORIZED LIST */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-10">
        {loading ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-sm flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-4 border-zinc-200 border-t-[#B45309] rounded-full animate-spin"></div>
            <p>Syncing assets with cloud DB...</p>
          </div>
        ) : Object.keys(groupedTools).length === 0 ? (
          <div className="py-20 text-center text-zinc-400 font-medium bg-white rounded-2xl border border-dashed border-zinc-200 text-sm">
            No tools found. Click "+ Add New Asset" above.
          </div>
        ) : (
          Object.keys(groupedTools).sort().map(category => {
            const categoryTools = groupedTools[category];
            // By default, expand if it's undefined
            const isExpanded = expandedCategories[category] !== false;

            return (
              <div key={category} className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden mb-6 transition-all duration-200">
                
                {/* Category Header (Collapsible) */}
                <div 
                  onClick={() => toggleCategory(category)}
                  className="bg-zinc-50/80 px-6 py-4 border-b border-zinc-200 flex justify-between items-center cursor-pointer hover:bg-zinc-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg bg-white border border-zinc-200 text-[#B45309] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                    <h3 className="text-sm font-bold text-zinc-900 tracking-wide uppercase">
                      {category}
                    </h3>
                  </div>
                  <span className="text-[10px] font-semibold text-zinc-500 bg-white border border-zinc-200 px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                    {categoryTools.length} Asset{categoryTools.length > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Tools Table for this Category */}
                {isExpanded && (
                  <div className="overflow-x-auto w-full animate-in slide-in-from-top-2 fade-in duration-200">
                    <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
                      <thead>
                        <tr className="text-zinc-400 text-[10px] uppercase tracking-widest border-b border-zinc-100 bg-white">
                          <th className="py-3 px-6 font-bold">Tool Name</th>
                          <th className="py-3 px-4 font-bold">Serial Number</th>
                          <th className="py-3 px-4 font-bold text-center w-32">Status</th>
                          <th className="py-3 px-4 font-bold">Location / Assignee</th>
                          <th className="py-3 px-6 font-bold text-right w-40">Action</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-zinc-50">
                        {categoryTools.map(t => {
                          const recordId = t.id || t._id;
                          return (
                            <tr key={recordId} className="hover:bg-zinc-50 transition-colors">
                              <td className="py-4 px-6 font-semibold text-zinc-900">{t.name}</td>
                              <td className="py-4 px-4 text-xs font-mono text-zinc-500">{t.serialNumber || 'N/A'}</td>
                              <td className="py-4 px-4 text-center">
                                <span className={`px-2.5 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-widest border ${
                                  t.status === 'Available' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  t.status === 'Checked Out' ? 'bg-amber-50 text-[#B45309] border-amber-200' :
                                  'bg-zinc-100 text-zinc-700 border-zinc-200'
                                }`}>
                                  {t.status}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                {t.status === 'Checked Out' ? (
                                  <div className="flex flex-col">
                                    <span className="font-bold text-[#B45309] text-xs">{t.location || 'Site Location'}</span>
                                    <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mt-1">By: {t.assignedTo || 'Staff'}</span>
                                  </div>
                                ) : (
                                  <span className="text-zinc-400 font-medium text-xs">Central Godown</span>
                                )}
                              </td>
                              <td className="py-4 px-6 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {t.status === 'Available' ? (
                                    <button onClick={() => openCheckout(t)} className="px-3 py-1.5 bg-amber-50 text-[#B45309] hover:bg-[#B45309] hover:text-white border border-amber-200/60 rounded-lg font-bold cursor-pointer text-[9px] uppercase tracking-widest transition-all">
                                      Check Out
                                    </button>
                                  ) : (
                                    <button onClick={() => markAvailable(recordId)} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 rounded-lg font-bold cursor-pointer text-[9px] uppercase tracking-widest transition-all">
                                      Return
                                    </button>
                                  )}
                                  <button onClick={() => handleDelete(recordId)} className="p-1.5 bg-white text-red-500 hover:bg-red-500 hover:text-white border border-red-200 rounded-lg transition-all cursor-pointer shadow-sm">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ADD ASSET MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

            <div className="px-6 py-5 border-b border-zinc-200 flex justify-between items-center bg-zinc-50 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Add Asset</h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Register equipment to catalog</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-800 cursor-pointer p-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <form id="toolForm" onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className={labelClass}>Tool / Asset Name <span className="text-red-500">*</span></label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={inputClass} placeholder="e.g. Bosch Circular Saw" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Category</label>
                    <select 
                      value={formData.category} 
                      onChange={e => setFormData({...formData, category: e.target.value})} 
                      className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
                    >
                      <option value="Power Tool">Power Tool</option>
                      <option value="Measurement">Measurement</option>
                      <option value="Scaffolding">Scaffolding</option>
                      <option value="Heavy Machinery">Heavy Machinery</option>
                      <option value="Safety Gear">Safety Gear</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Serial No.</label>
                    <input type="text" value={formData.serialNumber} onChange={e => setFormData({...formData, serialNumber: e.target.value})} className={inputClass} placeholder="S/N..." />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Purchase Price (₹)</label>
                    <input type="number" step="any" value={formData.purchasePrice} onChange={e => setFormData({...formData, purchasePrice: e.target.value})} className={inputClass} placeholder="0.00" />
                  </div>
                  <div>
                    <label className={labelClass}>Purchase Date</label>
                    <input type="date" value={formData.purchaseDate} onChange={e => setFormData({...formData, purchaseDate: e.target.value})} className={inputClass} />
                  </div>
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-zinc-200 flex justify-end gap-3 bg-zinc-50 shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-bold rounded-xl text-xs uppercase tracking-widest transition-all cursor-pointer shadow-sm">
                Cancel
              </button>
              <button type="submit" form="toolForm" disabled={submitting} className="px-6 py-2.5 bg-[#B45309] hover:bg-[#92400E] text-white font-bold rounded-xl text-xs uppercase tracking-widest shadow-md transition-all cursor-pointer disabled:opacity-50">
                {submitting ? 'Saving...' : 'Save Asset'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CHECKOUT MODAL */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

            <div className="px-6 py-5 border-b border-zinc-200 flex justify-between items-center bg-zinc-50 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Check Out Tool</h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Asset site assignment</p>
              </div>
              <button onClick={() => setIsCheckoutModalOpen(false)} className="text-zinc-400 hover:text-zinc-800 cursor-pointer p-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <form id="checkoutForm" onSubmit={handleCheckout} className="space-y-4">
                <div>
                  <label className={labelClass}>Status</label>
                  <select 
                    value={checkoutData.status} 
                    onChange={e => setCheckoutData({...checkoutData, status: e.target.value})} 
                    className={`${inputClass} font-bold text-[#B45309] cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
                  >
                    <option value="Checked Out">Checked Out to Site</option>
                    <option value="Maintenance">Sent for Maintenance</option>
                    <option value="Lost">Lost / Broken</option>
                  </select>
                </div>

                {checkoutData.status === 'Checked Out' && (
                  <>
                    <div>
                      <label className={labelClass}>Assign To (Employee) <span className="text-red-500">*</span></label>
                      <select 
                        required 
                        value={checkoutData.assignedTo} 
                        onChange={e => setCheckoutData({...checkoutData, assignedTo: e.target.value})} 
                        className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
                      >
                        <option value="" disabled>Select Staff...</option>
                        {employees.map(emp => <option key={emp.id || emp._id} value={emp.fullName}>{emp.fullName}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className={labelClass}>Destination Project <span className="text-red-500">*</span></label>
                      <select 
                        required 
                        value={checkoutData.location} 
                        onChange={e => setCheckoutData({...checkoutData, location: e.target.value})} 
                        className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
                      >
                        <option value="" disabled>Select Site...</option>
                        {projects.map(p => <option key={p.id || p._id} value={p.name || p.projectName}>{p.name || p.projectName}</option>)}
                      </select>
                    </div>
                  </>
                )}
              </form>
            </div>

            <div className="px-6 py-4 border-t border-zinc-200 flex justify-end gap-3 bg-zinc-50 shrink-0">
              <button type="button" onClick={() => setIsCheckoutModalOpen(false)} className="px-5 py-2.5 bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-bold rounded-xl text-xs uppercase tracking-widest transition-all cursor-pointer shadow-sm">
                Cancel
              </button>
              <button type="submit" form="checkoutForm" disabled={submitting} className="px-6 py-2.5 bg-[#B45309] hover:bg-[#92400E] text-white font-bold rounded-xl text-xs uppercase tracking-widest shadow-md transition-all cursor-pointer disabled:opacity-50">
                {submitting ? 'Updating...' : 'Update Status'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}