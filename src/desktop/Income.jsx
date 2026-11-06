import React, { useState, useEffect } from 'react';
import * as db from '../db';
import { exportToCSV } from '../utils';

export default function Income({ companySettings = {} }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [projects, setProjects] = useState([]);
  const [income, setIncome] = useState([]);
  const [invoices, setInvoices] = useState([]);
  
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [projectFilter, setProjectFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // New Income Entry Form with Auto-Invoice Linkage
  const [newEntry, setNewEntry] = useState({
    date: currentDate.toISOString().split('T')[0],
    projectId: '',
    invoiceId: '',
    amount: '',
    paymentMode: 'NEFT/RTGS',
    referenceNo: '',
    notes: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [projData, incData, invData] = await Promise.all([
        db.getProjects ? db.getProjects() : Promise.resolve([]),
        db.getIncomeRecords ? db.getIncomeRecords() : Promise.resolve([]),
        db.getInvoices ? db.getInvoices() : Promise.resolve([])
      ]);
      setProjects((projData || []).filter(p => p.status !== 'Completed'));
      
      const sortedIncome = (incData || []).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      setIncome(sortedIncome);
      setInvoices((invData || []).filter(i => !i.isCancelled));
    } catch (e) {
      console.error("Error loading income ecosystem:", e);
      setProjects([]);
      setIncome([]);
      setInvoices([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- AUTOMATION 1: AUTO-POPULATE AMOUNT & DETAILS FROM OUTSTANDING TAX INVOICES ---
  const handleInvoiceSelect = (invId) => {
    if (!invId) {
      setNewEntry(prev => ({
        ...prev,
        invoiceId: '',
        amount: '',
        referenceNo: '',
        notes: ''
      }));
      return;
    }

    const selectedInv = invoices.find(i => String(i.id || i._id) === String(invId));
    if (selectedInv) {
      const rawTotal = typeof selectedInv.amount === 'string'
        ? parseFloat(selectedInv.amount.replace(/[^0-9.-]+/g, ''))
        : Number(selectedInv.amount) || 0;
      
      const currentAdvance = parseFloat(selectedInv.advanceReceived) || 0;
      const discount = parseFloat(selectedInv.discount) || 0;
      const balanceDue = Math.max(0, rawTotal - currentAdvance - discount);

      setNewEntry(prev => ({
        ...prev,
        invoiceId: selectedInv.id || selectedInv._id,
        projectId: selectedInv.projectId || prev.projectId,
        amount: balanceDue > 0 ? balanceDue : rawTotal,
        referenceNo: selectedInv.invoiceNo ? `INV-${selectedInv.invoiceNo}` : '',
        notes: `Settlement for Tax Invoice #${selectedInv.invoiceNo}`
      }));
    }
  };

  // --- AUTOMATION 2: RECORD INCOME + AUTO-SETTLE INVOICE BALANCE ---
  const handleAddIncome = async (e) => {
    if (e) e.preventDefault();
    if (!newEntry.date || !newEntry.amount || parseFloat(newEntry.amount) <= 0) {
      alert("Please enter a valid Date and Amount.");
      return;
    }

    setSubmitting(true);
    try {
      const selectedProj = projects.find(p => String(p.id || p._id) === String(newEntry.projectId));
      const amountReceived = parseFloat(newEntry.amount) || 0;

      const incomeRecord = {
        date: newEntry.date,
        projectId: newEntry.projectId ? (Number(newEntry.projectId) || newEntry.projectId) : '',
        projectName: selectedProj ? (selectedProj.name || selectedProj.projectName) : 'General Client Revenue',
        clientName: selectedProj ? selectedProj.clientName : (newEntry.notes || 'Client Payment'),
        amount: amountReceived,
        paymentMode: newEntry.paymentMode,
        referenceNo: newEntry.referenceNo || `REC-${Date.now().toString().slice(-4)}`,
        notes: newEntry.notes || 'Direct Bank Settlement'
      };

      // 1. Save to master income ledger
      if (typeof db.saveIncomeRecord === 'function') {
        await db.saveIncomeRecord(incomeRecord);
      } else {
        const stored = JSON.parse(localStorage.getItem('jyanipur_income') || '[]');
        stored.unshift({ id: Date.now(), ...incomeRecord });
        localStorage.setItem('jyanipur_income', JSON.stringify(stored));
      }

      // 2. Automated Invoice settlement balance deduction
      if (newEntry.invoiceId) {
        const targetInv = invoices.find(i => String(i.id || i._id) === String(newEntry.invoiceId));
        if (targetInv && typeof db.saveInvoice === 'function') {
          const invGross = typeof targetInv.amount === 'string'
            ? parseFloat(targetInv.amount.replace(/[^0-9.-]+/g, ''))
            : Number(targetInv.amount) || 0;
          
          const newAdvance = (parseFloat(targetInv.advanceReceived) || 0) + amountReceived;
          const isFullyPaid = newAdvance >= invGross;

          await db.saveInvoice({
            ...targetInv,
            advanceReceived: newAdvance,
            status: isFullyPaid ? 'Paid' : 'Pending'
          });
        }
      }

      await loadData();
      setNewEntry({
        date: currentDate.toISOString().split('T')[0],
        projectId: '',
        invoiceId: '',
        amount: '',
        paymentMode: 'NEFT/RTGS',
        referenceNo: '',
        notes: ''
      });
      alert(`Receipt of ₹${amountReceived.toLocaleString('en-IN')} logged successfully!`);
    } catch (err) {
      console.error("Error saving income record:", err);
      alert("Failed to save income record.");
    }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Permanently delete this payment receipt?")) {
      setLoading(true);
      try {
        if (typeof db.deleteIncomeRecord === 'function') {
          await db.deleteIncomeRecord(id);
        }
      } catch (err) {
        console.error("Deletion error:", err);
      } finally {
        await loadData();
      }
    }
  };

  const handleExport = () => {
    const exportData = filteredMonthlyIncome.map(inc => ({
      'Receipt Date': inc.date,
      'Project': inc.projectName,
      'Client': inc.clientName,
      'Payment Mode': inc.paymentMode,
      'Reference / UTR': inc.referenceNo || '-',
      'Notes': inc.notes || '-',
      'Amount (INR)': inc.amount
    }));
    exportToCSV(`Client_Receipts_${selectedMonth}_${selectedYear}`, exportData);
  };

  // Monthly & Project Calculations
  const filteredMonthlyIncome = income.filter(i => {
    if (!i.date) return false;
    const d = new Date(i.date);
    const inMonth = d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
    if (!inMonth) return false;

    const matchesProj = projectFilter === 'All' || String(i.projectId) === String(projectFilter);
    const matchesSearch = !searchQuery.trim() || (
      (i.projectName && i.projectName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (i.clientName && i.clientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (i.referenceNo && i.referenceNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (i.paymentMode && i.paymentMode.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return matchesProj && matchesSearch;
  });

  const totalMonthIncome = filteredMonthlyIncome.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
  const totalReceivedAllTime = income.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
  const totalActiveBudget = projects.reduce((sum, p) => sum + (parseFloat(p.budget) || 0), 0);
  const globalPendingReceivables = Math.max(0, totalActiveBudget - totalReceivedAllTime);

  // Unpaid invoices list for dropdown
  const pendingInvoices = invoices.filter(inv => inv.status !== 'Paid');

  const inputClass = "w-full px-3 py-2.5 rounded-lg border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 text-xs font-medium transition-all shadow-sm disabled:opacity-50 disabled:bg-zinc-50";

  return (
    <div className="w-full h-full flex flex-col font-['Inter',sans-serif]">
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center pb-6 mb-4 border-b border-zinc-200 shrink-0 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Client Inflow & Receipts</h2>
          <p className="text-zinc-500 text-sm mt-1 font-medium">Reconcile customer bank remittances, auto-clear tax invoices, and feed realized cash directly into Project P&L.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="flex items-center h-10 bg-white border border-zinc-200 rounded-lg px-3.5 shadow-sm w-full md:w-auto focus-within:ring-2 focus-within:ring-zinc-900 transition-all">
            <svg className="w-4 h-4 text-zinc-400 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              placeholder="Search project, client, UTR..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="bg-transparent border-none text-xs font-medium text-zinc-900 outline-none w-full md:w-52 placeholder:text-zinc-400" 
            />
          </div>

          {/* Month & Year Selectors */}
          <div className="flex items-center bg-white border border-zinc-200 rounded-lg shadow-sm h-10">
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(Number(e.target.value))} 
              className="bg-transparent border-none text-[10px] font-bold uppercase tracking-widest text-zinc-900 outline-none cursor-pointer px-3 py-2.5 appearance-none focus:ring-2 focus:ring-zinc-900 rounded-l-lg transition-all"
              style={{ backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2371717A' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundPosition: 'right 0.4rem center', backgroundRepeat: 'no-repeat', backgroundSize: '0.9rem', paddingRight: '1.6rem' }}
            >
              {Array.from({length: 12}, (_, i) => (
                <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('en-US', { month: 'short' })}</option>
              ))}
            </select>
            <div className="w-[1px] h-4 bg-zinc-200"></div>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(Number(e.target.value))} 
              className="bg-transparent border-none text-[10px] font-bold uppercase tracking-widest text-zinc-900 outline-none cursor-pointer px-3 py-2.5 appearance-none focus:ring-2 focus:ring-zinc-900 rounded-r-lg transition-all"
              style={{ backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2371717A' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundPosition: 'right 0.4rem center', backgroundRepeat: 'no-repeat', backgroundSize: '0.9rem', paddingRight: '1.6rem' }}
            >
              <option value={currentDate.getFullYear() - 1}>{currentDate.getFullYear() - 1}</option>
              <option value={currentDate.getFullYear()}>{currentDate.getFullYear()}</option>
              <option value={currentDate.getFullYear() + 1}>{currentDate.getFullYear() + 1}</option>
            </select>
          </div>

          {/* Project Filter */}
          <select 
            value={projectFilter} 
            onChange={(e) => setProjectFilter(e.target.value)} 
            className="h-10 bg-white border border-zinc-200 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-800 px-3 py-2 outline-none cursor-pointer shadow-sm"
          >
            <option value="All">All Projects</option>
            {projects.map(p => (
              <option key={p.id || p._id} value={p.id || p._id}>{p.name || p.projectName}</option>
            ))}
          </select>

          <button 
            onClick={handleExport}
            className="h-10 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 hover:text-zinc-900 px-4 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-2"
          >
            <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* SUMMARY KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-6 shrink-0">
        <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Total Active Budgets</span>
          <p className="text-2xl font-black text-zinc-900 tracking-tight">₹ {totalActiveBudget.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
        </div>
        <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-200 shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest block mb-2">Received (Selected Month)</span>
          <p className="text-2xl font-black text-emerald-800 tracking-tight">₹ {totalMonthIncome.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Lifetime Realized Inflow</span>
          <p className="text-2xl font-black text-zinc-900 tracking-tight">₹ {totalReceivedAllTime.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
        </div>
        <div className="bg-zinc-900 p-6 rounded-xl border border-black shadow-sm flex flex-col justify-center relative overflow-hidden">
          <svg className="absolute -right-4 -bottom-6 w-32 h-32 opacity-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2 relative z-10">Global Pending Receivables</span>
          <p className="text-2xl font-black text-white tracking-tight relative z-10">₹ {globalPendingReceivables.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
        </div>
      </div>

      {/* TABLE CONTAINER WITH INLINE RECEIPT ENTRY */}
      <div className="bg-white border border-zinc-200 rounded-xl shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="p-4 border-b border-zinc-100 bg-white flex justify-between items-center">
          <p className="text-[10px] text-zinc-900 font-bold uppercase tracking-widest">Client Payment Stream</p>
          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Select an invoice to auto-settle balances</span>
        </div>

        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1050px]">
            <thead>
              <tr className="bg-zinc-50 text-zinc-500 text-[10px] uppercase tracking-widest font-bold border-b border-zinc-200 sticky top-0 z-10">
                <th className="py-4 px-4 w-32">Date</th>
                <th className="py-4 px-4 min-w-[200px]">Project Site</th>
                <th className="py-4 px-4 w-48">Link Invoice (Auto-Settle)</th>
                <th className="py-4 px-4 w-36">Mode</th>
                <th className="py-4 px-4 w-36">Ref / UTR No</th>
                <th className="py-4 px-4 min-w-[160px]">Notes</th>
                <th className="py-4 px-4 text-right w-36">Amount Received</th>
                <th className="py-4 px-6 text-right w-24">Action</th>
              </tr>
            </thead>
            <tbody className="text-sm text-zinc-800 divide-y divide-zinc-100">
              
              {/* INLINE AUTO-FILL ENTRY ROW */}
              <tr className="bg-zinc-100/60 border-b border-zinc-200">
                <td className="py-3 px-3">
                  <input type="date" value={newEntry.date} onChange={e => setNewEntry({...newEntry, date: e.target.value})} className={inputClass} />
                </td>
                <td className="py-3 px-3">
                  <select 
                    value={newEntry.projectId} 
                    onChange={e => setNewEntry({...newEntry, projectId: e.target.value})} 
                    className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2318181B%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.6rem_center] bg-[length:0.9rem_0.9rem] pr-6 font-bold`}
                  >
                    <option value="">Select Project Site...</option>
                    {projects.map(p => (
                      <option key={p.id || p._id} value={p.id || p._id}>{p.name || p.projectName}</option>
                    ))}
                  </select>
                </td>
                <td className="py-3 px-3">
                  <select 
                    value={newEntry.invoiceId} 
                    onChange={e => handleInvoiceSelect(e.target.value)} 
                    className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2318181B%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.6rem_center] bg-[length:0.9rem_0.9rem] pr-6 font-bold text-zinc-700`}
                  >
                    <option value="">None (Advance / Milestone)</option>
                    {pendingInvoices.map(inv => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNo} — {inv.client || inv.partyName} ({inv.amount})
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-3 px-3">
                  <select 
                    value={newEntry.paymentMode} 
                    onChange={e => setNewEntry({...newEntry, paymentMode: e.target.value})} 
                    className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2318181B%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.6rem_center] bg-[length:0.9rem_0.9rem] pr-6 font-bold`}
                  >
                    <option value="NEFT/RTGS">NEFT / RTGS</option>
                    <option value="IMPS/UPI">IMPS / UPI</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                  </select>
                </td>
                <td className="py-3 px-3">
                  <input type="text" placeholder="UTR / Ref No." value={newEntry.referenceNo} onChange={e => setNewEntry({...newEntry, referenceNo: e.target.value})} className={`${inputClass} font-mono`} />
                </td>
                <td className="py-3 px-3">
                  <input type="text" placeholder="Milestone / Notes" value={newEntry.notes} onChange={e => setNewEntry({...newEntry, notes: e.target.value})} className={inputClass} />
                </td>
                <td className="py-3 px-3">
                  <input type="number" step="any" placeholder="₹ 0.00" value={newEntry.amount} onChange={e => setNewEntry({...newEntry, amount: e.target.value})} className={`${inputClass} text-right font-black text-emerald-800 placeholder:text-zinc-300 text-sm`} />
                </td>
                <td className="py-3 px-5 text-right">
                  <button 
                    onClick={handleAddIncome} 
                    disabled={submitting} 
                    className="px-4 py-2 bg-zinc-900 hover:bg-black text-white rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5 ml-auto disabled:opacity-50 border border-black"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    {submitting ? 'Adding...' : 'Add'}
                  </button>
                </td>
              </tr>

              {/* SAVED RECORDS */}
              {loading ? (
                <tr><td colSpan="8" className="py-16 text-center text-zinc-400 font-medium text-xs">Syncing client receipts from database...</td></tr>
              ) : filteredMonthlyIncome.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400 border border-zinc-200">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-zinc-500 font-medium text-xs">No client income records found for this period. Use the entry row above to log one.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMonthlyIncome.map(inc => (
                  <tr key={inc.id} className="hover:bg-zinc-50/70 transition-colors group">
                    <td className="py-4 px-4 text-xs font-bold uppercase tracking-widest text-zinc-500 font-mono">{inc.date}</td>
                    <td className="py-4 px-4">
                      <p className="font-bold text-zinc-900 tracking-tight">{inc.projectName}</p>
                      {inc.clientName && <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">{inc.clientName}</p>}
                    </td>
                    <td className="py-4 px-4">
                      {inc.referenceNo?.startsWith('INV-') ? (
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                          {inc.referenceNo}
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Direct Credit</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-xs text-zinc-700 font-bold">
                      <span className="bg-zinc-100 px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-widest border border-zinc-200">
                        {inc.paymentMode}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-zinc-600 font-mono text-xs font-medium">{inc.referenceNo || '-'}</td>
                    <td className="py-4 px-4 text-xs text-zinc-600 font-medium truncate max-w-[220px]">{inc.notes || '-'}</td>
                    <td className="py-4 px-4 text-right font-black text-sm text-emerald-800 bg-emerald-50/20">
                      ₹ {parseFloat(inc.amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button 
                        onClick={() => handleDelete(inc.id)} 
                        className="p-1.5 bg-white text-red-500 hover:bg-red-600 hover:text-white border border-red-200 rounded-lg transition-all cursor-pointer opacity-0 group-hover:opacity-100 shadow-sm" 
                        title="Delete Receipt"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}

              {/* MONTHLY SUMMARY FOOTER */}
              <tr className="font-bold text-zinc-900 border-t-2 border-zinc-900 bg-zinc-50 sticky bottom-0">
                <td colSpan="6" className="py-4 px-4 text-right text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  REALIZED INFLOW FOR THIS MONTH:
                </td>
                <td className="py-4 px-4 text-right text-base font-black text-emerald-800 bg-emerald-50/60">
                  ₹ {totalMonthIncome.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                </td>
                <td className="bg-zinc-50"></td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}