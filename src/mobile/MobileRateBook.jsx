import React, { useState, useEffect } from 'react';
import { getMaterialRates, saveMaterialRate, deleteMaterialRate } from '.../db';

export default function MobileRateBook() {
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

  const inputClass = "w-full px-4 py-3.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-zinc-900 text-sm font-medium transition-all shadow-sm";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="w-full h-full flex flex-col font-['Poppins']">
      
      {/* HEADER SECTION */}
      <div className="mb-3 shrink-0">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Rate Book</h2>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Vendor Price Analyzer</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="bg-[#1E3A8A] hover:bg-blue-900 text-white font-black px-3.5 py-2.5 rounded-xl text-[10px] uppercase tracking-wider transition-all shadow-md active:scale-95"
          >
            + Log Rate
          </button>
        </div>

        {/* SEARCH BAR */}
        <div className="bg-white border border-zinc-200 rounded-2xl px-3.5 py-2 shadow-sm flex items-center">
          <span className="text-xs text-zinc-400 mr-2">🔍</span>
          <input 
            type="text" 
            placeholder="Search material or vendor name..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs font-medium text-zinc-800 outline-none placeholder:text-zinc-400"
          />
        </div>
      </div>

      {/* RESULTS STREAM */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {loading ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-xs">Loading rate analyzer...</div>
        ) : Object.keys(groupedRates).length === 0 ? (
          <div className="text-center py-12 bg-white/50 border border-zinc-200 border-dashed rounded-3xl mt-2">
            <span className="text-3xl mb-2 block">🏷️</span>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">No material rates logged yet</p>
          </div>
        ) : (
          Object.keys(groupedRates).map(material => {
            const materialRates = groupedRates[material];
            materialRates.sort((a, b) => a.rate - b.rate);
            const bestRateId = materialRates[0].id;

            return (
              <div key={material} className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-3">
                
                {/* MATERIAL GROUP HEADER */}
                <div className="border-b border-zinc-100 pb-2 flex justify-between items-center">
                  <h3 className="font-extrabold text-zinc-900 text-sm">{material}</h3>
                  <span className="bg-zinc-100 text-zinc-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase">
                    {materialRates.length} Quote{materialRates.length > 1 ? 's' : ''}
                  </span>
                </div>

                {/* VENDOR QUOTES CARDS */}
                <div className="space-y-2">
                  {materialRates.map((rateObj) => {
                    const isBest = rateObj.id === bestRateId;

                    return (
                      <div 
                        key={rateObj.id} 
                        className={`p-3 rounded-2xl border transition-all ${
                          isBest 
                            ? 'bg-emerald-50/70 border-emerald-200' 
                            : 'bg-zinc-50/60 border-zinc-100'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-extrabold text-zinc-900 text-xs">{rateObj.vendorName}</h4>
                              {isBest && (
                                <span className="bg-emerald-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                                  Best Price
                                </span>
                              )}
                            </div>
                            <p className="text-[9px] text-zinc-400 font-semibold mt-0.5">{rateObj.date}</p>
                          </div>

                          <div className="text-right flex flex-col items-end">
                            <span className={`text-sm font-black ${isBest ? 'text-emerald-700' : 'text-zinc-900'}`}>
                              ₹{rateObj.rate.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                              <span className="text-[9px] font-normal text-zinc-400 ml-0.5">/{rateObj.unit}</span>
                            </span>
                            <button 
                              onClick={() => handleDelete(rateObj.id)}
                              className="text-zinc-300 hover:text-red-500 text-[10px] font-bold mt-1"
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        {rateObj.notes && (
                          <p className="text-[10px] text-zinc-500 mt-2 bg-white/80 p-2 rounded-xl border border-zinc-100">
                            {rateObj.notes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* CREATE / LOG RATE BOTTOM SHEET */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full h-[85vh] rounded-t-[2.5rem] shadow-2xl flex flex-col animate-in slide-in-from-bottom-full duration-300">
            
            {/* Modal Header */}
            <div className="px-6 pt-6 pb-4 border-b border-zinc-100 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-extrabold text-zinc-900">Log Material Rate</h2>
                <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest mt-0.5">Quote & Invoice Price Book</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center bg-zinc-100 text-zinc-600 rounded-full font-bold active:bg-zinc-200"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <form id="rateForm" onSubmit={handleSave} className="space-y-4 pb-20">
                
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

                <div>
                  <label className={labelClass}>Vendor / Supplier Name <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Shri Ram Timbers" 
                    value={formData.vendorName} 
                    onChange={e => setFormData({...formData, vendorName: e.target.value})} 
                    className={inputClass} 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Rate (₹) <span className="text-red-500">*</span></label>
                    <input 
                      type="number" 
                      step="any" 
                      inputMode="decimal"
                      required 
                      placeholder="0.00" 
                      value={formData.rate} 
                      onChange={e => setFormData({...formData, rate: e.target.value})} 
                      className={inputClass} 
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Unit</label>
                    <div className="relative">
                      <select 
                        value={formData.unit} 
                        onChange={e => setFormData({...formData, unit: e.target.value})} 
                        className={`${inputClass} appearance-none font-bold`}
                      >
                        <option value="Pcs">Pcs</option>
                        <option value="SqFt">SqFt</option>
                        <option value="Sheets">Sheets</option>
                        <option value="Bags">Bags</option>
                        <option value="Ltrs">Liters</option>
                        <option value="Mtrs">Meters</option>
                        <option value="Kgs">Kgs</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">▼</div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Date of Quote / Bill</label>
                  <input 
                    type="date" 
                    required 
                    value={formData.date} 
                    onChange={e => setFormData({...formData, date: e.target.value})} 
                    className={inputClass} 
                  />
                </div>

                <div>
                  <label className={labelClass}>Notes / Transport Terms</label>
                  <textarea 
                    placeholder="e.g. Ex-factory price, includes unloading..." 
                    value={formData.notes} 
                    onChange={e => setFormData({...formData, notes: e.target.value})} 
                    className={`${inputClass} min-h-[80px] resize-none`} 
                  />
                </div>

              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 pb-[calc(env(safe-area-inset-bottom,20px)+16px)] border-t border-zinc-100 bg-white shrink-0">
              <button 
                type="submit" 
                form="rateForm"
                className="w-full py-4 bg-[#1E3A8A] text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-lg active:scale-[0.98] transition-transform"
              >
                Save Rate
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}