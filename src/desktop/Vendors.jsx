import React, { useState, useEffect } from 'react';
import { getVendors, saveVendor, deleteVendor } from '../db';
import { exportToCSV } from '../utils';

export default function Vendors() {
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    gstin: '',
    phone: '',
    email: '',
    address: '',
    state: 'In-State (CGST+SGST)',
    tradeCategory: 'General Supplier',
    notes: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getVendors();
      setVendors(data || []);
    } catch (e) {
      console.warn("Ensure getVendors is in db.js");
      setVendors([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      alert("Vendor Name is required.");
      return;
    }
    await saveVendor({
      ...formData,
      gstin: (formData.gstin || '').toUpperCase()
    });
    setIsModalOpen(false);
    resetForm();
    await loadData();
  };

  const handleEdit = (vendor) => {
    setFormData({
      id: vendor.id,
      name: vendor.name || '',
      gstin: vendor.gstin || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      address: vendor.address || '',
      state: vendor.state || 'In-State (CGST+SGST)',
      tradeCategory: vendor.tradeCategory || 'General Supplier',
      notes: vendor.notes || ''
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      id: null,
      name: '',
      gstin: '',
      phone: '',
      email: '',
      address: '',
      state: 'In-State (CGST+SGST)',
      tradeCategory: 'General Supplier',
      notes: ''
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this vendor?")) {
      await deleteVendor(id);
      await loadData();
    }
  };

  const handleExport = () => {
    const exportData = vendors.map(v => ({
      'Vendor Name': v.name,
      'GSTIN': v.gstin,
      'Phone': v.phone,
      'Email': v.email,
      'Address': v.address,
      'Tax Type': v.state,
      'Trade / Category': v.tradeCategory,
      'Notes': v.notes
    }));
    exportToCSV('Jyanipur_Vendors_List', exportData);
  };

  const filteredVendors = vendors.filter(v => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (v.name && v.name.toLowerCase().includes(q)) ||
      (v.gstin && v.gstin.toLowerCase().includes(q)) ||
      (v.phone && v.phone.toLowerCase().includes(q)) ||
      (v.tradeCategory && v.tradeCategory.toLowerCase().includes(q))
    );
  });

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-inset focus:ring-[#B45309] text-zinc-900 text-sm font-medium transition-all disabled:opacity-75 disabled:cursor-not-allowed";
  const labelClass = "block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 ml-0.5";

  return (
    <div className="w-full h-full flex flex-col" style={{ fontFamily: 'Poppins, sans-serif' }}>
      {/* HEADER CONTROLS */}
      <div className="flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center pb-5 mb-6 border-b border-zinc-200 shrink-0 gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Vendor Directory</h2>
          <p className="text-zinc-500 text-sm mt-0.5 font-medium">Manage suppliers, auto-fill GST details during purchase entry, and update Rate Book.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="flex items-center h-10 bg-white border border-zinc-200 rounded-xl px-3.5 shadow-sm w-full md:w-auto">
            <span className="text-sm text-zinc-400">🔍</span>
            <input 
              type="text" 
              placeholder="Search vendor, GSTIN, phone..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="bg-transparent border-none text-sm font-medium text-zinc-800 outline-none px-2 w-full md:w-56 placeholder:text-zinc-400" 
            />
          </div>

          <button onClick={handleExport} className="h-10 bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 px-4 rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export CSV
          </button>
          
          <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="h-10 bg-[#B45309] hover:bg-[#92400E] text-white px-5 rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add New Vendor
          </button>
        </div>
      </div>

      {/* VENDORS TABLE */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-zinc-50/80 text-zinc-500 text-[11px] uppercase tracking-wider border-b border-zinc-200">
                <th className="py-4 px-6 font-semibold">Vendor Name</th>
                <th className="py-4 px-6 font-semibold">GSTIN</th>
                <th className="py-4 px-6 font-semibold">Contact Details</th>
                <th className="py-4 px-6 font-semibold">Category</th>
                <th className="py-4 px-6 font-semibold">Default Tax Region</th>
                <th className="py-4 px-6 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-sm">
              {loading ? (
                <tr><td colSpan="6" className="py-12 text-center text-zinc-400 font-medium text-sm">Loading vendors...</td></tr>
              ) : filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-[#B45309]">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.25A2.25 2.25 0 010 18.75V6a2.25 2.25 0 012.25-2.25h19.5A2.25 2.25 0 0124 6v12.75A2.25 2.25 0 0121.75 21h-8.25z" />
                        </svg>
                      </div>
                      <p className="text-zinc-500 font-medium text-sm">No vendors found. Click "+ Add New Vendor" above.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredVendors.map((vendor) => (
                  <tr key={vendor.id} className="transition-all hover:bg-zinc-50/80 group">
                    <td className="py-4 px-6">
                      <p className="font-semibold text-sm text-zinc-900">{vendor.name}</p>
                      {vendor.address && <p className="text-[11px] font-medium text-zinc-500 mt-0.5 truncate max-w-xs">{vendor.address}</p>}
                    </td>

                    <td className="py-4 px-6">
                      {vendor.gstin ? (
                        <span className="font-mono text-xs font-semibold text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                          {vendor.gstin}
                        </span>
                      ) : (
                        <span className="text-zinc-400 text-xs font-medium">Unregistered</span>
                      )}
                    </td>

                    <td className="py-4 px-6">
                      <p className="text-sm font-medium text-zinc-800">{vendor.phone || 'No Phone'}</p>
                      {vendor.email && <p className="text-[11px] font-medium text-zinc-500 mt-0.5">{vendor.email}</p>}
                    </td>

                    <td className="py-4 px-6">
                      <span className="inline-block bg-amber-50 border border-amber-200/60 text-[#B45309] text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md">
                        {vendor.tradeCategory || 'General Supplier'}
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <span className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                        vendor.state?.includes('IGST') 
                          ? 'bg-blue-50 text-blue-700 border-blue-200' 
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {vendor.state || 'In-State (CGST+SGST)'}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => handleEdit(vendor)} className="px-3 py-1.5 bg-amber-50 text-[#B45309] hover:bg-[#B45309] hover:text-white border border-amber-200/60 rounded-lg font-semibold cursor-pointer text-[11px] uppercase tracking-wider transition-all">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(vendor.id)} className="p-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 rounded-lg transition-all cursor-pointer">
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

      {/* ADD / EDIT VENDOR MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-zinc-200 flex justify-between items-center bg-zinc-50 shrink-0">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900">{formData.id ? 'Edit Vendor Profile' : 'Add New Vendor'}</h2>
                <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mt-0.5">Supplier & Tax Information</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <form id="vendorForm" onSubmit={handleSave} className="space-y-4">
                
                <div>
                  <label className={labelClass}>Vendor / Company Name <span className="text-red-500">*</span></label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={inputClass} placeholder="e.g. Timber & Hardware Traders" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>GSTIN (Optional)</label>
                    <input type="text" value={formData.gstin} onChange={e => setFormData({...formData, gstin: e.target.value.toUpperCase()})} className={`${inputClass} font-mono`} placeholder="29ABCDE1234F1Z5" maxLength="15" />
                  </div>

                  <div>
                    <label className={labelClass}>Default Tax Type</label>
                    <select 
                      value={formData.state} 
                      onChange={e => setFormData({...formData, state: e.target.value})} 
                      className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
                    >
                      <option value="In-State (CGST+SGST)">In-State (CGST + SGST)</option>
                      <option value="Out-of-State (IGST)">Out-of-State (IGST)</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Phone Number</label>
                    <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className={inputClass} placeholder="+91 98765 43210" />
                  </div>

                  <div>
                    <label className={labelClass}>Email Address</label>
                    <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className={inputClass} placeholder="vendor@example.com" />
                  </div>

                  <div>
                    <label className={labelClass}>Category / Trade</label>
                    <select 
                      value={formData.tradeCategory} 
                      onChange={e => setFormData({...formData, tradeCategory: e.target.value})} 
                      className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
                    >
                      <option value="General Supplier">General Supplier</option>
                      <option value="Hardware & Timber">Hardware & Timber</option>
                      <option value="Electricals & Lighting">Electricals & Lighting</option>
                      <option value="Plumbing & Sanitary">Plumbing & Sanitary</option>
                      <option value="Paints & Finishes">Paints & Finishes</option>
                      <option value="Glass & Aluminum">Glass & Aluminum</option>
                      <option value="Subcontractor / Labor">Subcontractor / Labor</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Shop / Operating Address</label>
                  <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className={inputClass} placeholder="Street address, City, Pincode" />
                </div>

                <div>
                  <label className={labelClass}>Internal Notes</label>
                  <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Credit period, preferred payment modes..." className={`${inputClass} resize-y min-h-[60px]`} />
                </div>

              </form>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-zinc-200 flex justify-end gap-3 bg-zinc-50 shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-semibold rounded-xl text-sm transition-all cursor-pointer">
                Cancel
              </button>
              <button type="submit" form="vendorForm" className="px-6 py-2.5 bg-[#B45309] hover:bg-[#92400E] text-white font-medium rounded-xl text-sm shadow-sm transition-all cursor-pointer">
                {formData.id ? 'Update Vendor' : 'Save Vendor'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}