import React, { useState, useEffect } from 'react';
import { getProjects, getMeasurementSheets, saveMeasurementSheet, deleteMeasurementSheet } from './db';

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
    const [fetchedProjects, fetchedSheets] = await Promise.all([
      getProjects(),
      getMeasurementSheets()
    ]);
    setProjects(fetchedProjects.filter(p => p.status !== 'Completed'));
    setSheets(fetchedSheets);
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
      data: Array.from({ length: 15 }, () => createEmptyRow()) // Start with 15 empty rows
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

    // Auto-calculate Total dynamically
    if (['nos', 'l', 'w', 'h', 'deduction'].includes(field)) {
      const row = newData[index];
      const nos = parseFloat(row.nos) || 1; // If empty, assume 1 for multiplication
      const l = parseFloat(row.l) || 1;
      const w = parseFloat(row.w) || 1;
      const h = parseFloat(row.h) || 1;
      const ded = parseFloat(row.deduction) || 0;
      
      // If user typed nothing in dimensions, total should be 0, not 1.
      if (!row.nos && !row.l && !row.w && !row.h && !row.deduction) {
        row.total = 0;
      } else {
        // Only multiply dimensions that actually have an input
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
    // Filter out completely empty rows before saving to keep DB clean
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
    const cellClass = "w-full bg-transparent outline-none focus:bg-amber-50/50 px-2 py-1.5 text-xs text-zinc-800 font-medium transition-colors";
    
    return (
      <div className="w-full font-['Poppins'] pb-12">
        {/* Editor Toolbar */}
        <div className="bg-white/80 backdrop-blur-xl border border-zinc-200 shadow-sm rounded-2xl p-4 mb-6 sticky top-4 z-40 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="flex-1 w-full flex flex-col md:flex-row gap-4">
            <button onClick={() => setIsEditorOpen(false)} className="text-zinc-400 hover:text-zinc-800 font-bold text-xs uppercase tracking-widest transition-colors">&larr; Back</button>
            <div className="h-4 w-px bg-zinc-300 hidden md:block mt-1"></div>
            <select 
              value={currentSheet.projectId} 
              onChange={e => setCurrentSheet({...currentSheet, projectId: e.target.value})}
              className="bg-zinc-100 border-none rounded-lg text-xs font-bold text-zinc-700 px-3 py-2 outline-none w-48"
            >
              <option value="" disabled>Select Project Site</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input 
              type="text" 
              value={currentSheet.title} 
              onChange={e => setCurrentSheet({...currentSheet, title: e.target.value})} 
              placeholder="Sheet Title (e.g. Ground Floor Woodwork)" 
              className="bg-zinc-100 border-none rounded-lg text-xs font-bold text-zinc-700 px-3 py-2 outline-none w-64"
            />
            <input 
              type="date" 
              value={currentSheet.date} 
              onChange={e => setCurrentSheet({...currentSheet, date: e.target.value})} 
              className="bg-zinc-100 border-none rounded-lg text-xs font-bold text-zinc-700 px-3 py-2 outline-none w-36"
            />
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <div className="px-4 py-2 bg-emerald-50 rounded-lg text-emerald-700 text-xs font-bold whitespace-nowrap">
              Total: {grandTotal.toFixed(2)}
            </div>
            <button onClick={handleSave} className="bg-zinc-900 hover:bg-black text-white px-6 py-2 rounded-lg text-xs font-bold shadow-md w-full md:w-auto">Save Sheet</button>
          </div>
        </div>

        {/* The Spreadsheet Grid */}
        <div className="bg-white border border-zinc-200 shadow-xl rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-zinc-100 border-b border-zinc-300 text-[10px] text-zinc-600 font-bold uppercase tracking-widest divide-x divide-zinc-200">
                <th className="w-10 text-center py-2">#</th>
                <th className="px-3 py-2 w-48">Location / Room</th>
                <th className="px-3 py-2 min-w-[200px]">Item Description</th>
                <th className="px-3 py-2 w-20">Unit</th>
                <th className="px-2 py-2 w-16 text-center">Nos</th>
                <th className="px-2 py-2 w-20 text-center">L</th>
                <th className="px-2 py-2 w-20 text-center">W</th>
                <th className="px-2 py-2 w-20 text-center">H</th>
                <th className="px-2 py-2 w-24 text-center">Ded (-)</th>
                <th className="px-3 py-2 w-24 text-right text-emerald-700">Total</th>
                <th className="px-3 py-2 w-48">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-sm">
              {currentSheet.data.map((row, idx) => (
                <tr key={idx} className="divide-x divide-zinc-100 hover:bg-zinc-50 focus-within:bg-zinc-50 group">
                  <td className="w-10 text-center text-[10px] font-bold text-zinc-400 bg-zinc-50 select-none group-focus-within:bg-blue-100">{idx + 1}</td>
                  <td><input type="text" value={row.location} onChange={e => handleCellChange(idx, 'location', e.target.value)} className={cellClass} /></td>
                  <td><input type="text" value={row.description} onChange={e => handleCellChange(idx, 'description', e.target.value)} className={cellClass} /></td>
                  <td>
                    <select value={row.unit} onChange={e => handleCellChange(idx, 'unit', e.target.value)} className={`${cellClass} appearance-none cursor-pointer text-zinc-500`}>
                      <option value="SqFt">SqFt</option><option value="Cft">Cft</option><option value="Rft">Rft</option><option value="Pcs">Pcs</option><option value="Sqm">Sqm</option>
                    </select>
                  </td>
                  <td><input type="number" step="any" value={row.nos} onChange={e => handleCellChange(idx, 'nos', e.target.value)} className={`${cellClass} text-center`} /></td>
                  <td><input type="number" step="any" value={row.l} onChange={e => handleCellChange(idx, 'l', e.target.value)} className={`${cellClass} text-center`} /></td>
                  <td><input type="number" step="any" value={row.w} onChange={e => handleCellChange(idx, 'w', e.target.value)} className={`${cellClass} text-center`} /></td>
                  <td><input type="number" step="any" value={row.h} onChange={e => handleCellChange(idx, 'h', e.target.value)} className={`${cellClass} text-center`} /></td>
                  <td><input type="number" step="any" value={row.deduction} onChange={e => handleCellChange(idx, 'deduction', e.target.value)} className={`${cellClass} text-center text-red-500`} /></td>
                  <td className="px-3 py-1.5 text-right font-bold text-emerald-600 bg-emerald-50/30 select-none">{parseFloat(row.total || 0).toFixed(2)}</td>
                  <td><input type="text" value={row.remarks} onChange={e => handleCellChange(idx, 'remarks', e.target.value)} className={cellClass} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={() => addRows(5)} className="w-full py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-500 text-xs font-bold uppercase tracking-widest transition-colors">
            + Add 5 More Rows
          </button>
        </div>
      </div>
    );
  }

  // --- MAIN DASHBOARD VIEW ---
  return (
    <div className="w-full font-['Poppins'] pb-12 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-4 border-b border-zinc-300/50 mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-800 tracking-tight">Joint Measurement Sheets</h2>
          <p className="text-zinc-500 text-xs mt-1 font-medium">Build, calculate, and store site measurement spreadsheets.</p>
        </div>
        <button onClick={openNewSheet} className="bg-zinc-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md">+ Create Blank Sheet</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-zinc-400 font-medium text-xs">Loading spreadsheets...</div>
        ) : sheets.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white/40 border border-dashed border-zinc-300 rounded-3xl">
            <span className="text-3xl block mb-2">📊</span>
            <h3 className="text-sm font-bold text-zinc-700">No Sheets Found</h3>
            <p className="text-xs text-zinc-500 mt-1 mb-4">Start by creating your first measurement sheet.</p>
            <button onClick={openNewSheet} className="text-xs font-bold text-blue-500 hover:underline">Create Sheet</button>
          </div>
        ) : (
          sheets.map(sheet => {
            const rowCount = sheet.data.length;
            const grandTotal = sheet.data.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0);
            
            return (
              <div key={sheet.id} className="bg-white/80 backdrop-blur-xl border border-zinc-200 shadow-md hover:shadow-lg transition-all rounded-3xl p-6 group">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-emerald-100 text-emerald-700 text-2xl p-3 rounded-2xl">📊</div>
                  <button onClick={() => handleDelete(sheet.id)} className="text-[10px] font-bold text-zinc-300 hover:text-red-500 uppercase tracking-widest transition-colors opacity-0 group-hover:opacity-100">Delete</button>
                </div>
                
                <h3 className="text-lg font-bold text-zinc-900 leading-tight mb-1 truncate">{sheet.title}</h3>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">{sheet.projectName}</p>
                
                <div className="space-y-2 mb-6 border-t border-zinc-100 pt-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Date Logged</span>
                    <span className="font-semibold text-zinc-700">{sheet.date}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Total Entries</span>
                    <span className="font-semibold text-zinc-700">{rowCount} Rows</span>
                  </div>
                  <div className="flex justify-between text-xs bg-zinc-50 p-2 rounded-lg mt-2">
                    <span className="text-zinc-500 font-bold uppercase tracking-widest text-[9px] mt-0.5">Calculated Total Area</span>
                    <span className="font-bold text-emerald-600">{grandTotal.toLocaleString('en-IN', {maximumFractionDigits: 2})}</span>
                  </div>
                </div>

                <button onClick={() => openExistingSheet(sheet)} className="w-full py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold rounded-xl transition-colors">
                  Open Spreadsheet &rarr;
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  );
}