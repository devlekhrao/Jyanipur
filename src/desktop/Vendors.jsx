import React, { useState, useEffect } from 'react';
import { getVendors, saveVendor, deleteVendor } from '../db';
import { exportToCSV } from '../utils';

export default function Vendors() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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
      console.error("Error fetching vendors from cloud DB:", e);
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

    setSubmitting(true);
    try {
      await saveVendor({
        ...formData,
        id: formData.id ? (Number(formData.id) || formData.id) : undefined,
        gstin: (formData.gstin || '').toUpperCase().trim()
      });
      setIsModalOpen(false);
      resetForm();
      await loadData();
    } catch (err) {
      alert("Failed to save vendor to cloud database.");
    }
    setSubmitting(false);
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
      setLoading(true);
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

  const totalRegisteredGst = vendors.filter(v => Boolean(v.gstin)).length;
  const inStateCount = vendors.filter(v => !v.state?.includes('IGST')).length;
  const interStateCount = vendors.filter(v => v.state?.includes('IGST')).length;

  const inputClass = "w-full px-4 py-3 rounded-lg border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 text-sm font-medium transition-all shadow-sm disabled:opacity-75 disabled:cursor-not-allowed";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-0.5";

  return (
    <div className="w-full h-full flex flex-col font-['Inter',sans-serif]">
      
      {/* HEADER CONTROLS */}
      <div className="flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center pb-6 mb-6 border-b border-zinc-200 shrink-0 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Vendor Directory</h2>
          <p className="text-zinc-500 text-sm mt-1 font-medium">Manage suppliers, auto-fill GST particulars on purchases, and synchronize with the Rate Book.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="flex items-center h-10 bg-white border border-zinc-200 rounded-lg px-3.5 shadow-sm w-full md:w-auto focus-within:ring-2 focus-within:ring-zinc-900 transition-all">
            <svg className="w-4 h-4 text-zinc-400 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              placeholder="Search vendor, GSTIN, phone..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="bg-transparent border-none text-xs font-medium text-zinc-900 outline-none w-full md:w-56 placeholder:text-zinc-400" 
            />
          </div>

          <button 
            onClick={handleExport} 
            className="h-10 bg-white border border-zinc-200 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-50 px-4 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-2"
          >
            <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export CSV
          </button>
          
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }} 
            className="h-10 bg-zinc-900 hover:bg-black text-white px-5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-2 border border-black"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add New Vendor
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-6 shrink-0">
        <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Total Suppliers</span>
          <p className="text-3xl font-black text-zinc-900 tracking-tight">{vendors.length}</p>
        </div>

        <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">GST Registered</span>
          <p className="text-3xl font-black text-zinc-900 tracking-tight">{totalRegisteredGst}</p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest block mb-2">Intra-State (CGST+SGST)</span>
          <p className="text-3xl font-black text-emerald-800 tracking-tight">{inStateCount}</p>
        </div>

        <div className="bg-zinc-900 border border-black p-6 rounded-xl shadow-sm flex flex-col justify-center relative overflow-hidden">
          <svg className="absolute -right-4 -bottom-6 w-32 h-32 opacity-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2 relative z-10">Inter-State (IGST)</span>
          <p className="text-3xl font-black text-white tracking-tight relative z-10">{interStateCount}</p>
        </div>
      </div>

      {/* VENDORS TABLE */}
      <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[900px]">
            <thead>
              <tr className="bg-zinc-50 text-zinc-500 text-[10px] uppercase tracking-widest font-bold border-b border-zinc-200 sticky top-0 z-10">
                <th className="py-4 px-6">Vendor Name</th>
                <th className="py-4 px-6 w-48">GSTIN</th>
                <th className="py-4 px-6 w-60">Contact Details</th>
                <th className="py-4 px-6 w-52">Category</th>
                <th className="py-4 px-6 w-56">Default Tax Region</th>
                <th className="py-4 px-6 text-right w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center text-zinc-400 font-medium text-xs">
                    Syncing vendor directory from cloud database...
                  </td>
                </tr>
              ) : filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400 border border-zinc-200">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <p className="text-zinc-500 font-medium text-xs">No vendors found. Click "+ Add New Vendor" above.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredVendors.map((vendor) => (
                  <tr key={vendor.id} className="transition-all hover:bg-zinc-50/80 group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                          {vendor.name ? vendor.name.charAt(0).toUpperCase() : 'V'}
                        </span>
                        <div>
                          <p className="font-bold text-sm text-zinc-900 tracking-tight">{vendor.name}</p>
                          {vendor.address && <p className="text-[11px] font-medium text-zinc-500 mt-0.5 truncate max-w-xs">{vendor.address}</p>}
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      {vendor.gstin ? (
                        <span className="font-mono text-xs font-bold text-zinc-800 bg-zinc-100 px-2.5 py-0.5 rounded border border-zinc-200">
                          {vendor.gstin}
                        </span>
                      ) : (
                        <span className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Unregistered</span>
                      )}
                    </td>

                    <td className="py-4 px-6">
                      <p className="text-xs font-bold text-zinc-900">{vendor.phone || 'No Phone'}</p>
                      {vendor.email && <p className="text-[11px] font-medium text-zinc-500 mt-0.5 truncate max-w-[180px]">{vendor.email}</p>}
                    </td>

                    <td className="py-4 px-6">
                      <span className="inline-block bg-zinc-100 border border-zinc-200 text-zinc-700 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md">
                        {vendor.tradeCategory || 'General Supplier'}
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <span className={`inline-block text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border ${
                        vendor.state?.includes('IGST') 
                          ? 'bg-blue-50 text-blue-700 border-blue-200' 
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {vendor.state || 'In-State (CGST+SGST)'}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleEdit(vendor)} 
                          className="px-3 py-1.5 bg-zinc-100 text-zinc-700 hover:bg-zinc-900 hover:text-white border border-zinc-200 rounded-lg font-bold cursor-pointer text-[10px] uppercase tracking-widest transition-all shadow-sm"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(vendor.id)} 
                          className="p-1.5 bg-white text-red-500 hover:bg-red-600 hover:text-white border border-red-200 rounded-lg transition-all cursor-pointer shadow-sm opacity-0 group-hover:opacity-100"
                          title="Delete Vendor"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] border border-zinc-200">
            
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-zinc-200 flex justify-between items-center bg-white shrink-0">
              <div>
                <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
                  {formData.id ? 'Edit Vendor Profile' : 'Add New Vendor'}
                </h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Supplier Credentials & Tax Information</p>
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

            {/* Modal Body */}
            <div className="p-8 overflow-y-auto [&::-webkit-scrollbar]:hidden bg-[#F4F4F5]">
              <form id="vendorForm" onSubmit={handleSave} className="space-y-5 bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                
                <div>
                  <label className={labelClass}>Vendor / Company Name <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    className={inputClass} 
                    placeholder="e.g. Sri Laxmi Timber & Hardware" 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>GSTIN (Optional)</label>
                    <input 
                      type="text" 
                      value={formData.gstin} 
                      onChange={e => setFormData({...formData, gstin: e.target.value.toUpperCase()})} 
                      className={`${inputClass} font-mono`} 
                      placeholder="36ABCDE1234F1Z5" 
                      maxLength={15} 
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Default Tax Type</label>
                    <select 
                      value={formData.state} 
                      onChange={e => setFormData({...formData, state: e.target.value})} 
                      className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2318181B%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
                    >
                      <option value="In-State (CGST+SGST)">In-State (CGST + SGST)</option>
                      <option value="Out-of-State (IGST)">Out-of-State (IGST)</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Phone Number</label>
                    <input 
                      type="text" 
                      value={formData.phone} 
                      onChange={e => setFormData({...formData, phone: e.target.value})} 
                      className={inputClass} 
                      placeholder="+91 98765 43210" 
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Email Address</label>
                    <input 
                      type="email" 
                      value={formData.email} 
                      onChange={e => setFormData({...formData, email: e.target.value})} 
                      className={inputClass} 
                      placeholder="accounts@supplier.com" 
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelClass}>Category / Trade Speciality</label>
                    <select 
                      value={formData.tradeCategory} 
                      onChange={e => setFormData({...formData, tradeCategory: e.target.value})} 
                      className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2318181B%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
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
                  <label className={labelClass}>Operating Office / Shop Address</label>
                  <input 
                    type="text" 
                    value={formData.address} 
                    onChange={e => setFormData({...formData, address: e.target.value})} 
                    className={inputClass} 
                    placeholder="Street address, City, Pincode" 
                  />
                </div>

                <div>
                  <label className={labelClass}>Internal Notes / Credit Period</label>
                  <textarea 
                    value={formData.notes} 
                    onChange={e => setFormData({...formData, notes: e.target.value})} 
                    placeholder="Credit terms (e.g. 30 days net), bank details, preferred transport..." 
                    className={`${inputClass} resize-y min-h-[70px] leading-relaxed`} 
                  />
                </div>

              </form>
            </div>

            {/* Modal Footer */}
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
                form="vendorForm" 
                disabled={submitting} 
                className="px-8 py-2.5 bg-zinc-900 hover:bg-black text-white font-bold rounded-lg text-[10px] uppercase tracking-widest shadow-sm transition-all cursor-pointer disabled:opacity-50 border border-black"
              >
                {submitting ? 'Saving...' : formData.id ? 'Update Vendor' : 'Save Vendor'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}