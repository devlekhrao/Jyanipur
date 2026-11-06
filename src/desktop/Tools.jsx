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
    id: null,
    name: '',
    category: 'Power Tool',
    serialNumber: '',
    purchasePrice: '',
    purchaseDate: new Date().toISOString().split('T')[0]
  });

  const [checkoutData, setCheckoutData] = useState({
    toolId: null,
    status: 'Checked Out',
    assignedTo: '',
    location: ''
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
      setFormData({
        id: null,
        name: '',
        category: 'Power Tool',
        serialNumber: '',
        purchasePrice: '',
        purchaseDate: new Date().toISOString().split('T')[0]
      });
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
      Object.keys(groupedTools).forEach(cat => { allExpanded[cat] = true; });
      setExpandedCategories(allExpanded);
    }
  }, [searchQuery, tools]);

  const toggleCategory = (catName) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catName]: prev[catName] !== undefined ? !prev[catName] : false 
    }));
  };

  const inputClass = "w-full px-4 py-3 rounded-lg border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 text-sm font-medium transition-all shadow-sm disabled:opacity-75 disabled:cursor-not-allowed";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-0.5";

  return (
    <div className="w-full h-full flex flex-col font-['Inter',sans-serif]">

      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 mb-6 border-b border-zinc-200 shrink-0 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Tools & Assets</h2>
          <p className="text-zinc-500 text-sm mt-1 font-medium">Manage company equipment, site checkouts, and maintenance records.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)} 
          className="bg-zinc-900 hover:bg-black text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-2 h-10 border border-black"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add New Asset
        </button>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6 shrink-0">
        <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Total Assets Owned</span>
          <p className="text-2xl font-black text-zinc-900 tracking-tight">{tools.length}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest block mb-2">Available in Godown</span>
          <p className="text-2xl font-black text-emerald-800 tracking-tight">{tools.filter(t => t.status === 'Available').length}</p>
        </div>
        <div className="bg-zinc-900 border border-black p-6 rounded-xl shadow-sm flex flex-col justify-center relative overflow-hidden">
          <svg className="absolute -right-4 -bottom-6 w-32 h-32 opacity-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.07a4.5 4.5 0 004.486-6.32l-3.27 3.27-2.955-.591-.591-2.955 3.27-3.27a4.5 4.5 0 00-6.32 4.486c.118.58.094 1.193-.07 1.743" />
          </svg>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2 relative z-10">Checked Out (On Site)</span>
          <p className="text-2xl font-black text-white tracking-tight relative z-10">{tools.filter(t => t.status === 'Checked Out').length}</p>
        </div>
        <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Under Maintenance</span>
          <p className="text-2xl font-black text-amber-600 tracking-tight">{tools.filter(t => t.status === 'Maintenance').length}</p>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="flex items-center h-10 bg-white border border-zinc-200 rounded-lg px-3.5 shadow-sm w-full max-w-sm mb-6 shrink-0 focus-within:ring-2 focus-within:ring-zinc-900 transition-all">
        <svg className="w-4 h-4 text-zinc-400 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input 
          type="text" 
          placeholder="Search tool name or serial number..." 
          value={searchQuery} 
          onChange={e => setSearchQuery(e.target.value)} 
          className="bg-transparent border-none text-xs font-medium text-zinc-900 outline-none w-full placeholder:text-zinc-400" 
        />
      </div>

      {/* TOOLS CATEGORIZED LIST */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-10">
        {loading ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-sm flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin"></div>
            <p>Syncing assets with cloud database...</p>
          </div>
        ) : Object.keys(groupedTools).length === 0 ? (
          <div className="py-20 text-center text-zinc-400 font-bold text-xs uppercase tracking-widest bg-white rounded-xl border border-dashed border-zinc-300">
            No tools found. Click "+ Add New Asset" above.
          </div>
        ) : (
          Object.keys(groupedTools).sort().map(category => {
            const categoryTools = groupedTools[category];
            const isExpanded = expandedCategories[category] !== false;

            return (
              <div key={category} className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden mb-6 transition-all duration-200">
                
                {/* Category Header (Collapsible) */}
                <div 
                  onClick={() => toggleCategory(category)}
                  className="bg-white px-6 py-4 flex justify-between items-center cursor-pointer hover:bg-zinc-50 transition-colors border-b border-transparent data-[expanded=true]:border-zinc-200"
                  data-expanded={isExpanded}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`w-7 h-7 rounded-md bg-zinc-100 flex items-center justify-center text-zinc-700 transition-transform duration-200 border border-zinc-200 ${isExpanded ? 'rotate-180 bg-zinc-900 text-white border-black' : ''}`}>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-bold text-zinc-900 tracking-tight uppercase">
                      {category}
                    </h3>
                  </div>
                  <span className="text-[9px] font-bold text-zinc-600 bg-zinc-100 border border-zinc-200 px-3 py-1 rounded-md uppercase tracking-widest shadow-sm">
                    {categoryTools.length} {categoryTools.length === 1 ? 'Asset' : 'Assets'}
                  </span>
                </div>

                {/* Tools Table for this Category */}
                {isExpanded && (
                  <div className="overflow-x-auto w-full animate-in slide-in-from-top-2 fade-in duration-200 bg-zinc-50/50">
                    <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
                      <thead>
                        <tr className="text-zinc-500 text-[10px] uppercase tracking-widest border-b border-zinc-200 bg-zinc-50 font-bold">
                          <th className="py-3 px-6">Tool Name</th>
                          <th className="py-3 px-4">Serial Number</th>
                          <th className="py-3 px-4 text-center w-36">Status</th>
                          <th className="py-3 px-4">Location / Assignee</th>
                          <th className="py-3 px-6 text-right w-44">Action</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-zinc-100 bg-white">
                        {categoryTools.map(t => {
                          const recordId = t.id || t._id;
                          return (
                            <tr key={recordId} className="hover:bg-zinc-50/80 transition-colors">
                              <td className="py-4 px-6 font-bold text-zinc-900 tracking-tight">{t.name}</td>
                              <td className="py-4 px-4 text-xs font-mono font-medium text-zinc-500">{t.serialNumber || 'N/A'}</td>
                              <td className="py-4 px-4 text-center">
                                <span className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest border ${
                                  t.status === 'Available' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  t.status === 'Checked Out' ? 'bg-zinc-100 text-zinc-800 border-zinc-300' :
                                  'bg-amber-50 text-amber-800 border-amber-200'
                                }`}>
                                  {t.status}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                {t.status === 'Checked Out' ? (
                                  <div className="flex flex-col">
                                    <span className="font-bold text-zinc-900 text-xs tracking-tight">{t.location || 'Site Location'}</span>
                                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">By: {t.assignedTo || 'Staff'}</span>
                                  </div>
                                ) : (
                                  <span className="text-zinc-400 font-medium text-xs italic">Central Godown</span>
                                )}
                              </td>
                              <td className="py-4 px-6 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {t.status === 'Available' ? (
                                    <button 
                                      onClick={() => openCheckout(t)} 
                                      className="px-3 py-1.5 bg-zinc-900 hover:bg-black text-white rounded-lg font-bold cursor-pointer text-[9px] uppercase tracking-widest transition-all shadow-sm border border-black"
                                    >
                                      Check Out
                                    </button>
                                  ) : (
                                    <button 
                                      onClick={() => markAvailable(recordId)} 
                                      className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 rounded-lg font-bold cursor-pointer text-[9px] uppercase tracking-widest transition-all shadow-sm"
                                    >
                                      Return
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => handleDelete(recordId)} 
                                    className="p-1.5 bg-white text-red-500 hover:bg-red-600 hover:text-white border border-red-200 rounded-lg transition-all cursor-pointer shadow-sm"
                                    title="Delete Asset"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] border border-zinc-200">

            <div className="px-8 py-6 border-b border-zinc-200 flex justify-between items-center bg-white shrink-0">
              <div>
                <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Add Asset</h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Register equipment to catalog</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 transition-colors flex items-center justify-center cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-8 overflow-y-auto [&::-webkit-scrollbar]:hidden bg-[#F4F4F5]">
              <form id="toolForm" onSubmit={handleSave} className="space-y-5 bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                <div>
                  <label className={labelClass}>Tool / Asset Name <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    className={inputClass} 
                    placeholder="e.g. Bosch GKS 190 Circular Saw" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Category</label>
                    <select 
                      value={formData.category} 
                      onChange={e => setFormData({...formData, category: e.target.value})} 
                      className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2318181B%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
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
                    <input 
                      type="text" 
                      value={formData.serialNumber} 
                      onChange={e => setFormData({...formData, serialNumber: e.target.value})} 
                      className={`${inputClass} font-mono`} 
                      placeholder="S/N..." 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Purchase Price (₹)</label>
                    <input 
                      type="number" 
                      step="any" 
                      value={formData.purchasePrice} 
                      onChange={e => setFormData({...formData, purchasePrice: e.target.value})} 
                      className={inputClass} 
                      placeholder="0.00" 
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
              </form>
            </div>

            <div className="px-8 py-5 border-t border-zinc-200 flex justify-end gap-3 bg-white shrink-0">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)} 
                className="px-6 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="toolForm" 
                disabled={submitting} 
                className="px-8 py-2.5 bg-zinc-900 hover:bg-black text-white rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-sm transition-all cursor-pointer disabled:opacity-50 border border-black"
              >
                {submitting ? 'Saving...' : 'Save Asset'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CHECKOUT MODAL */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] border border-zinc-200">

            <div className="px-8 py-6 border-b border-zinc-200 flex justify-between items-center bg-white shrink-0">
              <div>
                <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Check Out Tool</h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Asset site assignment</p>
              </div>
              <button 
                onClick={() => setIsCheckoutModalOpen(false)} 
                className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 transition-colors flex items-center justify-center cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-8 overflow-y-auto [&::-webkit-scrollbar]:hidden bg-[#F4F4F5]">
              <form id="checkoutForm" onSubmit={handleCheckout} className="space-y-5 bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                <div>
                  <label className={labelClass}>Status</label>
                  <select 
                    value={checkoutData.status} 
                    onChange={e => setCheckoutData({...checkoutData, status: e.target.value})} 
                    className={`${inputClass} font-bold text-zinc-900 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2318181B%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
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
                        className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2318181B%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
                      >
                        <option value="" disabled>Select Staff...</option>
                        {employees.map(emp => <option key={emp.id || emp._id} value={emp.fullName}>{emp.fullName}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className={labelClass}>Destination Project Site <span className="text-red-500">*</span></label>
                      <select 
                        required 
                        value={checkoutData.location} 
                        onChange={e => setCheckoutData({...checkoutData, location: e.target.value})} 
                        className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2318181B%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
                      >
                        <option value="" disabled>Select Site...</option>
                        {projects.map(p => <option key={p.id || p._id} value={p.name || p.projectName}>{p.name || p.projectName}</option>)}
                      </select>
                    </div>
                  </>
                )}
              </form>
            </div>

            <div className="px-8 py-5 border-t border-zinc-200 flex justify-end gap-3 bg-white shrink-0">
              <button 
                type="button" 
                onClick={() => setIsCheckoutModalOpen(false)} 
                className="px-6 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="checkoutForm" 
                disabled={submitting} 
                className="px-8 py-2.5 bg-zinc-900 hover:bg-black text-white rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-sm transition-all cursor-pointer disabled:opacity-50 border border-black"
              >
                {submitting ? 'Updating...' : 'Update Status'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}