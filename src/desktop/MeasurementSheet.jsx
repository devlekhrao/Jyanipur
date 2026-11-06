import React, { useState, useEffect } from 'react';
import * as db from '../db';

// Safely evaluate standard math formulas (e.g., "=2*3.5+4")
const evaluateFormula = (expr) => {
  if (expr === null || expr === undefined || expr === '') return '';
  let str = expr.toString().trim();
  if (str.startsWith('=')) {
    try {
      const sanitized = str.substring(1).replace(/[^0-9+\-*/().]/g, '');
      if (!sanitized) return '';
      // eslint-disable-next-line no-new-func
      const result = new Function('return ' + sanitized)();
      return isNaN(result) ? '' : result;
    } catch (e) {
      return str; 
    }
  }
  return expr;
};

const getNumeric = (expr) => {
  const res = evaluateFormula(expr);
  return (res === '' || isNaN(res)) ? null : parseFloat(res);
};

export default function MeasurementSheet() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [projects, setProjects] = useState([]);
  const [sheets, setSheets] = useState([]);
  const [subcontractors, setSubcontractors] = useState([]);
  const [rateCards, setRateCards] = useState([]);
  
  // Spreadsheet Editor State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [focusedCell, setFocusedCell] = useState(null); 
  const [formulaBarValue, setFormulaBarValue] = useState('');
  
  const [currentSheet, setCurrentSheet] = useState({
    id: null,
    projectId: '',
    title: '',
    date: new Date().toISOString().split('T')[0],
    subcontractorId: '', // Optional linkage to trade agency
    data: []
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedProjects, fetchedSheets, fetchedSubs] = await Promise.all([
        db.getProjects ? db.getProjects() : Promise.resolve([]),
        db.getMeasurementSheets ? db.getMeasurementSheets() : Promise.resolve([]),
        db.getSubcontractors ? db.getSubcontractors() : Promise.resolve([])
      ]);

      const cachedRates = JSON.parse(localStorage.getItem('jyanipur_sub_rate_cards') || '[]');
      const cachedSheets = JSON.parse(localStorage.getItem('jyanipur_measurements') || '[]');

      const activeProjects = (fetchedProjects || []).filter(p => p.status !== 'Completed');
      const allSheets = [...(fetchedSheets || [])];
      
      cachedSheets.forEach(cs => {
        if (!allSheets.some(s => String(s.id || s._id) === String(cs.id || cs._id))) {
          allSheets.push(cs);
        }
      });

      setProjects(activeProjects);
      setSheets(allSheets);
      setSubcontractors(fetchedSubs || []);
      setRateCards(cachedRates);

    } catch (e) {
      console.error("Error loading measurement sheets:", e);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const createEmptyRow = () => ({
    isSubtotal: false, location: '', description: '', unit: 'Sq.Ft.', nos: '', l: '', w: '', h: '', deduction: '', totalQty: 0, rate: '', totalAmount: 0, remarks: ''
  });

  const createSubtotalRow = () => ({ isSubtotal: true, totalQty: 0, totalAmount: 0 });

  const openNewSheet = () => {
    setCurrentSheet({
      id: null,
      projectId: projects.length > 0 ? String(projects[0].id || projects[0]._id) : '',
      title: 'New Measurement Sheet',
      date: new Date().toISOString().split('T')[0],
      subcontractorId: '',
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
    
    // Auto-pull rate if item matches rate card for selected subcontractor
    if (field === 'description' && currentSheet.subcontractorId) {
      const match = rateCards.find(r => String(r.subId) === String(currentSheet.subcontractorId) && r.item === value);
      if (match) {
        newData[index]['rate'] = match.rate;
        newData[index]['unit'] = match.uom;
      }
    }

    // Auto-calculate row totals (Qty * Rate)
    if (['nos', 'l', 'w', 'h', 'deduction', 'rate'].includes(field)) {
      const row = newData[index];
      const nos = getNumeric(row.nos);
      const l = getNumeric(row.l);
      const w = getNumeric(row.w);
      const h = getNumeric(row.h);
      const ded = getNumeric(row.deduction) || 0;
      const rate = getNumeric(row.rate) || 0;

      if (nos === null && l === null && w === null && h === null && ded === 0) {
        row.totalQty = 0;
        row.totalAmount = 0;
      } else {
        let val = nos !== null ? nos : 1;
        if (l !== null) val *= l;
        if (w !== null) val *= w;
        if (h !== null) val *= h;
        row.totalQty = val - ded;
        row.totalAmount = row.totalQty * rate;
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

  // --- AUTOMATION: SAVE JMR & TRIGGER RA BILL ---
  const handleSave = async (generateRABill = false) => {
    if (!currentSheet.projectId || !currentSheet.title) return alert("Project Site and Sheet Title are required.");

    const cleanedData = currentSheet.data.filter(row => 
      row.isSubtotal || row.location || row.description || row.l || row.w || row.totalQty > 0
    );
    
    setSubmitting(true);
    try {
      const selectedProj = projects.find(p => String(p.id || p._id) === String(currentSheet.projectId));
      const selectedSub = subcontractors.find(s => String(s.id || s._id) === String(currentSheet.subcontractorId));
      
      const payload = {
        ...currentSheet,
        id: currentSheet.id || Date.now(),
        projectId: Number(currentSheet.projectId) || currentSheet.projectId,
        projectName: selectedProj ? (selectedProj.name || selectedProj.projectName) : 'General Site',
        subcontractorName: selectedSub ? selectedSub.name : '',
        data: cleanedData.length > 0 ? cleanedData : [createEmptyRow()]
      };

      if (typeof db.saveMeasurementSheet === 'function') {
        await db.saveMeasurementSheet(payload);
      } else {
        const cached = JSON.parse(localStorage.getItem('jyanipur_measurements') || '[]');
        const updated = [payload, ...cached.filter(s => String(s.id || s._id) !== String(payload.id))];
        localStorage.setItem('jyanipur_measurements', JSON.stringify(updated));
      }

      // Automatically generate certified RA Bill if requested and agency is selected
      if (generateRABill && currentSheet.subcontractorId) {
        const grandTotalAmt = payload.data.reduce((sum, row) => sum + (row.isSubtotal ? 0 : (parseFloat(row.totalAmount) || 0)), 0);
        
        if (grandTotalAmt > 0) {
          const woCache = JSON.parse(localStorage.getItem('jyanipur_sub_work_orders') || '[]');
          
          // Match to an existing Work Order or create a ghost RA ledger entry
          let targetWO = woCache.find(w => String(w.subcontractorId) === String(currentSheet.subcontractorId) && String(w.projectId) === String(currentSheet.projectId) && w.status !== 'Completed');
          
          if (targetWO) {
            targetWO.contractValue = (parseFloat(targetWO.contractValue) || 0) + grandTotalAmt;
            targetWO.scope = `${targetWO.scope} | Add: Verified ${payload.title}`;
          } else {
            targetWO = {
              id: Date.now(),
              subcontractorId: currentSheet.subcontractorId,
              subcontractorName: selectedSub.name,
              trade: selectedSub.trade || 'General',
              projectId: currentSheet.projectId,
              projectName: payload.projectName,
              scope: `Certified RA Bill via ${payload.title}`,
              contractValue: grandTotalAmt,
              retentionPercent: 5,
              totalPaid: 0,
              payments: [],
              status: 'Active',
              date: payload.date
            };
            woCache.unshift(targetWO);
          }
          localStorage.setItem('jyanipur_sub_work_orders', JSON.stringify(woCache));
          alert(`Sheet Saved & Certified! ₹${grandTotalAmt.toLocaleString('en-IN')} added to Subcontractor RA Bill Ledger.`);
        }
      } else {
        alert("Joint Measurement Sheet Saved!");
      }

      setIsEditorOpen(false);
      await loadData();
    } catch (err) { 
      console.error(err);
      alert("Failed to save measurement sheet."); 
    }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Permanently delete this measurement sheet?")) {
      setLoading(true);
      try {
        if (typeof db.deleteMeasurementSheet === 'function') {
          await db.deleteMeasurementSheet(id);
        } else {
          const cached = JSON.parse(localStorage.getItem('jyanipur_measurements') || '[]');
          const updated = cached.filter(s => String(s.id || s._id) !== String(id));
          localStorage.setItem('jyanipur_measurements', JSON.stringify(updated));
        }
        await loadData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const grandTotalQty = currentSheet.data.reduce((sum, row) => sum + (row.isSubtotal ? 0 : (parseFloat(row.totalQty) || 0)), 0);
  const grandTotalAmt = currentSheet.data.reduce((sum, row) => sum + (row.isSubtotal ? 0 : (parseFloat(row.totalAmount) || 0)), 0);

  // --- EXCEL EXPORT GENERATOR ---
  const exportToExcel = () => {
    let tableHtml = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><table border="1" style="font-family: Arial; font-size: 12px; border-collapse: collapse;">
      <thead>
        <tr><td colspan="12" style="font-size: 16px; font-weight: bold; padding: 10px;">JOINT MEASUREMENT RECORD (JMR) - ${currentSheet.title}</td></tr>
        <tr><td colspan="6" style="font-weight: bold;">Project: ${projects.find(p => String(p.id || p._id) === String(currentSheet.projectId))?.name || 'Site'}</td><td colspan="6" style="text-align: right; font-weight: bold;">Date: ${currentSheet.date}</td></tr>
        <tr style="background-color: #f4f4f5; font-weight: bold; text-align: center;">
          <th>#</th><th>Location / Room</th><th>Item / Scope Description</th><th>UOM</th><th>Nos</th><th>L</th><th>W</th><th>H</th><th>Ded (-)</th><th>Total Qty</th><th>Rate (Rs)</th><th>Total Amount (Rs)</th>
        </tr>
      </thead><tbody>`;
    
    let runQtySub = 0;
    let runAmtSub = 0;

    currentSheet.data.forEach((row, index) => {
      if (row.isSubtotal) {
        tableHtml += `<tr style="background-color: #f4f4f5; font-weight: bold;"><td>${index + 1}</td><td colspan="8" style="text-align: right; color: #18181b;">SUBTOTAL</td><td style="text-align: right; color: #18181b; background-color: #e4e4e7;">${runQtySub.toFixed(2)}</td><td></td><td style="text-align: right; color: #18181b; background-color: #e4e4e7;">${runAmtSub.toFixed(2)}</td></tr>`;
        runQtySub = 0;
        runAmtSub = 0;
      } else {
        const q = parseFloat(row.totalQty || 0);
        const a = parseFloat(row.totalAmount || 0);
        runQtySub += q;
        runAmtSub += a;
        tableHtml += `<tr><td style="text-align: center;">${index + 1}</td><td>${row.location || ''}</td><td>${row.description || ''}</td><td style="text-align: center;">${row.unit || ''}</td><td style="text-align: center;">${evaluateFormula(row.nos) || ''}</td><td style="text-align: center;">${evaluateFormula(row.l) || ''}</td><td style="text-align: center;">${evaluateFormula(row.w) || ''}</td><td style="text-align: center;">${evaluateFormula(row.h) || ''}</td><td style="text-align: center; color: red;">${evaluateFormula(row.deduction) || ''}</td><td style="text-align: right; font-weight: bold;">${q.toFixed(2)}</td><td style="text-align: right;">${parseFloat(row.rate || 0).toFixed(2)}</td><td style="text-align: right; font-weight: bold;">${a.toFixed(2)}</td></tr>`;
      }
    });
    
    tableHtml += `<tr style="background-color: #d1fae5; font-weight: bold; font-size: 14px;"><td colspan="9" style="text-align: right; color: #047857;">GRAND TOTAL</td><td style="text-align: right; color: #047857;">${grandTotalQty.toFixed(2)}</td><td></td><td style="text-align: right; color: #047857;">${grandTotalAmt.toFixed(2)}</td></tr></tbody></table></body></html>`;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `JMR_${currentSheet.title || 'Export'}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const inputClass = "w-full px-4 py-2.5 rounded-lg border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white text-zinc-900 text-sm font-medium transition-all shadow-sm";

  // --- SPREADSHEET EDITOR VIEW ---
  if (isEditorOpen) {
    const headerClass = "bg-zinc-50 text-zinc-500 font-bold uppercase tracking-widest text-[10px] border-b border-zinc-200 py-3 px-3 sticky top-0 z-20 text-left";
    const cellClass = "w-full h-full px-3 py-2.5 text-xs outline-none bg-transparent placeholder-zinc-300 font-medium text-zinc-900 transition-all";
    
    const getActiveCellClass = (rIdx, cName) => {
      const isFocused = focusedCell === `${rIdx}_${cName}`;
      return `border-b border-r border-zinc-100 p-0 relative bg-white transition-all ${isFocused ? 'ring-2 ring-inset ring-zinc-900 z-10 rounded-sm' : ''}`;
    };

    let currentQtySubtotal = 0;
    let currentAmtSubtotal = 0;
    
    return (
      <div className="w-full h-full flex flex-col print:hidden font-['Inter',sans-serif]">
        
        {/* Modern App Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 pb-4 mb-4 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">
              {currentSheet.id ? 'Edit Measurement Sheet' : 'Draft Joint Measurement (JMR)'}
            </h2>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">Excel-style Math Engine (L × W × H)</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsEditorOpen(false)} className="text-zinc-600 hover:text-zinc-900 text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer bg-zinc-100 hover:bg-zinc-200 px-4 py-2.5 rounded-lg border border-zinc-200 shadow-sm flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg> Back
            </button>
            <button onClick={exportToExcel} className="bg-white text-zinc-700 hover:text-zinc-900 hover:bg-zinc-50 border border-zinc-200 px-4 py-2.5 rounded-lg text-[10px] uppercase tracking-widest font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> Export .xls
            </button>
            
            {/* Auto-certify button for trade billing */}
            <button 
              onClick={() => handleSave(true)} 
              disabled={submitting || !currentSheet.subcontractorId} 
              className="bg-emerald-700 text-white hover:bg-emerald-800 px-4 py-2.5 rounded-lg text-[10px] uppercase tracking-widest font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50 border border-emerald-800"
              title="Save sheet and push value directly to Trade Contractor RA Bill ledger"
            >
              Certify RA Bill
            </button>

            <button onClick={() => handleSave(false)} disabled={submitting} className="bg-zinc-900 text-white hover:bg-black px-6 py-2.5 rounded-lg text-[10px] uppercase tracking-widest font-bold shadow-sm transition-all cursor-pointer disabled:opacity-75 border border-black">
              {submitting ? 'Saving...' : 'Save Draft'}
            </button>
          </div>
        </div>

        {/* Form Controls Toolbar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 shrink-0">
          <div>
            <select value={currentSheet.projectId} onChange={e => setCurrentSheet({...currentSheet, projectId: e.target.value})} className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2318181B%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10 bg-zinc-50 font-bold`}>
              <option value="" disabled>Select Project Site...</option>
              {projects.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name || p.projectName}</option>)}
            </select>
          </div>
          <div>
            <select value={currentSheet.subcontractorId} onChange={e => setCurrentSheet({...currentSheet, subcontractorId: e.target.value})} className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2318181B%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10 bg-zinc-50 font-bold`}>
              <option value="">No Agency (General Bill)</option>
              {subcontractors.map(s => <option key={s.id || s._id} value={s.id || s._id}>{s.name} ({s.trade})</option>)}
            </select>
          </div>
          <div>
            <input type="text" value={currentSheet.title} onChange={e => setCurrentSheet({...currentSheet, title: e.target.value})} placeholder="Sheet Title (e.g. Ground Floor Carpentry RA-1)" className={`${inputClass} bg-zinc-50 font-bold`} />
          </div>
          <div>
            <input type="date" value={currentSheet.date} onChange={e => setCurrentSheet({...currentSheet, date: e.target.value})} className={`${inputClass} bg-zinc-50 font-bold`} />
          </div>
        </div>

        {/* Modern Formula Bar */}
        <div className="flex items-center gap-3 px-4 py-2 bg-white border border-zinc-200 rounded-lg mb-4 shrink-0 shadow-sm">
          <div className="w-8 h-8 rounded-md bg-zinc-100 text-zinc-600 flex items-center justify-center font-serif font-bold italic select-none">
            fx
          </div>
          <div className="h-6 w-px bg-zinc-200"></div>
          <input 
            type="text" 
            value={formulaBarValue}
            onChange={handleFormulaBarChange}
            placeholder={focusedCell ? '' : "Select a cell to enter dimensions or math formulas (e.g., =2*3.5+4)"}
            className="flex-1 text-sm outline-none bg-transparent font-mono text-zinc-900 font-semibold" 
            disabled={!focusedCell}
          />
        </div>

        {/* THE MODERN DATA GRID */}
        <div className="bg-white border border-zinc-200 shadow-sm rounded-xl flex-1 flex flex-col min-h-0 overflow-hidden relative">
          <div className="flex-1 overflow-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <table className="w-full text-left border-collapse min-w-[1450px] table-fixed">
              <thead>
                <tr>
                  <th className={headerClass + " w-12 text-center border-r border-zinc-200"}>#</th>
                  <th className={headerClass + " w-48"}>Location / Room</th>
                  <th className={headerClass + " min-w-[250px]"}>Item Description (Pulls from Rate Card)</th>
                  <th className={headerClass + " w-24 text-center"}>Unit</th>
                  <th className={headerClass + " w-20 text-center"}>Nos</th>
                  <th className={headerClass + " w-20 text-center"}>Length</th>
                  <th className={headerClass + " w-20 text-center"}>Width</th>
                  <th className={headerClass + " w-20 text-center"}>Height</th>
                  <th className={headerClass + " w-20 text-center"}>Ded (-)</th>
                  <th className={headerClass + " w-24 text-right bg-zinc-100 text-zinc-900"}>Total Qty</th>
                  <th className={headerClass + " w-28 text-right bg-emerald-50 text-emerald-800"}>Unit Rate (₹)</th>
                  <th className={headerClass + " w-32 text-right bg-emerald-50 text-emerald-800 border-r border-zinc-200"}>Total Amount</th>
                  <th className={headerClass + " w-12"}></th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {currentSheet.data.map((row, idx) => {
                  if (row.isSubtotal) {
                    const displayQtyTotal = currentQtySubtotal;
                    const displayAmtTotal = currentAmtSubtotal;
                    currentQtySubtotal = 0; 
                    currentAmtSubtotal = 0;
                    return (
                      <tr key={idx} className="group bg-zinc-100/80 hover:bg-zinc-200/50 transition-colors border-y border-zinc-200">
                        <td className="text-center text-[10px] font-bold text-zinc-500 border-r border-zinc-200">{idx + 1}</td>
                        <td colSpan={8} className="px-4 py-3 text-right font-black text-zinc-900 text-[11px] uppercase tracking-widest border-r border-zinc-200">
                          Subtotal
                        </td>
                        <td className="px-4 py-3 text-right font-black text-zinc-900 border-r border-zinc-200 bg-zinc-200/50 text-sm">
                          {displayQtyTotal.toLocaleString('en-IN', {maximumFractionDigits: 2})}
                        </td>
                        <td className="border-r border-zinc-200"></td>
                        <td className="px-4 py-3 text-right font-black text-emerald-800 border-r border-zinc-200 bg-emerald-100/50 text-sm">
                          ₹{displayAmtTotal.toLocaleString('en-IN', {maximumFractionDigits: 2})}
                        </td>
                        <td className="text-center bg-zinc-50 border-zinc-200">
                          <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => insertRow(idx)} title="Insert Row Below" className="w-6 h-6 flex items-center justify-center bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded cursor-pointer font-bold text-sm shadow-sm">+</button>
                            <button onClick={() => removeRow(idx)} title="Delete Subtotal" className="w-6 h-6 flex items-center justify-center bg-white border border-red-200 text-red-500 hover:text-white hover:bg-red-500 rounded cursor-pointer font-bold text-sm shadow-sm">✕</button>
                          </div>
                        </td>
                      </tr>
                    );
                  } else {
                    currentQtySubtotal += parseFloat(row.totalQty || 0);
                    currentAmtSubtotal += parseFloat(row.totalAmount || 0);
                    
                    return (
                      <tr key={idx} className="group bg-white hover:bg-zinc-50/80 transition-colors">
                        <td className="text-center text-[10px] font-bold text-zinc-400 border-b border-r border-zinc-200 bg-zinc-50/50">{idx + 1}</td>
                        
                        <td className={getActiveCellClass(idx, 'location')}>
                          <input type="text" value={row.location} onChange={e => handleCellChange(idx, 'location', e.target.value)} onFocus={() => handleCellFocus(idx, 'location')} onBlur={() => setFocusedCell(null)} className={`${cellClass} font-bold`} placeholder="Room name" />
                        </td>
                        <td className={getActiveCellClass(idx, 'description')}>
                          {/* Pull Rate Card Items if Contractor is selected */}
                          {currentSheet.subcontractorId ? (
                            <>
                              <input type="text" list={`rate-list-${idx}`} value={row.description} onChange={e => handleCellChange(idx, 'description', e.target.value)} onFocus={() => handleCellFocus(idx, 'description')} onBlur={() => setFocusedCell(null)} className={cellClass} placeholder="Select / type item..." />
                              <datalist id={`rate-list-${idx}`}>
                                {rateCards.filter(r => String(r.subId) === String(currentSheet.subcontractorId)).map((r, r_idx) => (
                                  <option key={r_idx} value={r.item} />
                                ))}
                              </datalist>
                            </>
                          ) : (
                            <input type="text" value={row.description} onChange={e => handleCellChange(idx, 'description', e.target.value)} onFocus={() => handleCellFocus(idx, 'description')} onBlur={() => setFocusedCell(null)} className={cellClass} placeholder="Scope description" />
                          )}
                        </td>
                        <td className={getActiveCellClass(idx, 'unit')}>
                          <select value={row.unit} onChange={e => handleCellChange(idx, 'unit', e.target.value)} onFocus={() => handleCellFocus(idx, 'unit')} onBlur={() => setFocusedCell(null)} className={`${cellClass} appearance-none cursor-pointer text-center font-bold text-zinc-700`}>
                            <option value="Sq.Ft.">Sq.Ft.</option><option value="C.Ft.">C.Ft.</option><option value="R.Ft.">R.Ft.</option><option value="Nos">Nos</option><option value="Sqm">Sqm</option><option value="L.S.">Lump Sum</option>
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
                          <input type="text" value={focusedCell === `${idx}_deduction` ? row.deduction : evaluateFormula(row.deduction)} onChange={e => handleCellChange(idx, 'deduction', e.target.value)} onFocus={() => handleCellFocus(idx, 'deduction')} onBlur={() => setFocusedCell(null)} className={`${cellClass} text-center font-mono text-red-600 font-bold`} />
                        </td>
                        
                        {/* Calculated Results */}
                        <td className="border-b border-r border-zinc-100 p-0 bg-zinc-50/50">
                          <div className="w-full h-full px-4 py-2.5 text-xs text-right font-black text-zinc-900 border-none outline-none select-none flex items-center justify-end font-mono">
                            {parseFloat(row.totalQty || 0).toLocaleString('en-IN', {maximumFractionDigits: 2})}
                          </div>
                        </td>

                        <td className={getActiveCellClass(idx, 'rate')}>
                          <input type="text" value={focusedCell === `${idx}_rate` ? row.rate : evaluateFormula(row.rate)} onChange={e => handleCellChange(idx, 'rate', e.target.value)} onFocus={() => handleCellFocus(idx, 'rate')} onBlur={() => setFocusedCell(null)} className={`${cellClass} text-right font-mono font-bold text-emerald-800 bg-emerald-50/30`} placeholder="0.00" />
                        </td>

                        <td className="border-b border-r border-zinc-100 p-0 bg-emerald-50/50">
                          <div className="w-full h-full px-4 py-2.5 text-xs text-right font-black text-emerald-800 border-none outline-none select-none flex items-center justify-end font-mono">
                            ₹{parseFloat(row.totalAmount || 0).toLocaleString('en-IN', {maximumFractionDigits: 2})}
                          </div>
                        </td>
                        
                        {/* Actions */}
                        <td className="text-center bg-white border-b border-zinc-200 px-1">
                          <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => insertRow(idx)} title="Insert Row Below" className="w-6 h-6 flex items-center justify-center bg-zinc-100 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 rounded cursor-pointer font-bold text-sm">+</button>
                            <button onClick={() => insertSubtotal(idx)} title="Insert Subtotal Below" className="w-6 h-6 flex items-center justify-center bg-zinc-100 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 rounded cursor-pointer font-serif font-bold text-xs">∑</button>
                            <button onClick={() => removeRow(idx)} title="Delete Row" className="w-6 h-6 flex items-center justify-center bg-red-50 text-red-500 hover:text-white hover:bg-red-500 rounded cursor-pointer font-bold text-sm">✕</button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                })}
              </tbody>
            </table>
          </div>
          
          {/* Bottom Toolbar */}
          <div className="flex w-full shrink-0 border-t border-zinc-200 bg-zinc-50 h-[52px]">
            <button onClick={() => addRows(5)} className="flex-1 text-zinc-600 hover:bg-zinc-200 text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer flex items-center justify-center gap-2 border-r border-zinc-200 h-full">
              <span className="text-zinc-900 font-black text-sm leading-none">+</span> Add 5 Rows
            </button>
            <button onClick={() => insertSubtotal(currentSheet.data.length - 1)} className="flex-1 text-zinc-600 hover:bg-zinc-200 text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer flex items-center justify-center gap-2 border-r border-zinc-200 h-full">
              <span className="font-serif text-sm leading-none font-black text-zinc-900">∑</span> Add Subtotal
            </button>
            <div className="flex-[1.5] px-6 text-right text-xs font-bold text-emerald-800 bg-emerald-50 flex justify-end items-center gap-4 h-full border-l border-emerald-200">
              <span className="uppercase tracking-widest text-[10px] opacity-80">Certified Value</span>
              <span className="text-xl font-black font-mono">₹{grandTotalAmt.toLocaleString('en-IN', {maximumFractionDigits: 2})}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN DASHBOARD VIEW ---
  return (
    <div className="w-full h-full flex flex-col font-['Inter',sans-serif]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 mb-6 border-b border-zinc-200 shrink-0 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Joint Measurement Records (JMR)</h2>
          <p className="text-zinc-500 text-sm mt-1 font-medium">Build, calculate, and certify trade contractor site measurements for RA billing.</p>
        </div>
        <button onClick={openNewSheet} className="bg-zinc-900 hover:bg-black text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-2 border border-black">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          New Measurement Sheet
        </button>
      </div>

      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {loading ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-sm flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin"></div>
            <p>Syncing spreadsheets with database...</p>
          </div>
        ) : sheets.length === 0 ? (
          <div className="py-20 text-center bg-white border border-dashed border-zinc-300 rounded-2xl">
            <div className="w-12 h-12 bg-zinc-100 text-zinc-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-zinc-200">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <h3 className="text-base font-bold text-zinc-900 tracking-tight">No JMR Sheets Found</h3>
            <p className="text-sm text-zinc-500 mt-1 mb-5 font-medium">Start by creating your first joint measurement and RA bill sheet.</p>
            <button onClick={openNewSheet} className="text-xs font-bold text-zinc-900 uppercase tracking-widest border border-zinc-200 px-4 py-2 rounded-lg hover:bg-zinc-50 transition-colors cursor-pointer shadow-sm">
              Create Sheet
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-10">
            {sheets.map(sheet => {
              const rowCount = sheet.data ? sheet.data.length : 0;
              const gAmt = (sheet.data || []).reduce((sum, row) => sum + (row.isSubtotal ? 0 : (parseFloat(row.totalAmount) || 0)), 0);
              
              return (
                <div key={sheet.id || sheet._id} className="bg-white border border-zinc-200 shadow-sm hover:border-zinc-400 transition-all rounded-xl p-5 flex flex-col justify-between group relative">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform border border-emerald-200 shadow-sm">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <button onClick={() => handleDelete(sheet.id || sheet._id)} className="p-1.5 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-all cursor-pointer border border-transparent hover:border-red-200" title="Delete Sheet">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 leading-tight mb-1 truncate">{sheet.title}</h3>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 truncate">{sheet.projectName || 'General Site'}</p>
                    
                    <div className="space-y-2 mb-5 border-t border-zinc-100 pt-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500 font-bold uppercase tracking-widest text-[9px]">Created Date</span>
                        <span className="font-bold text-zinc-800 font-mono">{sheet.date}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500 font-bold uppercase tracking-widest text-[9px]">Trade Agency</span>
                        <span className="font-bold text-zinc-800 truncate max-w-[120px]">{sheet.subcontractorName || '-'}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs bg-emerald-50/50 p-3 rounded-lg mt-3 border border-emerald-100 shadow-inner">
                        <span className="text-emerald-700 font-bold uppercase tracking-widest text-[9px]">Certified Value</span>
                        <span className="font-black text-sm text-emerald-800 font-mono">₹{gAmt.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  <button onClick={() => openExistingSheet(sheet)} className="w-full py-2.5 bg-zinc-900 hover:bg-black text-white text-[10px] uppercase tracking-widest font-bold rounded-lg transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5 border border-black">
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