import React, { useState, useEffect } from 'react';
import { getProjects, getMeasurementSheets, saveMeasurementSheet, deleteMeasurementSheet } from '.../db';

export default function MobileMeasurementSheet() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [sheets, setSheets] = useState([]);
  
  // Sheet Editor State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentSheet, setCurrentSheet] = useState({
    id: null,
    projectId: '',
    title: '',
    date: new Date().toISOString().split('T')[0],
    data: []
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedProjects, fetchedSheets] = await Promise.all([
        getProjects(),
        getMeasurementSheets()
      ]);
      setProjects((fetchedProjects || []).filter(p => p.status !== 'Completed'));
      setSheets(fetchedSheets || []);
    } catch (e) {
      console.warn("Ensure measurement sheet functions exist in db.js");
      setProjects([]);
      setSheets([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const createEmptyRow = () => ({
    location: '', description: '', unit: 'SqFt', nos: '', l: '', w: '', h: '', deduction: '', total: 0, remarks: ''
  });

  const openNewSheet = () => {
    setCurrentSheet({
      id: null,
      projectId: projects.length > 0 ? projects[0].id : '',
      title: 'New Measurement Log',
      date: new Date().toISOString().split('T')[0],
      data: Array.from({ length: 5 }, () => createEmptyRow())
    });
    setIsEditorOpen(true);
  };

  const openExistingSheet = (sheet) => {
    setCurrentSheet(sheet);
    setIsEditorOpen(true);
  };

  const addRows = (count = 3) => {
    const newRows = Array.from({ length: count }, () => createEmptyRow());
    setCurrentSheet(prev => ({ ...prev, data: [...prev.data, ...newRows] }));
  };

  const handleCellChange = (index, field, value) => {
    const newData = [...currentSheet.data];
    newData[index][field] = value;

    if (['nos', 'l', 'w', 'h', 'deduction'].includes(field)) {
      const row = newData[index];
      const ded = parseFloat(row.deduction) || 0;
      
      if (!row.nos && !row.l && !row.w && !row.h && !row.deduction) {
        row.total = 0;
      } else {
        let val = (parseFloat(row.nos) || 1);
        if (row.l) val *= parseFloat(row.l);
        if (row.w) val *= parseFloat(row.w);
        if (row.h) val *= parseFloat(row.h);
        
        row.total = Math.max(0, val - ded);
      }
    }
    
    setCurrentSheet(prev => ({ ...prev, data: newData }));
  };

  const removeRow = (index) => {
    const newData = currentSheet.data.filter((_, i) => i !== index);
    setCurrentSheet(prev => ({ ...prev, data: newData }));
  };

  const handleSave = async () => {
    if (!currentSheet.projectId || !currentSheet.title) {
      return alert("Project site and Sheet Title are required.");
    }

    const cleanedData = currentSheet.data.filter(row => 
      row.location || row.description || row.l || row.w || row.total > 0
    );
    
    try {
      await saveMeasurementSheet({ ...currentSheet, data: cleanedData });
      setIsEditorOpen(false);
      await loadData();
    } catch (err) {
      alert("Failed to save sheet.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this measurement sheet permanently?")) {
      await deleteMeasurementSheet(id);
      await loadData();
    }
  };

  const inputClass = "w-full px-3.5 py-3 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-zinc-900 text-xs font-medium transition-all shadow-sm";
  const labelClass = "block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1 ml-0.5";

  const grandTotal = currentSheet.data.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0);

  // VIEW 1: SPREADSHEET EDITOR
  if (isEditorOpen) {
    return (
      <div className="w-full h-full flex flex-col font-['Poppins']">
        
        {/* HEADER BAR */}
        <div className="mb-3 shrink-0 flex justify-between items-center border-b border-zinc-100 pb-2">
          <div>
            <h2 className="text-xl font-extrabold text-zinc-900">
              {currentSheet.id ? 'Edit Measurement Sheet' : 'New Measurement Log'}
            </h2>
            <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest">Joint Site Measurement</p>
          </div>
          <button 
            onClick={() => setIsEditorOpen(false)}
            className="text-zinc-400 font-bold text-sm bg-zinc-100 px-3 py-1.5 rounded-xl"
          >
            ✕ Close
          </button>
        </div>

        {/* TOTAL QUANTITY STRIP */}
        <div className="bg-emerald-600 text-white p-3.5 rounded-2xl shadow-md mb-3 flex justify-between items-center shrink-0">
          <div>
            <span className="text-[8px] font-black uppercase tracking-widest text-emerald-200 block">Grand Total Quantity</span>
            <p className="text-xl font-black">{grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
          </div>
          <span className="text-2xl">📐</span>
        </div>

        {/* EDITOR FORM AREA */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-24 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          
          {/* SHEET DETAILS */}
          <div className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-3">
            <div>
              <label className={labelClass}>Project Site <span className="text-red-500">*</span></label>
              <div className="relative">
                <select 
                  value={currentSheet.projectId} 
                  onChange={e => setCurrentSheet({...currentSheet, projectId: e.target.value})}
                  className={`${inputClass} appearance-none font-bold`}
                >
                  <option value="" disabled>Select Project Site...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">▼</div>
              </div>
            </div>

            <div>
              <label className={labelClass}>Sheet Title <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                value={currentSheet.title} 
                onChange={e => setCurrentSheet({...currentSheet, title: e.target.value})}
                placeholder="e.g. Ground Floor Woodwork" 
                className={inputClass} 
              />
            </div>

            <div>
              <label className={labelClass}>Log Date</label>
              <input 
                type="date" 
                value={currentSheet.date} 
                onChange={e => setCurrentSheet({...currentSheet, date: e.target.value})}
                className={inputClass} 
              />
            </div>
          </div>

          {/* MEASUREMENT ROWS STREAM */}
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Measurement Entries ({currentSheet.data.length})</span>
              <button 
                onClick={() => addRows(3)}
                className="text-[10px] font-black text-[#1E3A8A] bg-blue-50 px-3 py-1 rounded-xl uppercase active:scale-95 transition-transform"
              >
                + Add Rows
              </button>
            </div>

            {currentSheet.data.map((row, idx) => (
              <div key={idx} className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-3 relative">
                <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
                  <span className="text-[10px] font-black text-[#1E3A8A] bg-blue-50 px-2.5 py-0.5 rounded-md">
                    Row #{idx + 1}
                  </span>
                  <button 
                    onClick={() => removeRow(idx)}
                    className="text-zinc-300 hover:text-red-500 text-xs font-bold p-1"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>Location / Room</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Master Bedroom" 
                      value={row.location} 
                      onChange={e => handleCellChange(idx, 'location', e.target.value)} 
                      className={inputClass} 
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Unit</label>
                    <select 
                      value={row.unit} 
                      onChange={e => handleCellChange(idx, 'unit', e.target.value)} 
                      className={inputClass}
                    >
                      <option value="SqFt">SqFt</option>
                      <option value="Cft">Cft</option>
                      <option value="Rft">Rft</option>
                      <option value="Pcs">Pcs</option>
                      <option value="Sqm">Sqm</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Scope Description</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Wardrobe Laminate Paneling" 
                    value={row.description} 
                    onChange={e => handleCellChange(idx, 'description', e.target.value)} 
                    className={inputClass} 
                  />
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className={labelClass}>Nos</label>
                    <input type="number" inputMode="decimal" placeholder="1" value={row.nos} onChange={e => handleCellChange(idx, 'nos', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>L</label>
                    <input type="number" inputMode="decimal" placeholder="0" value={row.l} onChange={e => handleCellChange(idx, 'l', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>W</label>
                    <input type="number" inputMode="decimal" placeholder="0" value={row.w} onChange={e => handleCellChange(idx, 'w', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>H</label>
                    <input type="number" inputMode="decimal" placeholder="0" value={row.h} onChange={e => handleCellChange(idx, 'h', e.target.value)} className={inputClass} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>Deduction (-)</label>
                    <input 
                      type="number" 
                      inputMode="decimal" 
                      placeholder="0" 
                      value={row.deduction} 
                      onChange={e => handleCellChange(idx, 'deduction', e.target.value)} 
                      className={`${inputClass} font-bold text-red-500`} 
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Calculated Total</label>
                    <div className="h-[46px] bg-emerald-50 border border-emerald-100 rounded-xl px-3 flex items-center font-black text-emerald-700 text-sm">
                      {parseFloat(row.total || 0).toFixed(2)}
                    </div>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Remarks</label>
                  <input 
                    type="text" 
                    placeholder="Notes..." 
                    value={row.remarks} 
                    onChange={e => handleCellChange(idx, 'remarks', e.target.value)} 
                    className={inputClass} 
                  />
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* FIXED BOTTOM SAVE BAR */}
        <div className="fixed bottom-0 left-0 right-0 p-4 pb-[calc(env(safe-area-inset-bottom,20px)+12px)] bg-white border-t border-zinc-200 shadow-lg flex gap-2">
          <button 
            onClick={() => addRows(3)}
            className="w-1/3 py-4 bg-zinc-100 text-zinc-700 font-extrabold rounded-xl text-xs uppercase tracking-wider active:scale-95 transition-transform"
          >
            + 3 Rows
          </button>
          <button 
            onClick={handleSave}
            className="w-2/3 py-4 bg-[#1E3A8A] text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md active:scale-95 transition-transform"
          >
            Save Sheet
          </button>
        </div>

      </div>
    );
  }

  // VIEW 2: SHEETS LIST DASHBOARD
  return (
    <div className="w-full h-full flex flex-col font-['Poppins']">
      
      {/* HEADER SECTION */}
      <div className="mb-3 shrink-0">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Measurement Sheets</h2>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Site Quantities & Dimensions</p>
          </div>
          <button 
            onClick={openNewSheet}
            className="bg-[#1E3A8A] hover:bg-blue-900 text-white font-black px-3.5 py-2.5 rounded-xl text-[10px] uppercase tracking-wider transition-all shadow-md active:scale-95"
          >
            + Blank Sheet
          </button>
        </div>
      </div>

      {/* SHEETS STREAM */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {loading ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-xs">Loading measurement sheets...</div>
        ) : sheets.length === 0 ? (
          <div className="text-center py-12 bg-white/50 border border-zinc-200 border-dashed rounded-3xl mt-2">
            <span className="text-3xl mb-2 block">📊</span>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">No measurement sheets found</p>
          </div>
        ) : (
          sheets.map(sheet => {
            const rowCount = sheet.data.length;
            const grandTotal = sheet.data.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0);

            return (
              <div 
                key={sheet.id} 
                className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-3 active:scale-[0.99] transition-transform"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-extrabold text-zinc-900 text-base leading-tight">{sheet.title}</h3>
                    <p className="text-[10px] font-bold text-[#1E3A8A] uppercase tracking-widest mt-0.5">
                      {sheet.projectName || 'General Site'}
                    </p>
                  </div>
                  <button 
                    onClick={() => handleDelete(sheet.id)}
                    className="text-zinc-300 hover:text-red-500 p-1 text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-zinc-50 p-3 rounded-xl border border-zinc-100 text-xs">
                  <div>
                    <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block">Entries</span>
                    <p className="font-extrabold text-zinc-800">{rowCount} Rows</p>
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest block">Total Quantity</span>
                    <p className="font-black text-emerald-700">{grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1 border-t border-zinc-100">
                  <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">{sheet.date}</span>
                  <button 
                    onClick={() => openExistingSheet(sheet)}
                    className="bg-zinc-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider active:scale-95 transition-transform"
                  >
                    Open Sheet →
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}