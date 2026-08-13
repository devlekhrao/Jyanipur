import React, { useState, useEffect } from 'react';
import { getMaterialRates, saveMaterialRate, deleteMaterialRate } from './db';

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
    const data = await getMaterialRates();
    setRates(data);
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

  const inputClass = "w-full px-4 py-3 rounded-xl border-none bg-zinc-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 text-sm font-medium transition-all shadow-inner";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1";

  return (
    <div className="w-full font-['Poppins'] pb-12 relative">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-4 border-b border-zinc-300/50 mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-800 tracking-tight">Material Rate Analyzer</h2>
          <p className="text-zinc-500 text-xs mt-1 font-medium">Compare past purchases to find the best vendor prices.</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="h-9 bg-zinc-900 hover:bg-black text-white px-5 rounded-xl text-xs font-bold transition-all shadow-md"
          >
            + Log New Rate
          </button>
        </div>
      </div>

      {/* BIG SEARCH BAR */}
      <div className="mb-8">
        <div className="relative w-full max-w-2xl">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <span className="text-xl text-zinc-400">🔍</span>
          </div>
          <input 
            type="text" 
            placeholder="Search for a material (e.g., '18mm Plywood', 'Asian Paints')..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white/80 backdrop-blur-xl border border-zinc-200/80 rounded-2xl shadow-sm text-zinc-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm placeholder:text-zinc-400 placeholder:font-medium"
          />
        </div>
      </div>

      {/* RESULTS AREA */}
      <div className="space-y-8">
        {loading ? (
          <div className="py-12 text-center text-zinc-500 font-medium">Loading rate book...</div>
        ) : Object.keys(groupedRates).length === 0 ? (
          <div className="py-12 text-center text-zinc-400 font-medium bg-white/40 rounded-3xl border border-dashed border-zinc-300">
            No materials found. Log a new rate to start building your price book.
          </div>
        ) : (
          Object.keys(groupedRates).map(material => {
            const materialRates = groupedRates[material];
            // Sort from cheapest to most expensive
            materialRates.sort((a, b) => a.rate - b.rate);
            const bestRateId = materialRates[0].id; // The cheapest one

            return (
              <div key={material} className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white/80 shadow-xl overflow-hidden">
                <div className="bg-zinc-100/50 px-6 py-4 border-b border-zinc-200/50 flex justify-between items-center">
                  <h3 className="text-sm font-bold text-zinc-900">{material}</h3>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{materialRates.length} Vendor Quotes/Bills</span>
                </div>

                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="text-zinc-400 text-[9px] uppercase tracking-widest border-b border-zinc-200/50 bg-white/30">
                        <th className="py-3 px-6 font-semibold w-1/3">Vendor Name</th>
                        <th className="py-3 px-4 font-semibold text-right">Rate / Unit</th>
                        <th className="py-3 px-4 font-semibold">Date Logged</th>
                        <th className="py-3 px-4 font-semibold">Notes</th>
                        <th className="py-3 px-6 font-semibold text-center w-16">Action</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm text-zinc-700 divide-y divide-zinc-200/30">
                      {materialRates.map((rateObj) => (
                        <tr key={rateObj.id} className={`transition-colors ${rateObj.id === bestRateId ? 'bg-emerald-50/50' : 'hover:bg-white/60'}`}>
                          <td className="py-4 px-6 font-semibold text-zinc-800">
                            {rateObj.vendorName}
                            {rateObj.id === bestRateId && (
                              <span className="ml-3 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase tracking-widest rounded">Best Price</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <span className={`font-bold ${rateObj.id === bestRateId ? 'text-emerald-600' : 'text-zinc-800'}`}>
                              ₹{rateObj.rate.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                            </span>
                            <span className="text-[10px] text-zinc-500 ml-1">/ {rateObj.unit}</span>
                          </td>
                          <td className="py-4 px-4 text-xs font-medium text-zinc-500">{rateObj.date}</td>
                          <td className="py-4 px-4 text-xs text-zinc-500 truncate max-w-[200px]">{rateObj.notes || '-'}</td>
                          <td className="py-4 px-6 text-center">
                            <button onClick={() => handleDelete(rateObj.id)} className="text-[10px] font-bold text-red-400 hover:text-red-600 uppercase tracking-widest transition-colors">Del</button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-3xl w-full max-w-md rounded-[2rem] shadow-[0_40px_80px_rgba(0,0,0,0.2)] border border-white/60 p-8">
            <h2 className="text-xl font-bold text-zinc-900 mb-1">Log Material Rate</h2>
            <p className="text-zinc-500 text-[10px] font-medium mb-6 uppercase tracking-widest">Record a price from a vendor quote or bill.</p>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className={labelClass}>Material Name *</label>
                <input type="text" required placeholder="e.g., 18mm Century Plywood" value={formData.materialName} onChange={e => setFormData({...formData, materialName: e.target.value})} className={inputClass} />
              </div>
              
              <div>
                <label className={labelClass}>Vendor / Supplier Name *</label>
                <input type="text" required placeholder="e.g., Shri Ram Timbers" value={formData.vendorName} onChange={e => setFormData({...formData, vendorName: e.target.value})} className={inputClass} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Rate (₹) *</label>
                  <input type="number" step="any" required placeholder="0.00" value={formData.rate} onChange={e => setFormData({...formData, rate: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Unit</label>
                  <select value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className={`${inputClass} cursor-pointer appearance-none`}>
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

              <div className="flex gap-3 pt-4 border-t border-zinc-200/80">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 font-bold rounded-xl transition-colors text-xs uppercase tracking-wider">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-zinc-900 hover:bg-black text-white font-bold rounded-xl transition-all shadow-md text-xs uppercase tracking-wider">Save Rate</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}