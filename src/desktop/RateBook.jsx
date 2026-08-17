import React, { useState, useEffect } from 'react';
import { getMaterialRates, saveMaterialRate, deleteMaterialRate } from '../db';

export default function RateBook() {
  const [loading, setLoading] = useState(true);
  const [rates, setRates] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
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
      const data = await getMaterialRates();
      setRates(data || []);
    } catch (e) {
      console.warn("Ensure getMaterialRates is implemented in db.js");
      setRates([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.materialName || !formData.vendorName || !formData.rate) {
      return alert("Material, Vendor, and Rate are required.");
    }
    try {
      await saveMaterialRate({
        ...formData,
        rate: parseFloat(formData.rate)
      });
      setIsModalOpen(false);
      setFormData({ materialName: '', vendorName: '', rate: '', unit: 'Pcs', date: new Date().toISOString().split('T')[0], notes: '' });
      await loadData();
    } catch (err) {
      alert("Failed to save rate.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this rate record?")) {
      await deleteMaterialRate(id);
      await loadData();
    }
  };

  // Filter and group by search query
  const filteredRates = rates.filter(r => 
    r.materialName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.vendorName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Grouping logic to identify the best rate for the searched material
  const groupedRates = {};
  filteredRates.forEach(r => {
    if (!groupedRates[r.materialName]) groupedRates[r.materialName] = [];
    groupedRates[r.materialName].push(r);
  });

  const inputClass = "w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-zinc-900 text-xs font-medium transition-all shadow-sm";
  const labelClass = "block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="w-full h-full font-['Poppins'] flex flex-col">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-4 border-b border-zinc-200 mb-6 gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Material Rate Analyzer</h2>
          <p className="text-zinc-500 text-xs mt-1 font-medium">Compare past purchases to find the best vendor prices.</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="bg-[#1E3A8A] hover:bg-blue-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer"
          >
            + Log New Rate
          </button>
        </div>
      </div>

      {/* BIG SEARCH BAR */}
      <div className="mb-6 shrink-0">
        <div className="relative w-full max-w-2xl">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <span className="text-base text-zinc-400">🔍</span>
          </div>
          <input 
            type="text" 
            placeholder="Search for a material (e.g., '18mm Plywood', 'Asian Paints')..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 bg-white border border-zinc-200 rounded-2xl shadow-sm text-zinc-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] transition-all text-xs placeholder:text-zinc-400 placeholder:font-medium"
          />
        </div>
      </div>

      {/* RESULTS AREA */}
      <div className="flex-1 overflow-y-auto space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {loading ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-xs">Loading rate book...</div>
        ) : Object.keys(groupedRates).length === 0 ? (
          <div className="py-20 text-center text-zinc-400 font-medium bg-white rounded-[2rem] border border-dashed border-zinc-200 text-xs">
            No materials found. Log a new rate to start building your price book.
          </div>
        ) : (
          Object.keys(groupedRates).map(material => {
            const materialRates = groupedRates[material];
            materialRates.sort((a, b) => a.rate - b.rate);
            const bestRateId = materialRates[0].id;

            return (
              <div key={material} className="bg-white rounded-[2rem] border border-zinc-200 shadow-sm overflow-hidden">
                <div className="bg-zinc-50/80 px-6 py-4 border-b border-zinc-100 flex justify-between items-center">
                  <h3 className="text-sm font-bold text-zinc-900">{material}</h3>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{materialRates.length} Vendor Quotes/Bills</span>
                </div>

                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
                    <thead>
                      <tr className="text-zinc-400 text-[9px] uppercase tracking-widest border-b border-zinc-100 bg-zinc-50/30">
                        <th className="py-3.5 px-6 font-bold w-1/3">Vendor Name</th>
                        <th className="py-3.5 px-4 font-bold text-right">Rate / Unit</th>
                        <th className="py-3.5 px-4 font-bold">Date Logged</th>
                        <th className="py-3.5 px-4 font-bold">Notes</th>
                        <th className="py-3.5 px-6 font-bold text-center w-20">Action</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs text-zinc-800 divide-y divide-zinc-100">
                      {materialRates.map((rateObj) => (
                        <tr key={rateObj.id} className={`transition-colors ${rateObj.id === bestRateId ? 'bg-emerald-50/50' : 'hover:bg-zinc-50'}`}>
                          <td className="py-4 px-6 font-bold text-zinc-900">
                            {rateObj.vendorName}
                            {rateObj.id === bestRateId && (
                              <span className="ml-3 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-semibold text-[11px] uppercase tracking-widest rounded-md">Best Price</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <span className={`font-semibold text-[11px] ${rateObj.id === bestRateId ? 'text-emerald-600' : 'text-zinc-900'}`}>
                              ₹{rateObj.rate.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                            </span>
                            <span className="text-[10px] text-zinc-400 ml-1 font-semibold">/ {rateObj.unit}</span>
                          </td>
                          <td className="py-4 px-4 text-xs font-medium text-zinc-500">{rateObj.date}</td>
                          <td className="py-4 px-4 text-xs text-zinc-500 truncate max-w-[200px]">{rateObj.notes || '-'}</td>
                          <td className="py-4 px-6 text-center">
                            <button onClick={() => handleDelete(rateObj.id)} className="text-[10px] font-bold text-red-400 hover:text-red-600 uppercase tracking-widest transition-colors cursor-pointer">Del</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-zinc-900 mb-1">Log Material Rate</h2>
            <p className="text-zinc-500 text-[10px] font-bold mb-6 uppercase tracking-widest">Record a price from a vendor quote or bill.</p>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className={labelClass}>Material Name <span className="text-red-500">*</span></label>
                <input type="text" required placeholder="e.g., 18mm Century Plywood" value={formData.materialName} onChange={e => setFormData({...formData, materialName: e.target.value})} className={inputClass} />
              </div>
              
              <div>
                <label className={labelClass}>Vendor / Supplier Name <span className="text-red-500">*</span></label>
                <input type="text" required placeholder="e.g., Shri Ram Timbers" value={formData.vendorName} onChange={e => setFormData({...formData, vendorName: e.target.value})} className={inputClass} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Rate (₹) <span className="text-red-500">*</span></label>
                  <input type="number" step="any" required placeholder="0.00" value={formData.rate} onChange={e => setFormData({...formData, rate: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Unit</label>
                  <select value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className={`${inputClass} cursor-pointer`}>
                    <option value="Pcs">Pcs</option>
                    <option value="SqFt">SqFt</option>
                    <option value="Sheets">Sheets</option>
                    <option value="Bags">Bags</option>
                    <option value="Ltrs">Liters</option>
                    <option value="Mtrs">Meters</option>
                    <option value="Kgs">Kgs</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Date of Quote/Bill</label>
                  <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Notes</label>
                  <input type="text" placeholder="e.g., Ex-factory price" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className={inputClass} />
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-zinc-100 mt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all cursor-pointer">Cancel</button>
                <button type="submit" className="flex-1 py-3.5 bg-[#1E3A8A] hover:bg-blue-900 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all shadow-md cursor-pointer">Save Rate</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}