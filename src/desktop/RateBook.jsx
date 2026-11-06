import React, { useState, useEffect, useRef } from 'react';
import { getMaterialRates, saveMaterialRate, deleteMaterialRate, getVendors } from '../db';

export default function RateBook() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rates, setRates] = useState([]);
  const [vendorsList, setVendorsList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Collapsible Catalog State
  const [expandedMaterials, setExpandedMaterials] = useState({});
  
  // Vendor Suggestions State for Modal
  const [vendorSuggestions, setVendorSuggestions] = useState([]);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const vendorDropdownRef = useRef(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    materialName: '',
    vendorName: '',
    rate: '',
    unit: 'Pcs',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [rateData, vData] = await Promise.all([
        getMaterialRates(),
        getVendors ? getVendors() : Promise.resolve([])
      ]);
      setRates(rateData || []);
      setVendorsList(vData || []);
    } catch (e) {
      console.error("Error loading material rates from cloud DB:", e);
      setRates([]);
      setVendorsList([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter and group by search query
  const filteredRates = rates.filter(r => 
    (r.materialName || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (r.vendorName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Grouping logic by Material Name
  const groupedRates = {};
  filteredRates.forEach(r => {
    const matName = (r.materialName || 'Uncategorized Material').toUpperCase().trim();
    if (!groupedRates[matName]) groupedRates[matName] = [];
    groupedRates[matName].push(r);
  });

  // Alphabetical Categorization Engine
  const sortedMaterialNames = Object.keys(groupedRates).sort();
  const alphabetCategories = {};

  sortedMaterialNames.forEach(material => {
    const firstLetter = material.charAt(0).toUpperCase();
    const category = /[A-Z]/.test(firstLetter) ? firstLetter : '#';

    if (!alphabetCategories[category]) {
      alphabetCategories[category] = [];
    }
    alphabetCategories[category].push(material);
  });

  // Auto-expand all if searching
  useEffect(() => {
    if (searchQuery.trim() !== '') {
      const allExpanded = {};
      Object.keys(groupedRates).forEach(key => { allExpanded[key] = true; });
      setExpandedMaterials(allExpanded);
    }
  }, [searchQuery, rates]);

  // Close vendor suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (vendorDropdownRef.current && !vendorDropdownRef.current.contains(event.target)) {
        setShowVendorDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleVendorInputChange = (e) => {
    const val = e.target.value;
    setFormData(prev => ({ ...prev, vendorName: val }));

    if (val.trim().length > 0) {
      const matches = vendorsList.filter(v => 
        v.name && v.name.toLowerCase().includes(val.toLowerCase())
      );
      setVendorSuggestions(matches);
      setShowVendorDropdown(matches.length > 0);
    } else {
      setVendorSuggestions([]);
      setShowVendorDropdown(false);
    }
  };

  const handleSelectVendor = (vendor) => {
    setFormData(prev => ({ ...prev, vendorName: vendor.name }));
    setShowVendorDropdown(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.materialName || !formData.vendorName || !formData.rate) {
      return alert("Material, Vendor, and Rate are required.");
    }

    setSubmitting(true);
    try {
      await saveMaterialRate({
        ...formData,
        rate: parseFloat(formData.rate) || 0
      });
      setIsModalOpen(false);
      setFormData({ materialName: '', vendorName: '', rate: '', unit: 'Pcs', date: new Date().toISOString().split('T')[0], notes: '' });
      await loadData();
    } catch (err) {
      alert("Failed to save rate to cloud database.");
    }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this rate record?")) {
      setLoading(true);
      await deleteMaterialRate(id);
      await loadData();
    }
  };

  const toggleMaterialExpand = (materialName) => {
    setExpandedMaterials(prev => ({
      ...prev,
      [materialName]: !prev[materialName]
    }));
  };

  const inputClass = "w-full px-4 py-3 rounded-lg border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 text-sm font-medium transition-all shadow-sm disabled:opacity-75 disabled:cursor-not-allowed";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-0.5";

  return (
    <div className="w-full h-full flex flex-col font-['Inter',sans-serif]">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-zinc-200 mb-6 gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Material Rate Analyzer</h2>
          <p className="text-zinc-500 text-sm mt-1 font-medium">Compare historical purchases to benchmark the best supplier prices.</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="bg-zinc-900 hover:bg-black text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-2 border border-black"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Log New Rate
          </button>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="mb-6 shrink-0">
        <div className="flex items-center h-11 bg-white border border-zinc-200 rounded-lg px-4 shadow-sm w-full max-w-2xl focus-within:ring-2 focus-within:ring-zinc-900 transition-all">
          <svg className="w-4 h-4 text-zinc-400 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text" 
            placeholder="Search material (e.g. '18mm Plywood', 'Century', 'Asian Paints', vendor)..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-transparent border-none text-sm font-medium text-zinc-900 outline-none w-full placeholder:text-zinc-400"
          />
        </div>
      </div>

      {/* RESULTS AREA: A-Z CATEGORIZED */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-10">
        {loading ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-sm flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin"></div>
            <p>Syncing rate book from cloud database...</p>
          </div>
        ) : Object.keys(alphabetCategories).length === 0 ? (
          <div className="py-20 text-center text-zinc-400 font-medium bg-white rounded-xl border border-dashed border-zinc-300 text-sm">
            <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-3 text-zinc-400 border border-zinc-200">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            No material rates found. Log a new rate or add purchase orders to auto-populate your rate catalog.
          </div>
        ) : (
          Object.keys(alphabetCategories).sort().map(letter => (
            <div key={letter} className="mb-8">
              
              {/* Alphabet Header Separator */}
              <div className="flex items-center gap-4 mb-4">
                <span className="text-xl font-black text-zinc-900 w-6 font-mono">{letter}</span>
                <div className="h-px bg-zinc-200 flex-1"></div>
              </div>

              <div className="space-y-4">
                {alphabetCategories[letter].map(material => {
                  const materialRates = groupedRates[material];
                  // Sort by lowest price first
                  materialRates.sort((a, b) => (parseFloat(a.rate) || 0) - (parseFloat(b.rate) || 0));
                  const bestRateId = materialRates[0].id || materialRates[0]._id;
                  const lowestRate = parseFloat(materialRates[0].rate) || 0;
                  const lowestUnit = materialRates[0].unit || 'Pcs';
                  const isExpanded = expandedMaterials[material];

                  return (
                    <div key={material} className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden transition-all duration-200">
                      
                      {/* Material Title Card Header (Clickable Accordion) */}
                      <div 
                        onClick={() => toggleMaterialExpand(material)}
                        className="bg-white px-6 py-4 flex justify-between items-center cursor-pointer hover:bg-zinc-50 transition-colors border-b border-transparent data-[expanded=true]:border-zinc-200"
                        data-expanded={isExpanded}
                      >
                        <div className="flex items-center gap-3.5">
                          <div className={`w-7 h-7 rounded-md bg-zinc-100 flex items-center justify-center text-zinc-700 transition-transform duration-200 border border-zinc-200 ${isExpanded ? 'rotate-180 bg-zinc-900 text-white border-black' : ''}`}>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-zinc-900 tracking-tight">
                              {material}
                            </h3>
                            {!isExpanded && (
                              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
                                Lowest Price: <span className="text-emerald-700 font-black">₹{lowestRate.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span> /{lowestUnit}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] font-bold text-zinc-600 bg-zinc-100 border border-zinc-200 px-3 py-1 rounded-md uppercase tracking-widest shadow-sm">
                            {materialRates.length} {materialRates.length === 1 ? 'Quote' : 'Quotes'}
                          </span>
                        </div>
                      </div>

                      {/* Collapsible Vendor Table */}
                      {isExpanded && (
                        <div className="overflow-x-auto w-full animate-in slide-in-from-top-2 fade-in duration-200 bg-zinc-50/50">
                          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
                            <thead>
                              <tr className="text-zinc-500 text-[10px] uppercase tracking-widest border-b border-zinc-200 bg-zinc-50 font-bold">
                                <th className="py-3 px-6 w-1/3">Vendor Name</th>
                                <th className="py-3 px-4 text-right w-44">Rate / Unit</th>
                                <th className="py-3 px-4 w-36">Date Logged</th>
                                <th className="py-3 px-4">Notes</th>
                                <th className="py-3 px-6 text-right w-24">Action</th>
                              </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-zinc-100 bg-white">
                              {materialRates.map((rateObj) => {
                                const recordId = rateObj.id || rateObj._id;
                                const isBest = recordId === bestRateId;

                                return (
                                  <tr key={recordId} className={`transition-colors ${isBest ? 'bg-emerald-50/40 hover:bg-emerald-50/70' : 'hover:bg-zinc-50/80'}`}>
                                    <td className="py-4 px-6">
                                      <div className="flex items-center gap-3">
                                        <span className="font-bold text-xs text-zinc-900 tracking-tight">{rateObj.vendorName}</span>
                                        {isBest && (
                                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 text-[8px] font-bold uppercase tracking-widest rounded shadow-sm">
                                            Best Price
                                          </span>
                                        )}
                                      </div>
                                    </td>

                                    <td className="py-4 px-4 text-right">
                                      <span className={`font-black text-sm ${isBest ? 'text-emerald-700' : 'text-zinc-900'}`}>
                                        ₹{(parseFloat(rateObj.rate) || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                                      </span>
                                      <span className="text-[10px] text-zinc-400 ml-1.5 font-bold uppercase tracking-widest">/ {rateObj.unit || 'Pcs'}</span>
                                    </td>

                                    <td className="py-4 px-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">{rateObj.date}</td>
                                    <td className="py-4 px-4 text-xs text-zinc-600 truncate max-w-[250px] font-medium">{rateObj.notes || '-'}</td>
                                    
                                    <td className="py-4 px-6 text-right">
                                      <button 
                                        onClick={() => handleDelete(recordId)} 
                                        className="p-1.5 bg-white text-red-500 hover:bg-red-600 hover:text-white border border-red-200 rounded-lg transition-all cursor-pointer shadow-sm"
                                        title="Delete Rate"
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      </button>
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
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] border border-zinc-200">
            
            <div className="px-8 py-6 border-b border-zinc-200 flex justify-between items-center bg-white shrink-0">
              <div>
                <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Log Material Rate</h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Record a supplier quote</p>
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

            <div className="p-8 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-[#F4F4F5]">
              <form id="rateForm" onSubmit={handleSave} className="space-y-5 bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                
                <div>
                  <label className={labelClass}>Material Name <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. 18mm Century Plywood" 
                    value={formData.materialName} 
                    onChange={e => setFormData({...formData, materialName: e.target.value})} 
                    className={inputClass} 
                  />
                </div>
                
                <div className="relative" ref={vendorDropdownRef}>
                  <label className={labelClass}>Vendor / Supplier Name <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Type supplier name..." 
                    value={formData.vendorName} 
                    onChange={handleVendorInputChange} 
                    onFocus={() => {
                      if (vendorSuggestions.length > 0) setShowVendorDropdown(true);
                    }} 
                    className={inputClass} 
                    autoComplete="off"
                  />

                  {/* Autocomplete suggestions */}
                  {showVendorDropdown && (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-zinc-200 rounded-xl shadow-xl z-[120] max-h-52 overflow-y-auto">
                      <div className="p-3 border-b border-zinc-100 text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50 sticky top-0">
                        Select Supplier
                      </div>
                      {vendorSuggestions.map(v => (
                        <div
                          key={v.id || v.name}
                          onClick={() => handleSelectVendor(v)}
                          className="px-5 py-3 hover:bg-zinc-50 cursor-pointer text-xs font-bold text-zinc-900 border-b border-zinc-100 last:border-none transition-colors"
                        >
                          {v.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Rate (₹) <span className="text-red-500">*</span></label>
                    <input 
                      type="number" 
                      step="any" 
                      required 
                      placeholder="0.00" 
                      value={formData.rate} 
                      onChange={e => setFormData({...formData, rate: e.target.value})} 
                      className={inputClass} 
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Unit</label>
                    <select 
                      value={formData.unit} 
                      onChange={e => setFormData({...formData, unit: e.target.value})} 
                      className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2318181B%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
                    >
                      <option value="Pcs">Pcs</option>
                      <option value="SqFt">SqFt</option>
                      <option value="Rft">Rft</option>
                      <option value="Sheets">Sheets</option>
                      <option value="Bags">Bags</option>
                      <option value="Ltrs">Liters</option>
                      <option value="Mtrs">Meters</option>
                      <option value="Kgs">Kgs</option>
                      <option value="L.S.">L.S.</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Date of Quote/Bill</label>
                    <input 
                      type="date" 
                      required 
                      value={formData.date} 
                      onChange={e => setFormData({...formData, date: e.target.value})} 
                      className={inputClass} 
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Notes</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Ex-factory rate" 
                      value={formData.notes} 
                      onChange={e => setFormData({...formData, notes: e.target.value})} 
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
                className="px-6 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-bold uppercase tracking-widest rounded-lg text-[10px] transition-all cursor-pointer shadow-sm"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="rateForm" 
                disabled={submitting} 
                className="px-8 py-2.5 bg-zinc-900 hover:bg-black text-white font-bold uppercase tracking-widest rounded-lg text-[10px] shadow-sm transition-all cursor-pointer disabled:opacity-50 border border-black flex items-center gap-2"
              >
                {submitting ? (
                  <><svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg> Saving...</>
                ) : 'Save Rate'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}