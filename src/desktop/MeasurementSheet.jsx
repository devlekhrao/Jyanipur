import React, { useState, useEffect } from 'react';
import { getProjects, getMeasurementSheets, saveMeasurementSheet, deleteMeasurementSheet } from '../db';

export default function MeasurementSheet() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [sheets, setSheets] = useState([]);
  
  // Spreadsheet State
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

  const openNewSheet = () => {
    setCurrentSheet({
      id: null,
      projectId: projects.length > 0 ? projects[0].id : '',
      title: 'New Measurement Sheet',
      date: new Date().toISOString().split('T')[0],
      data: Array.from({ length: 15 }, () => createEmptyRow())
    });
    setIsEditorOpen(true);
  };

  const openExistingSheet = (sheet) => {
    setCurrentSheet(sheet);
    setIsEditorOpen(true);
  };

  const createEmptyRow = () => ({
    location: '', description: '', unit: 'SqFt', nos: '', l: '', w: '', h: '', deduction: '', total: 0, remarks: ''
  });

  const addRows = (count = 5) => {
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
        
        row.total = val - ded;
      }
    }
    
    setCurrentSheet(prev => ({ ...prev, data: newData }));
  };

  const handleSave = async () => {
    if (!currentSheet.projectId || !currentSheet.title) {
      return alert("Project and Title are required.");
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
    if (window.confirm("Are you sure you want to delete this sheet permanently?")) {
      await deleteMeasurementSheet(id);
      await loadData();
    }
  };

  // --- SPREADSHEET EDITOR VIEW ---
  if (isEditorOpen) {
    const grandTotal = currentSheet.data.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0);
    const cellClass = "w-full bg-transparent outline-none focus:bg-amber-50/50 px-2 py-2 text-xs text-zinc-800 font-medium transition-colors";
    
    return (
      <div className="w-full h-full font-sans flex flex-col">
        {/* Editor Toolbar */}
        <div className="bg-white border border-zinc-200 shadow-sm rounded-2xl p-4 mb-6 shrink-0 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="flex-1 w-full flex flex-col md:flex-row gap-4 items-center">
            <button onClick={() => setIsEditorOpen(false)} className="text-zinc-500 hover:text-zinc-900 font-bold text-xs uppercase tracking-widest transition-colors cursor-pointer">&larr; Back</button>
            <div className="h-4 w-px bg-zinc-200 hidden md:block"></div>
            <select 
              value={currentSheet.projectId} 
              onChange={e => setCurrentSheet({...currentSheet, projectId: e.target.value})}
              className="bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 px-3 py-2 outline-none cursor-pointer w-full md:w-56"
            >
              <option value="" disabled>Select Project Site</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input 
              type="text" 
              value={currentSheet.title} 
              onChange={e => setCurrentSheet({...currentSheet, title: e.target.value})} 
              placeholder="Sheet Title (e.g. Ground Floor Woodwork)" 
              className="bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 px-3.5 py-2 outline-none flex-1 w-full"
            />
            <input 
              type="date" 
              value={currentSheet.date} 
              onChange={e => setCurrentSheet({...currentSheet, date: e.target.value})} 
              className="bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 px-3 py-2 outline-none cursor-pointer w-full md:w-40"
            />
          </div>
          <div className="flex gap-3 w-full md:w-auto items-center">
            <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-semibold text-[11px] whitespace-nowrap">
              Total: {grandTotal.toFixed(2)}
            </div>
            <button onClick={handleSave} className="bg-[#1E3A8A] hover:bg-blue-900 text-white px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md cursor-pointer transition-all w-full md:w-auto">
              Save Sheet
            </button>
          </div>
        </div>

        {/* The Spreadsheet Grid Container */}
        <div className="bg-white border border-zinc-200 shadow-sm rounded-[2rem] flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-x-auto overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-[9px] text-zinc-400 font-bold uppercase tracking-widest divide-x divide-zinc-200 sticky top-0 bg-zinc-50 z-10">
                  <th className="w-10 text-center py-3">#</th>
                  <th className="px-3 py-3 w-48">Location / Room</th>
                  <th className="px-3 py-3 min-w-[200px]">Item Description</th>
                  <th className="px-3 py-3 w-24">Unit</th>
                  <th className="px-2 py-3 w-16 text-center">Nos</th>
                  <th className="px-2 py-3 w-20 text-center">L</th>
                  <th className="px-2 py-3 w-20 text-center">W</th>
                  <th className="px-2 py-3 w-20 text-center">H</th>
                  <th className="px-2 py-3 w-24 text-center">Ded (-)</th>
                  <th className="px-3 py-3 w-28 text-right text-emerald-700">Total</th>
                  <th className="px-3 py-3 w-48">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-xs">
                {currentSheet.data.map((row, idx) => (
                  <tr key={idx} className="divide-x divide-zinc-100 hover:bg-zinc-50 focus-within:bg-blue-50/30 group">
                    <td className="w-10 text-center text-[10px] font-bold text-zinc-400 bg-zinc-50 select-none group-focus-within:bg-[#1E3A8A] group-focus-within:text-white transition-colors">{idx + 1}</td>
                    <td><input type="text" value={row.location} onChange={e => handleCellChange(idx, 'location', e.target.value)} className={cellClass} /></td>
                    <td><input type="text" value={row.description} onChange={e => handleCellChange(idx, 'description', e.target.value)} className={cellClass} /></td>
                    <td>
                      <select value={row.unit} onChange={e => handleCellChange(idx, 'unit', e.target.value)} className={`${cellClass} appearance-none cursor-pointer font-bold text-zinc-600`}>
                        <option value="SqFt">SqFt</option><option value="Cft">Cft</option><option value="Rft">Rft</option><option value="Pcs">Pcs</option><option value="Sqm">Sqm</option>
                      </select>
                    </td>
                    <td><input type="number" step="any" value={row.nos} onChange={e => handleCellChange(idx, 'nos', e.target.value)} className={`${cellClass} text-center`} /></td>
                    <td><input type="number" step="any" value={row.l} onChange={e => handleCellChange(idx, 'l', e.target.value)} className={`${cellClass} text-center`} /></td>
                    <td><input type="number" step="any" value={row.w} onChange={e => handleCellChange(idx, 'w', e.target.value)} className={`${cellClass} text-center`} /></td>
                    <td><input type="number" step="any" value={row.h} onChange={e => handleCellChange(idx, 'h', e.target.value)} className={`${cellClass} text-center`} /></td>
                    <td><input type="number" step="any" value={row.deduction} onChange={e => handleCellChange(idx, 'deduction', e.target.value)} className={`${cellClass} text-center text-red-500 font-bold`} /></td>
                    <td className="px-3 py-2 text-right font-semibold text-[11px] text-emerald-600 bg-emerald-50/20 select-none">{parseFloat(row.total || 0).toFixed(2)}</td>
                    <td><input type="text" value={row.remarks} onChange={e => handleCellChange(idx, 'remarks', e.target.value)} className={cellClass} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={() => addRows(5)} className="w-full py-3 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 text-xs font-bold uppercase tracking-widest border-t border-zinc-200 transition-colors cursor-pointer shrink-0">
            + Add 5 More Rows
          </button>
        </div>
      </div>
    );
  }

  // --- MAIN DASHBOARD VIEW ---
  return (
    <div className="w-full h-full font-sans flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-4 border-b border-zinc-200 mb-6 gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Joint Measurement Sheets</h2>
          <p className="text-zinc-500 text-xs mt-1 font-medium">Build, calculate, and store site measurement spreadsheets.</p>
        </div>
        <button onClick={openNewSheet} className="bg-[#1E3A8A] hover:bg-blue-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer">
          + Create Blank Sheet
        </button>
      </div>

      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {loading ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-xs">Loading spreadsheets...</div>
        ) : sheets.length === 0 ? (
          <div className="py-20 text-center bg-white border border-dashed border-zinc-200 rounded-[2rem]">
            <span className="text-3xl block mb-2">📊</span>
            <h3 className="text-sm font-bold text-zinc-800">No Sheets Found</h3>
            <p className="text-xs text-zinc-500 mt-1 mb-4">Start by creating your first measurement sheet.</p>
            <button onClick={openNewSheet} className="text-xs font-bold text-[#1E3A8A] hover:underline uppercase tracking-wider cursor-pointer">Create Sheet</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sheets.map(sheet => {
              const rowCount = sheet.data.length;
              const grandTotal = sheet.data.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0);
              
              return (
                <div key={sheet.id} className="bg-white border border-zinc-200 shadow-sm hover:shadow-md transition-all rounded-[2rem] p-6 flex flex-col justify-between group relative">
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-emerald-50 text-emerald-700 text-2xl p-3 rounded-2xl border border-emerald-100">📊</div>
                    <button onClick={() => handleDelete(sheet.id)} className="text-[10px] font-bold text-zinc-300 hover:text-red-500 uppercase tracking-widest transition-colors opacity-0 group-hover:opacity-100 cursor-pointer">Delete</button>
                  </div>
                  
                  <div>
                    <h3 className="text-base font-bold text-zinc-900 leading-tight mb-1 truncate">{sheet.title}</h3>
                    <p className="text-[9px] font-bold text-[#1E3A8A] uppercase tracking-widest mb-4">{sheet.projectName || 'General Site'}</p>
                    
                    <div className="space-y-2 mb-6 border-t border-zinc-100 pt-4">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500 font-medium">Date Logged</span>
                        <span className="font-bold text-zinc-800">{sheet.date}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500 font-medium">Total Entries</span>
                        <span className="font-bold text-zinc-800">{rowCount} Rows</span>
                      </div>
                      <div className="flex justify-between items-center text-xs bg-zinc-50 p-2.5 rounded-xl mt-2 border border-zinc-100">
                        <span className="text-zinc-500 font-bold uppercase tracking-widest text-[9px]">Total Quantity</span>
                        <span className="font-semibold text-[11px] text-emerald-600">{grandTotal.toLocaleString('en-IN', {maximumFractionDigits: 2})}</span>
                      </div>
                    </div>
                  </div>

                  <button onClick={() => openExistingSheet(sheet)} className="w-full py-3 bg-zinc-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer">
                    Open Spreadsheet &rarr;
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  );
}