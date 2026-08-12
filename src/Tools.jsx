import React, { useState, useEffect } from 'react';
import { getTools, saveTool, updateToolStatus, deleteTool, getEmployees, getProjects } from './db';

export default function Tools() {
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
    const [t, e, p] = await Promise.all([getTools(), getEmployees(), getProjects()]);
    setTools(t);
    setEmployees(e.filter(emp => emp.status === 'Active'));
    setProjects(p.filter(proj => proj.status !== 'Completed'));
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
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

  const inputClass = "w-full px-4 py-3 rounded-xl border-none bg-zinc-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 text-sm font-medium transition-all shadow-inner";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1";

  return (
    <div className="w-full font-['Poppins'] pb-12 relative">
      <div className="flex justify-between items-end pb-4 border-b border-zinc-300/50 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-zinc-800 tracking-tight">Tools & Assets</h2>
          <p className="text-zinc-500 text-xs mt-1 font-medium">Manage company equipment, checkouts, and maintenance.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-zinc-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md">+ Add New Asset</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/80 backdrop-blur-xl border border-zinc-200/80 p-5 rounded-2xl shadow-sm">
          <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest block mb-1">Total Assets Owned</span>
          <p className="text-xl font-semibold text-zinc-800">{tools.length}</p>
        </div>
        <div className="bg-emerald-50/80 border border-emerald-200/60 p-5 rounded-2xl shadow-sm">
          <span className="text-[10px] font-medium text-emerald-600 uppercase tracking-widest block mb-1">Available in Godown</span>
          <p className="text-xl font-semibold text-emerald-700">{tools.filter(t => t.status === 'Available').length}</p>
        </div>
        <div className="bg-blue-50/80 border border-blue-200/60 p-5 rounded-2xl shadow-sm">
          <span className="text-[10px] font-medium text-blue-600 uppercase tracking-widest block mb-1">Checked Out (On Site)</span>
          <p className="text-xl font-semibold text-blue-700">{tools.filter(t => t.status === 'Checked Out').length}</p>
        </div>
        <div className="bg-amber-50/80 border border-amber-200/60 p-5 rounded-2xl shadow-sm">
          <span className="text-[10px] font-medium text-amber-600 uppercase tracking-widest block mb-1">Under Maintenance</span>
          <p className="text-xl font-semibold text-amber-700">{tools.filter(t => t.status === 'Maintenance').length}</p>
        </div>
      </div>

      <div className="flex items-center h-10 bg-white/60 border border-zinc-200/60 rounded-xl px-4 shadow-sm w-full max-w-sm mb-6">
        <span className="text-xs text-zinc-400">🔍</span>
        <input type="text" placeholder="Search tool or serial number..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-transparent border-none text-xs font-medium text-zinc-700 outline-none px-3 w-full placeholder:text-zinc-400" />
      </div>

      <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[2rem] shadow-xl overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto w-full pb-6">
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
            <thead>
              <tr className="text-zinc-400 text-[9px] uppercase tracking-widest border-b border-zinc-200/80 bg-zinc-50/50">
                <th className="py-4 px-6 font-semibold">Tool Name</th>
                <th className="py-4 px-4 font-semibold">Category / S.N.</th>
                <th className="py-4 px-4 font-semibold text-center w-32">Status</th>
                <th className="py-4 px-4 font-semibold">Current Location / Assignee</th>
                <th className="py-4 px-6 font-semibold text-center w-40">Action</th>
              </tr>
            </thead>
            <tbody className="text-sm text-zinc-700 divide-y divide-zinc-100">
              {loading ? (
                <tr><td colSpan="5" className="py-12 text-center text-zinc-400 text-xs">Loading assets...</td></tr>
              ) : filteredTools.length === 0 ? (
                <tr><td colSpan="5" className="py-12 text-center text-zinc-400 text-xs">No tools found.</td></tr>
              ) : (
                filteredTools.map(t => (
                  <tr key={t.id} className="hover:bg-zinc-50 transition-colors group">
                    <td className="py-4 px-6 font-bold text-zinc-800">{t.name}</td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-zinc-600 text-xs">{t.category}</span>
                        <span className="text-[10px] text-zinc-400 font-mono">SN: {t.serialNumber || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest border ${
                        t.status === 'Available' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                        t.status === 'Checked Out' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                        'bg-amber-50 text-amber-600 border-amber-200'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {t.status === 'Checked Out' ? (
                        <div className="flex flex-col">
                          <span className="font-bold text-zinc-800 text-xs">{t.location || 'Unknown Site'}</span>
                          <span className="text-[10px] text-zinc-500">With: {t.assignedTo}</span>
                        </div>
                      ) : (
                        <span className="text-zinc-400 italic text-xs">Godown / In-Store</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center space-x-2">
                      {t.status === 'Available' ? (
                        <button onClick={() => openCheckout(t)} className="text-[9px] font-bold bg-zinc-800 text-white hover:bg-black px-2 py-1 rounded uppercase tracking-wider transition-colors">Check Out</button>
                      ) : (
                        <button onClick={() => markAvailable(t.id)} className="text-[9px] font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-2 py-1 rounded uppercase tracking-wider transition-colors">Return</button>
                      )}
                      <button onClick={() => handleDelete(t.id)} className="text-[10px] font-bold text-red-300 hover:text-red-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Del</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALS BELOW */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-8">
            <h2 className="text-xl font-bold text-zinc-900 mb-1">Add Asset</h2>
            <form onSubmit={handleSave} className="space-y-4 mt-4">
              <div><label className={labelClass}>Tool Name *</label><input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={inputClass} placeholder="e.g. Bosch Circular Saw" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Category</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className={inputClass}>
                    <option value="Power Tool">Power Tool</option><option value="Measurement">Measurement</option><option value="Scaffolding">Scaffolding</option><option value="Other">Other</option>
                  </select>
                </div>
                <div><label className={labelClass}>Serial No.</label><input type="text" value={formData.serialNumber} onChange={e => setFormData({...formData, serialNumber: e.target.value})} className={inputClass} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Purchase Price (₹)</label><input type="number" value={formData.purchasePrice} onChange={e => setFormData({...formData, purchasePrice: e.target.value})} className={inputClass} /></div>
                <div><label className={labelClass}>Purchase Date</label><input type="date" value={formData.purchaseDate} onChange={e => setFormData({...formData, purchaseDate: e.target.value})} className={inputClass} /></div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-zinc-100"><button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-zinc-100 text-zinc-600 font-bold rounded-xl text-xs">Cancel</button><button type="submit" className="flex-1 py-3 bg-zinc-900 text-white font-bold rounded-xl text-xs">Save</button></div>
            </form>
          </div>
        </div>
      )}

      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-8">
            <h2 className="text-xl font-bold text-zinc-900 mb-1">Check Out Tool</h2>
            <form onSubmit={handleCheckout} className="space-y-4 mt-4">
              <div>
                <label className={labelClass}>Status</label>
                <select value={checkoutData.status} onChange={e => setCheckoutData({...checkoutData, status: e.target.value})} className={inputClass}>
                  <option value="Checked Out">Checked Out to Site</option><option value="Maintenance">Sent for Maintenance</option><option value="Lost">Lost / Broken</option>
                </select>
              </div>
              {checkoutData.status === 'Checked Out' && (
                <>
                  <div>
                    <label className={labelClass}>Assign To (Employee)</label>
                    <select required value={checkoutData.assignedTo} onChange={e => setCheckoutData({...checkoutData, assignedTo: e.target.value})} className={inputClass}>
                      <option value="" disabled>Select Staff...</option>
                      {employees.map(emp => <option key={emp.id} value={emp.fullName}>{emp.fullName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Destination Project</label>
                    <select required value={checkoutData.location} onChange={e => setCheckoutData({...checkoutData, location: e.target.value})} className={inputClass}>
                      <option value="" disabled>Select Site...</option>
                      {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                  </div>
                </>
              )}
              <div className="flex gap-3 pt-4 border-t border-zinc-100"><button type="button" onClick={() => setIsCheckoutModalOpen(false)} className="flex-1 py-3 bg-zinc-100 text-zinc-600 font-bold rounded-xl text-xs">Cancel</button><button type="submit" className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl text-xs">Update Status</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}