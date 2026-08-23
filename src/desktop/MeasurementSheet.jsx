import React, { useState, useEffect } from 'react';
import { getProjects, getMeasurementSheets, saveMeasurementSheet, deleteMeasurementSheet } from '../db';

export default function MeasurementSheet() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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
      console.error("Error loading measurement sheets from cloud DB:", e);
      setProjects([]);
      setSheets([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const createEmptyRow = () => ({
    isSubtotal: false, location: '', description: '', unit: 'SqFt', nos: '', l: '', w: '', h: '', deduction: '', total: 0, remarks: ''
  });

  const createSubtotalRow = () => ({
    isSubtotal: true, total: 0 
  });

  const openNewSheet = () => {
    setCurrentSheet({
      id: null,
      projectId: projects.length > 0 ? (projects[0].id || projects[0]._id) : '',
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

  const addRows = (count = 5) => {
    const newRows = Array.from({ length: count }, () => createEmptyRow());
    setCurrentSheet(prev => ({ ...prev, data: [...prev.data, ...newRows] }));
  };

  const insertRow = (index) => {
    const newData = [...currentSheet.data];
    newData.splice(index + 1, 0, createEmptyRow());
    setCurrentSheet(prev => ({ ...prev, data: newData }));
  };

  const insertSubtotal = (index) => {
    const newData = [...currentSheet.data];
    newData.splice(index + 1, 0, createSubtotalRow());
    setCurrentSheet(prev => ({ ...prev, data: newData }));
  };

  const removeRow = (index) => {
    const newData = [...currentSheet.data];
    newData.splice(index, 1);
    if (newData.length === 0) newData.push(createEmptyRow());
    setCurrentSheet(prev => ({ ...prev, data: newData }));
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
      row.isSubtotal || row.location || row.description || row.l || row.w || row.total > 0
    );
    
    setSubmitting(true);
    try {
      const selectedProj = projects.find(p => String(p.id || p._id) === String(currentSheet.projectId));
      const payload = {
        ...currentSheet,
        projectId: currentSheet.projectId ? (Number(currentSheet.projectId) || currentSheet.projectId) : '',
        projectName: selectedProj ? (selectedProj.name || selectedProj.projectName) : 'General Site',
        data: cleanedData
      };

      await saveMeasurementSheet(payload);
      setIsEditorOpen(false);
      await loadData();
    } catch (err) {
      alert("Failed to save measurement sheet to cloud DB.");
    }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this sheet permanently?")) {
      setLoading(true);
      await deleteMeasurementSheet(id);
      await loadData();
    }
  };

  const grandTotal = currentSheet.data.reduce((sum, row) => sum + (row.isSubtotal ? 0 : (parseFloat(row.total) || 0)), 0);

  // --- EXPORT TO EXCEL ---
  const exportToExcel = () => {
    let tableHtml = `
      <html xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head><meta charset="utf-8"></head>
        <body>
          <table border="1" style="font-family: Arial, sans-serif; font-size: 12px; border-collapse: collapse;">
            <thead>
              <tr><td colspan="11" style="font-size: 16px; font-weight: bold; padding: 10px;">${currentSheet.title}</td></tr>
              <tr style="background-color: #f3f4f6; font-weight: bold; text-align: center;">
                <th>#</th>
                <th>Location / Room</th>
                <th>Item Description</th>
                <th>Unit</th>
                <th>Nos</th>
                <th>L</th>
                <th>W</th>
                <th>H</th>
                <th>Ded (-)</th>
                <th>Total</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    let runSub = 0;
    currentSheet.data.forEach((row, index) => {
      if (row.isSubtotal) {
        tableHtml += `
          <tr style="background-color: #fffbeb; font-weight: bold;">
            <td>${index + 1}</td>
            <td colspan="8" style="text-align: right; color: #92400e;">SUBTOTAL</td>
            <td style="text-align: right; color: #92400e; background-color: #fef3c7;">${runSub.toFixed(2)}</td>
            <td></td>
          </tr>
        `;
        runSub = 0;
      } else {
        runSub += parseFloat(row.total || 0);
        tableHtml += `
          <tr>
            <td style="text-align: center;">${index + 1}</td>
            <td>${row.location || ''}</td>
            <td>${row.description || ''}</td>
            <td style="text-align: center;">${row.unit || ''}</td>
            <td style="text-align: center;">${row.nos || ''}</td>
            <td style="text-align: center;">${row.l || ''}</td>
            <td style="text-align: center;">${row.w || ''}</td>
            <td style="text-align: center;">${row.h || ''}</td>
            <td style="text-align: center; color: red;">${row.deduction || ''}</td>
            <td style="text-align: right; font-weight: bold;">${parseFloat(row.total || 0).toFixed(2)}</td>
            <td>${row.remarks || ''}</td>
          </tr>
        `;
      }
    });
    
    tableHtml += `
            <tr style="background-color: #d1fae5; font-weight: bold; font-size: 14px;">
              <td colspan="9" style="text-align: right; color: #065f46;">GRAND TOTAL</td>
              <td style="text-align: right; color: #065f46;">${grandTotal.toFixed(2)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
    `;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Measurement_${currentSheet.title || 'Export'}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const inputClass = "w-full px-4 py-2 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-inset focus:ring-[#B45309] text-zinc-900 text-sm font-medium transition-all shadow-sm";

  // --- SPREADSHEET EDITOR VIEW ---
  if (isEditorOpen) {
    const cellClass = "w-full h-full bg-transparent outline-none focus:bg-blue-50/30 focus:ring-2 focus:ring-blue-500 focus:relative focus:z-10 px-2.5 py-2 text-[11px] text-zinc-900 font-medium transition-all block";
    const headerClass = "bg-zinc-100 text-zinc-600 font-bold uppercase tracking-wider text-[10px] border border-zinc-300 py-2 px-3 sticky top-0 z-20 shadow-sm text-center";
    let currentSubtotal = 0;
    
    return (
      <div className="w-full h-full flex flex-col" style={{ fontFamily: 'Poppins, sans-serif' }}>
        {/* Editor Toolbar */}
        <div className="bg-white border border-zinc-200 shadow-sm rounded-2xl p-4 mb-4 shrink-0 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="flex-1 w-full flex flex-col md:flex-row gap-3 items-center">
            <button onClick={() => setIsEditorOpen(false)} className="text-zinc-600 hover:text-zinc-900 font-semibold text-xs transition-colors cursor-pointer bg-white px-3 py-2 rounded-xl border border-zinc-200 flex items-center gap-1.5 shadow-sm">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back
            </button>
            <div className="h-4 w-px bg-zinc-200 hidden md:block"></div>
            
            <button onClick={exportToExcel} className="text-emerald-700 hover:bg-emerald-50 font-bold text-[11px] uppercase tracking-wider transition-colors cursor-pointer bg-white px-3 py-2 rounded-xl border border-emerald-200 flex items-center gap-1.5 shadow-sm">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
              Export .xls
            </button>

            <select 
              value={currentSheet.projectId} 
              onChange={e => setCurrentSheet({...currentSheet, projectId: e.target.value})}
              className={`${inputClass} !w-full md:!w-56 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.8rem_center] bg-[length:1rem_1rem] pr-8`}
            >
              <option value="" disabled>Select Project Site</option>
              {projects.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name || p.projectName}</option>)}
            </select>
            <input 
              type="text" 
              value={currentSheet.title} 
              onChange={e => setCurrentSheet({...currentSheet, title: e.target.value})} 
              placeholder="Sheet Title (e.g. Ground Floor Woodwork)" 
              className={`${inputClass} flex-1`}
            />
            <input 
              type="date" 
              value={currentSheet.date} 
              onChange={e => setCurrentSheet({...currentSheet, date: e.target.value})} 
              className={`${inputClass} !w-full md:!w-40`}
            />
          </div>
          <div className="flex gap-3 w-full md:w-auto items-center">
            <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-bold whitespace-nowrap">
              Total Quantity: {grandTotal.toLocaleString('en-IN', {maximumFractionDigits: 2})}
            </div>
            <button onClick={handleSave} disabled={submitting} className="bg-[#B45309] hover:bg-[#92400E] text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm cursor-pointer transition-all w-full md:w-auto disabled:opacity-50">
              {submitting ? 'Saving...' : 'Save Sheet'}
            </button>
          </div>
        </div>

        {/* The Spreadsheet Grid Container */}
        <div className="bg-white border border-zinc-300 shadow-lg flex-1 flex flex-col min-h-0 overflow-hidden relative">
          <div className="flex-1 overflow-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead>
                <tr>
                  <th className={headerClass + " w-12"}>#</th>
                  <th className={headerClass + " w-48 text-left"}>Location / Room</th>
                  <th className={headerClass + " min-w-[200px] text-left"}>Item Description</th>
                  <th className={headerClass + " w-24"}>Unit</th>
                  <th className={headerClass + " w-16"}>Nos</th>
                  <th className={headerClass + " w-20"}>L</th>
                  <th className={headerClass + " w-20"}>W</th>
                  <th className={headerClass + " w-20"}>H</th>
                  <th className={headerClass + " w-20"}>Ded (-)</th>
                  <th className={headerClass + " w-28 text-right !text-emerald-700"}>Total</th>
                  <th className={headerClass + " w-48 text-left"}>Remarks</th>
                  <th className={headerClass + " w-24 bg-white"}></th> {/* Actions column */}
                </tr>
              </thead>
              <tbody className="bg-white">
                {currentSheet.data.map((row, idx) => {
                  if (row.isSubtotal) {
                    const displayTotal = currentSubtotal;
                    currentSubtotal = 0; // Reset for next group
                    return (
                      <tr key={idx} className="group bg-[#fffbeb] hover:bg-amber-100/50 transition-colors">
                        <td className="text-center text-[10px] font-bold text-zinc-400 bg-zinc-100 border border-zinc-300 select-none cursor-row-resize">{idx + 1}</td>
                        <td colSpan={8} className="px-3 py-2 text-right font-black text-[#92400e] uppercase tracking-widest text-[11px] border border-zinc-300">
                          Subtotal
                        </td>
                        <td className="px-3 py-2 text-right font-black text-[#92400e] bg-amber-100/60 border border-zinc-300">
                          {displayTotal.toLocaleString('en-IN', {maximumFractionDigits: 2})}
                        </td>
                        <td className="border border-zinc-300 bg-zinc-50/50"></td>
                        <td className="w-24 text-center bg-white px-1 border-b border-r border-zinc-300">
                          <div className="flex justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => insertRow(idx)} title="Insert Row Below" className="w-5 h-5 flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-100 rounded cursor-pointer font-bold text-xs">+</button>
                            <button onClick={() => removeRow(idx)} title="Delete Subtotal" className="w-5 h-5 flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 rounded cursor-pointer font-bold text-xs">✕</button>
                          </div>
                        </td>
                      </tr>
                    );
                  } else {
                    currentSubtotal += parseFloat(row.total || 0);
                    return (
                      <tr key={idx} className="group hover:bg-zinc-50/80 transition-colors">
                        <td className="text-center text-[10px] font-bold text-zinc-400 bg-zinc-100 border border-zinc-300 select-none cursor-row-resize">{idx + 1}</td>
                        <td className="border border-zinc-300 p-0"><input type="text" value={row.location} onChange={e => handleCellChange(idx, 'location', e.target.value)} className={cellClass} /></td>
                        <td className="border border-zinc-300 p-0"><input type="text" value={row.description} onChange={e => handleCellChange(idx, 'description', e.target.value)} className={cellClass} /></td>
                        <td className="border border-zinc-300 p-0">
                          <select value={row.unit} onChange={e => handleCellChange(idx, 'unit', e.target.value)} className={`${cellClass} appearance-none cursor-pointer text-center`}>
                            <option value="SqFt">SqFt</option><option value="Cft">Cft</option><option value="Rft">Rft</option><option value="Pcs">Pcs</option><option value="Sqm">Sqm</option>
                          </select>
                        </td>
                        <td className="border border-zinc-300 p-0"><input type="number" step="any" value={row.nos} onChange={e => handleCellChange(idx, 'nos', e.target.value)} className={`${cellClass} text-center`} /></td>
                        <td className="border border-zinc-300 p-0"><input type="number" step="any" value={row.l} onChange={e => handleCellChange(idx, 'l', e.target.value)} className={`${cellClass} text-center`} /></td>
                        <td className="border border-zinc-300 p-0"><input type="number" step="any" value={row.w} onChange={e => handleCellChange(idx, 'w', e.target.value)} className={`${cellClass} text-center`} /></td>
                        <td className="border border-zinc-300 p-0"><input type="number" step="any" value={row.h} onChange={e => handleCellChange(idx, 'h', e.target.value)} className={`${cellClass} text-center`} /></td>
                        <td className="border border-zinc-300 p-0"><input type="number" step="any" value={row.deduction} onChange={e => handleCellChange(idx, 'deduction', e.target.value)} className={`${cellClass} text-center text-red-500 font-bold`} /></td>
                        <td className="border border-zinc-300 p-0 bg-zinc-50/50">
                          <div className="w-full h-full px-3 py-2 text-[11px] text-right font-bold text-emerald-700 border-none outline-none">
                            {parseFloat(row.total || 0).toLocaleString('en-IN', {maximumFractionDigits: 2})}
                          </div>
                        </td>
                        <td className="border border-zinc-300 p-0"><input type="text" value={row.remarks} onChange={e => handleCellChange(idx, 'remarks', e.target.value)} className={cellClass} /></td>
                        
                        {/* Hover Action Menu */}
                        <td className="w-24 text-center bg-white px-1 border-b border-r border-zinc-300">
                          <div className="flex justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => insertRow(idx)} title="Insert Row Below" className="w-5 h-5 flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-100 rounded cursor-pointer font-bold text-xs">+</button>
                            <button onClick={() => insertSubtotal(idx)} title="Insert Subtotal Below" className="w-5 h-5 flex items-center justify-center bg-amber-50 text-amber-600 hover:bg-amber-100 rounded cursor-pointer font-serif font-bold text-[10px]">∑</button>
                            <button onClick={() => removeRow(idx)} title="Delete Row" className="w-5 h-5 flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 rounded cursor-pointer font-bold text-xs">✕</button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                })}
              </tbody>
            </table>
          </div>
          
          {/* Bottom Table Toolbar */}
          <div className="flex w-full shrink-0 border-t border-zinc-300 bg-zinc-50">
            <button onClick={() => addRows(5)} className="flex-1 py-2.5 text-zinc-600 hover:bg-zinc-100 text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer flex items-center justify-center gap-1.5 border-r border-zinc-300">
              <span className="text-blue-500 text-sm leading-none">+</span> Add 5 Normal Rows
            </button>
            <button onClick={() => insertSubtotal(currentSheet.data.length - 1)} className="flex-1 py-2.5 text-[#B45309] hover:bg-amber-50 text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer flex items-center justify-center gap-1.5">
              <span className="font-serif text-sm leading-none font-black">∑</span> Add Subtotal Row
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN DASHBOARD VIEW ---
  return (
    <div className="w-full h-full flex flex-col" style={{ fontFamily: 'Poppins, sans-serif' }}>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 mb-6 border-b border-zinc-200 shrink-0 gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Joint Measurement Sheets</h2>
          <p className="text-zinc-500 text-sm mt-0.5 font-medium">Build, calculate, and store site measurement spreadsheets.</p>
        </div>
        <button 
          onClick={openNewSheet} 
          className="bg-[#B45309] hover:bg-[#92400E] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer flex items-center gap-1.5 h-10"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Create Blank Sheet
        </button>
      </div>

      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {loading ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-sm flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-4 border-zinc-200 border-t-[#B45309] rounded-full animate-spin"></div>
            <p>Syncing spreadsheets with cloud DB...</p>
          </div>
        ) : sheets.length === 0 ? (
          <div className="py-20 text-center bg-white border border-dashed border-zinc-200 rounded-2xl">
            <div className="w-12 h-12 bg-amber-50 text-[#B45309] rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl">
              📊
            </div>
            <h3 className="text-base font-bold text-zinc-900">No Sheets Found</h3>
            <p className="text-sm text-zinc-500 mt-1 mb-4 font-medium">Start by creating your first measurement sheet.</p>
            <button onClick={openNewSheet} className="text-sm font-semibold text-[#B45309] hover:underline cursor-pointer">
              Create Sheet
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sheets.map(sheet => {
              const rowCount = sheet.data ? sheet.data.length : 0;
              const grandTotal = (sheet.data || []).reduce((sum, row) => sum + (row.isSubtotal ? 0 : (parseFloat(row.total) || 0)), 0);
              
              return (
                <div key={sheet.id} className="bg-white border border-zinc-200/80 shadow-sm hover:shadow-md transition-all rounded-2xl p-5 flex flex-col justify-between group relative">
                  <div className="flex justify-between items-start mb-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#B45309] flex items-center justify-center text-xl">
                      📊
                    </div>
                    <button 
                      onClick={() => handleDelete(sheet.id)} 
                      className="p-1 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title="Delete Sheet"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  
                  <div>
                    <h3 className="text-base font-bold text-zinc-900 leading-tight mb-0.5 truncate">{sheet.title}</h3>
                    <p className="text-xs font-semibold text-[#B45309] uppercase tracking-wider mb-4">{sheet.projectName || 'General Site'}</p>
                    
                    <div className="space-y-2 mb-5 border-t border-zinc-100 pt-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500 font-medium">Date Logged</span>
                        <span className="font-semibold text-zinc-800">{sheet.date}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500 font-medium">Total Entries</span>
                        <span className="font-semibold text-zinc-800">{rowCount} Rows</span>
                      </div>
                      <div className="flex justify-between items-center text-xs bg-zinc-50 p-2.5 rounded-xl mt-2 border border-zinc-100">
                        <span className="text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">Total Quantity</span>
                        <span className="font-bold text-sm text-emerald-600">{grandTotal.toLocaleString('en-IN', {maximumFractionDigits: 2})}</span>
                      </div>
                    </div>
                  </div>

                  <button onClick={() => openExistingSheet(sheet)} className="w-full py-2.5 bg-[#B45309] hover:bg-[#92400E] text-white text-xs font-medium rounded-xl transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5">
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