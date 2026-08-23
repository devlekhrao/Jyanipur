import React, { useState, useEffect } from 'react';
import { getProjects, getMeasurementSheets, saveMeasurementSheet, deleteMeasurementSheet } from '../db';

// Helper to safely evaluate math formulas (e.g., "=2*3.5+4")
const evaluateFormula = (expr) => {
  if (expr === null || expr === undefined || expr === '') return '';
  let str = expr.toString().trim();
  if (str.startsWith('=')) {
    try {
      // Strip everything except numbers and basic math operators for safety
      const sanitized = str.substring(1).replace(/[^0-9+\-*/().]/g, '');
      if (!sanitized) return '';
      // eslint-disable-next-line no-new-func
      const result = new Function('return ' + sanitized)();
      return isNaN(result) ? '' : result;
    } catch (e) {
      return str; // Return raw string if formula is invalid
    }
  }
  return expr;
};

// Helper to get pure numeric value for totals
const getNumeric = (expr) => {
  const res = evaluateFormula(expr);
  return (res === '' || isNaN(res)) ? null : parseFloat(res);
};

export default function MeasurementSheet() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [projects, setProjects] = useState([]);
  const [sheets, setSheets] = useState([]);
  
  // Spreadsheet Editor State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [focusedCell, setFocusedCell] = useState(null); // format: "rowIndex_columnName"
  const [formulaBarValue, setFormulaBarValue] = useState('');
  
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
      console.error("Error loading measurement sheets:", e);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const createEmptyRow = () => ({
    isSubtotal: false, location: '', description: '', unit: 'SqFt', nos: '', l: '', w: '', h: '', deduction: '', total: 0, remarks: ''
  });

  const createSubtotalRow = () => ({ isSubtotal: true, total: 0 });

  const openNewSheet = () => {
    setCurrentSheet({
      id: null,
      projectId: projects.length > 0 ? (projects[0].id || projects[0]._id) : '',
      title: 'New Measurement Sheet',
      date: new Date().toISOString().split('T')[0],
      data: Array.from({ length: 20 }, () => createEmptyRow())
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
    
    // Auto-calculate row total
    if (['nos', 'l', 'w', 'h', 'deduction'].includes(field)) {
      const row = newData[index];
      const nos = getNumeric(row.nos);
      const l = getNumeric(row.l);
      const w = getNumeric(row.w);
      const h = getNumeric(row.h);
      const ded = getNumeric(row.deduction) || 0;

      if (nos === null && l === null && w === null && h === null && ded === 0) {
        row.total = 0;
      } else {
        let val = nos !== null ? nos : 1;
        if (l !== null) val *= l;
        if (w !== null) val *= w;
        if (h !== null) val *= h;
        row.total = val - ded;
      }
    }
    
    setCurrentSheet(prev => ({ ...prev, data: newData }));
    setFormulaBarValue(value);
  };

  const handleFormulaBarChange = (e) => {
    const val = e.target.value;
    setFormulaBarValue(val);
    if (focusedCell) {
      const [r, c] = focusedCell.split('_');
      handleCellChange(parseInt(r), c, val);
    }
  };

  const handleCellFocus = (index, field) => {
    setFocusedCell(`${index}_${field}`);
    setFormulaBarValue(currentSheet.data[index][field] || '');
  };

  const handleSave = async () => {
    if (!currentSheet.projectId || !currentSheet.title) return alert("Project and Title are required.");

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
        data: cleanedData.length > 0 ? cleanedData : [createEmptyRow()]
      };

      await saveMeasurementSheet(payload);
      setIsEditorOpen(false);
      await loadData();
    } catch (err) { alert("Failed to save measurement sheet to cloud DB."); }
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
    let tableHtml = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><table border="1" style="font-family: Arial; font-size: 12px; border-collapse: collapse;"><thead><tr><td colspan="11" style="font-size: 16px; font-weight: bold; padding: 10px;">${currentSheet.title}</td></tr><tr style="background-color: #f3f4f6; font-weight: bold; text-align: center;"><th>#</th><th>Location / Room</th><th>Item Description</th><th>Unit</th><th>Nos</th><th>L</th><th>W</th><th>H</th><th>Ded (-)</th><th>Total</th><th>Remarks</th></tr></thead><tbody>`;
    
    let runSub = 0;
    currentSheet.data.forEach((row, index) => {
      if (row.isSubtotal) {
        tableHtml += `<tr style="background-color: #fffbeb; font-weight: bold;"><td>${index + 1}</td><td colspan="8" style="text-align: right; color: #92400e;">SUBTOTAL</td><td style="text-align: right; color: #92400e; background-color: #fef3c7;">${runSub.toFixed(2)}</td><td></td></tr>`;
        runSub = 0;
      } else {
        runSub += parseFloat(row.total || 0);
        tableHtml += `<tr><td style="text-align: center;">${index + 1}</td><td>${row.location || ''}</td><td>${row.description || ''}</td><td style="text-align: center;">${row.unit || ''}</td><td style="text-align: center;">${evaluateFormula(row.nos) || ''}</td><td style="text-align: center;">${evaluateFormula(row.l) || ''}</td><td style="text-align: center;">${evaluateFormula(row.w) || ''}</td><td style="text-align: center;">${evaluateFormula(row.h) || ''}</td><td style="text-align: center; color: red;">${evaluateFormula(row.deduction) || ''}</td><td style="text-align: right; font-weight: bold;">${parseFloat(row.total || 0).toFixed(2)}</td><td>${row.remarks || ''}</td></tr>`;
      }
    });
    
    tableHtml += `<tr style="background-color: #d1fae5; font-weight: bold; font-size: 14px;"><td colspan="9" style="text-align: right; color: #065f46;">GRAND TOTAL</td><td style="text-align: right; color: #065f46;">${grandTotal.toFixed(2)}</td><td></td></tr></tbody></table></body></html>`;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Measurement_${currentSheet.title || 'Export'}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- SPREADSHEET EDITOR VIEW ---
  if (isEditorOpen) {
    const headerClass = "bg-[#f3f2f1] text-zinc-600 font-medium text-[11px] border-b border-r border-[#c0c0c0] py-1 px-2 sticky top-0 z-20 text-center select-none";
    const cellClass = "w-full h-full px-2 py-1.5 text-xs outline-none bg-transparent placeholder-zinc-300 font-sans";
    
    const getActiveCellClass = (rIdx, cName) => {
      const isFocused = focusedCell === `${rIdx}_${cName}`;
      return `border-b border-r border-[#d4d4d4] p-0 relative bg-white ${isFocused ? 'ring-2 ring-[#217346] z-10' : ''}`;
    };

    let currentSubtotal = 0;
    
    return (
      <div className="w-full h-full flex flex-col bg-white overflow-hidden" style={{ fontFamily: 'Segoe UI, Tahoma, sans-serif' }}>
        
        {/* TOP TITLE BAR (Excel Style) */}
        <div className="bg-[#217346] text-white px-4 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsEditorOpen(false)} className="text-white hover:text-green-200 cursor-pointer flex items-center gap-1 text-sm font-semibold">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              Back
            </button>
            <div className="h-4 w-px bg-white/30"></div>
            <input 
              type="text" 
              value={currentSheet.title} 
              onChange={e => setCurrentSheet({...currentSheet, title: e.target.value})} 
              placeholder="Book1 - Measurement Sheet" 
              className="bg-transparent border-none text-sm font-semibold text-white outline-none placeholder-white/60 w-64"
            />
          </div>
          <div className="flex gap-2 items-center">
            <button onClick={exportToExcel} className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Export .xls
            </button>
            <button onClick={handleSave} disabled={submitting} className="bg-white text-[#217346] hover:bg-zinc-100 px-4 py-1 rounded text-xs font-bold cursor-pointer transition-colors shadow-sm disabled:opacity-80">
              {submitting ? 'Saving...' : 'Save File'}
            </button>
          </div>
        </div>

        {/* FAKE EXCEL RIBBON & SETTINGS */}
        <div className="bg-[#f3f2f1] border-b border-[#c0c0c0] px-4 py-2 flex items-center gap-6 shrink-0">
          <select 
            value={currentSheet.projectId} 
            onChange={e => setCurrentSheet({...currentSheet, projectId: e.target.value})}
            className="text-xs bg-white border border-[#c0c0c0] rounded px-2 py-1 outline-none focus:border-[#217346] w-48"
          >
            <option value="" disabled>Select Project Site...</option>
            {projects.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name || p.projectName}</option>)}
          </select>
          <input 
            type="date" 
            value={currentSheet.date} 
            onChange={e => setCurrentSheet({...currentSheet, date: e.target.value})} 
            className="text-xs bg-white border border-[#c0c0c0] rounded px-2 py-1 outline-none focus:border-[#217346]"
          />
          <div className="h-4 w-px bg-zinc-300"></div>
          <span className="text-xs text-zinc-600">Total Qty: <strong className="text-[#217346]">{grandTotal.toLocaleString('en-IN', {maximumFractionDigits: 2})}</strong></span>
        </div>

        {/* FORMULA BAR */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border-b border-[#c0c0c0] shrink-0 shadow-sm z-10">
          <span className="text-zinc-400 font-serif italic font-bold select-none pl-1">fx</span>
          <input 
            type="text" 
            value={formulaBarValue}
            onChange={handleFormulaBarChange}
            placeholder={focusedCell ? '' : "Select a cell to enter formulas (e.g. =2*3+4)"}
            className="flex-1 text-sm outline-none border border-[#c0c0c0] px-3 py-1 bg-white focus:border-[#217346] font-mono text-zinc-800" 
            disabled={!focusedCell}
          />
        </div>

        {/* THE EXCEL GRID */}
        <div className="flex-1 overflow-auto bg-[#e6e6e6] relative">
          <table className="w-full text-left border-collapse min-w-[1300px] table-fixed bg-white">
            <thead>
              <tr>
                <th className={headerClass + " w-10 border-l-0"}></th> {/* Top-Left Corner */}
                <th className={headerClass + " w-48"}>A <br/><span className="text-[9px] font-normal text-zinc-400">Location</span></th>
                <th className={headerClass + " min-w-[250px]"}>B <br/><span className="text-[9px] font-normal text-zinc-400">Item Description</span></th>
                <th className={headerClass + " w-20"}>C <br/><span className="text-[9px] font-normal text-zinc-400">Unit</span></th>
                <th className={headerClass + " w-16"}>D <br/><span className="text-[9px] font-normal text-zinc-400">Nos</span></th>
                <th className={headerClass + " w-20"}>E <br/><span className="text-[9px] font-normal text-zinc-400">Length</span></th>
                <th className={headerClass + " w-20"}>F <br/><span className="text-[9px] font-normal text-zinc-400">Width</span></th>
                <th className={headerClass + " w-20"}>G <br/><span className="text-[9px] font-normal text-zinc-400">Height</span></th>
                <th className={headerClass + " w-20"}>H <br/><span className="text-[9px] font-normal text-zinc-400">Ded(-)</span></th>
                <th className={headerClass + " w-28"}>I <br/><span className="text-[9px] font-normal text-zinc-400">Total</span></th>
                <th className={headerClass + " w-48"}>J <br/><span className="text-[9px] font-normal text-zinc-400">Remarks</span></th>
                <th className={headerClass + " w-20"}></th> {/* Action Column */}
              </tr>
            </thead>
            <tbody>
              {currentSheet.data.map((row, idx) => {
                if (row.isSubtotal) {
                  const displayTotal = currentSubtotal;
                  currentSubtotal = 0; 
                  return (
                    <tr key={idx} className="group hover:bg-[#f1f8f4] transition-colors">
                      <td className="text-center text-[11px] font-semibold text-zinc-600 bg-[#f3f2f1] border-b border-r border-[#c0c0c0] select-none">{idx + 1}</td>
                      <td colSpan={8} className="px-3 py-1.5 text-right font-bold text-zinc-800 text-[11px] border-b border-r border-[#d4d4d4] bg-[#f9fafb]">
                        SUBTOTAL
                      </td>
                      <td className="px-3 py-1.5 text-right font-bold text-[#217346] border-b border-r border-[#d4d4d4] bg-[#f0fdf4] text-xs">
                        {displayTotal.toLocaleString('en-IN', {maximumFractionDigits: 2})}
                      </td>
                      <td className="border-b border-r border-[#d4d4d4] bg-[#f9fafb]"></td>
                      <td className="text-center bg-white border-b border-r border-[#d4d4d4]">
                        <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => insertRow(idx)} className="w-5 h-5 flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-100 rounded cursor-pointer font-bold text-xs">+</button>
                          <button onClick={() => removeRow(idx)} className="w-5 h-5 flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 rounded cursor-pointer font-bold text-xs">✕</button>
                        </div>
                      </td>
                    </tr>
                  );
                } else {
                  currentSubtotal += parseFloat(row.total || 0);
                  return (
                    <tr key={idx} className="group bg-white">
                      {/* Row Header (Number) */}
                      <td className="text-center text-[11px] font-semibold text-zinc-600 bg-[#f3f2f1] border-b border-r border-[#c0c0c0] select-none">{idx + 1}</td>
                      
                      <td className={getActiveCellClass(idx, 'location')}>
                        <input type="text" value={row.location} onChange={e => handleCellChange(idx, 'location', e.target.value)} onFocus={() => handleCellFocus(idx, 'location')} onBlur={() => setFocusedCell(null)} className={cellClass} />
                      </td>
                      <td className={getActiveCellClass(idx, 'description')}>
                        <input type="text" value={row.description} onChange={e => handleCellChange(idx, 'description', e.target.value)} onFocus={() => handleCellFocus(idx, 'description')} onBlur={() => setFocusedCell(null)} className={cellClass} />
                      </td>
                      <td className={getActiveCellClass(idx, 'unit')}>
                        <select value={row.unit} onChange={e => handleCellChange(idx, 'unit', e.target.value)} onFocus={() => handleCellFocus(idx, 'unit')} onBlur={() => setFocusedCell(null)} className={`${cellClass} appearance-none cursor-pointer text-center`}>
                          <option value="SqFt">SqFt</option><option value="Cft">Cft</option><option value="Rft">Rft</option><option value="Pcs">Pcs</option><option value="Sqm">Sqm</option>
                        </select>
                      </td>
                      
                      {/* FORMULA SUPPORTED COLUMNS */}
                      <td className={getActiveCellClass(idx, 'nos')}>
                        <input type="text" value={focusedCell === `${idx}_nos` ? row.nos : evaluateFormula(row.nos)} onChange={e => handleCellChange(idx, 'nos', e.target.value)} onFocus={() => handleCellFocus(idx, 'nos')} onBlur={() => setFocusedCell(null)} className={`${cellClass} text-center font-mono`} />
                      </td>
                      <td className={getActiveCellClass(idx, 'l')}>
                        <input type="text" value={focusedCell === `${idx}_l` ? row.l : evaluateFormula(row.l)} onChange={e => handleCellChange(idx, 'l', e.target.value)} onFocus={() => handleCellFocus(idx, 'l')} onBlur={() => setFocusedCell(null)} className={`${cellClass} text-center font-mono`} />
                      </td>
                      <td className={getActiveCellClass(idx, 'w')}>
                        <input type="text" value={focusedCell === `${idx}_w` ? row.w : evaluateFormula(row.w)} onChange={e => handleCellChange(idx, 'w', e.target.value)} onFocus={() => handleCellFocus(idx, 'w')} onBlur={() => setFocusedCell(null)} className={`${cellClass} text-center font-mono`} />
                      </td>
                      <td className={getActiveCellClass(idx, 'h')}>
                        <input type="text" value={focusedCell === `${idx}_h` ? row.h : evaluateFormula(row.h)} onChange={e => handleCellChange(idx, 'h', e.target.value)} onFocus={() => handleCellFocus(idx, 'h')} onBlur={() => setFocusedCell(null)} className={`${cellClass} text-center font-mono`} />
                      </td>
                      <td className={getActiveCellClass(idx, 'deduction')}>
                        <input type="text" value={focusedCell === `${idx}_deduction` ? row.deduction : evaluateFormula(row.deduction)} onChange={e => handleCellChange(idx, 'deduction', e.target.value)} onFocus={() => handleCellFocus(idx, 'deduction')} onBlur={() => setFocusedCell(null)} className={`${cellClass} text-center font-mono text-red-500`} />
                      </td>
                      
                      {/* Total Result */}
                      <td className="border-b border-r border-[#d4d4d4] p-0 bg-[#f9fafb]">
                        <div className="w-full h-full px-2 py-1.5 text-xs text-right font-bold text-zinc-900 border-none outline-none select-none">
                          {parseFloat(row.total || 0).toLocaleString('en-IN', {maximumFractionDigits: 2})}
                        </div>
                      </td>
                      <td className={getActiveCellClass(idx, 'remarks')}>
                        <input type="text" value={row.remarks} onChange={e => handleCellChange(idx, 'remarks', e.target.value)} onFocus={() => handleCellFocus(idx, 'remarks')} onBlur={() => setFocusedCell(null)} className={cellClass} />
                      </td>
                      
                      {/* Actions */}
                      <td className="text-center bg-white border-b border-r border-[#d4d4d4] px-1">
                        <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
        
        {/* EXCEL STATUS BAR (Bottom) */}
        <div className="flex w-full shrink-0 bg-[#f3f2f1] border-t border-[#c0c0c0] px-4 py-1 items-center justify-between text-[10px] text-zinc-600 font-medium">
          <div className="flex gap-4 items-center">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Ready</span>
            <button onClick={() => addRows(5)} className="hover:bg-zinc-200 px-2 py-0.5 rounded cursor-pointer transition-colors">
              + Add 5 Rows
            </button>
            <button onClick={() => insertSubtotal(currentSheet.data.length - 1)} className="hover:bg-zinc-200 px-2 py-0.5 rounded cursor-pointer transition-colors font-serif font-bold">
              ∑ Add Subtotal
            </button>
          </div>
          <div className="flex gap-4">
            <span>Rows: {currentSheet.data.length}</span>
            <span>Sum: <strong className="text-[#217346]">{grandTotal.toLocaleString('en-IN', {maximumFractionDigits: 2})}</strong></span>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN DASHBOARD VIEW ---
  return (
    <div className="w-full h-full flex flex-col" style={{ fontFamily: 'Poppins, sans-serif' }}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 mb-6 border-b border-zinc-200 shrink-0 gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Joint Measurement Sheets</h2>
          <p className="text-zinc-500 text-sm mt-0.5 font-medium">Build, calculate, and store site measurement spreadsheets.</p>
        </div>
        <button onClick={openNewSheet} className="bg-[#217346] hover:bg-[#1e6b40] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer flex items-center gap-1.5 h-10">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          New Spreadsheet
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
            <div className="w-12 h-12 bg-green-50 text-[#217346] rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl">
              📊
            </div>
            <h3 className="text-base font-bold text-zinc-900">No Sheets Found</h3>
            <p className="text-sm text-zinc-500 mt-1 mb-4 font-medium">Start by creating your first Excel-style measurement sheet.</p>
            <button onClick={openNewSheet} className="text-sm font-semibold text-[#217346] hover:underline cursor-pointer">
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
                    <div className="w-10 h-10 rounded-xl bg-green-50 text-[#217346] flex items-center justify-center text-xl">
                      📊
                    </div>
                    <button onClick={() => handleDelete(sheet.id)} className="p-1 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" title="Delete Sheet">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  
                  <div>
                    <h3 className="text-base font-bold text-zinc-900 leading-tight mb-0.5 truncate">{sheet.title}</h3>
                    <p className="text-xs font-semibold text-[#217346] uppercase tracking-wider mb-4">{sheet.projectName || 'General Site'}</p>
                    
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
                        <span className="font-bold text-sm text-[#217346]">{grandTotal.toLocaleString('en-IN', {maximumFractionDigits: 2})}</span>
                      </div>
                    </div>
                  </div>

                  <button onClick={() => openExistingSheet(sheet)} className="w-full py-2.5 bg-[#217346] hover:bg-[#1e6b40] text-white text-xs font-medium rounded-xl transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5">
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