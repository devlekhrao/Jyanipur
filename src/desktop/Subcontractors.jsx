import React, { useState, useEffect } from 'react';
import * as db from '../db';
import { exportToCSV } from '../utils';

export default function Subcontractors({ companySettings = {} }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('DIRECTORY'); 
  // Tabs: DIRECTORY, LEDGERS, RECONCILIATION, HEADCOUNT, RATES, PERFORMANCE
  
  // Database States
  const [projects, setProjects] = useState([]);
  const [subcontractors, setSubcontractors] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [snagsList, setSnagsList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Local Module States (Persistent via LocalStorage cache)
  const [debitNotes, setDebitNotes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('jyanipur_sub_debit_notes') || '[]');
    } catch {
      return [];
    }
  });

  const [labourLogs, setLabourLogs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('jyanipur_sub_labour_logs') || '[]');
    } catch {
      return [];
    }
  });

  const [rateCards, setRateCards] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('jyanipur_sub_rate_cards') || '[]');
    } catch {
      return [];
    }
  });

  // Ledger / View States
  const [expandedRows, setExpandedRows] = useState([]);
  const [selectedSubId, setSelectedSubId] = useState('');

  // Modals
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [isWoModalOpen, setIsWoModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);

  // Forms
  const [subForm, setSubForm] = useState({ name: '', trade: 'Carpenter', phone: '', gstin: '', pan: '', city: 'Hyderabad' });
  const [woForm, setWoForm] = useState({ 
    subcontractorId: '', 
    projectId: '', 
    scope: '', 
    contractValue: '', 
    retentionPercent: 5,
    startDate: new Date().toISOString().split('T')[0],
    completionDate: ''
  });
  const [payForm, setPayForm] = useState({ 
    workOrderId: '', 
    date: new Date().toISOString().split('T')[0], 
    amount: '', 
    mode: 'Bank Transfer', 
    referenceNo: '', 
    notes: '',
    tdsDeducted: 0
  });
  
  // Tab-specific Forms
  const [dnForm, setDnForm] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    projectId: '', 
    item: '', 
    qty: '', 
    rate: '', 
    reason: 'Material Issued from Godown' 
  });
  const [labourForm, setLabourForm] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    projectId: '', 
    skilled: '', 
    unskilled: '', 
    notes: '' 
  });
  const [rateForm, setRateForm] = useState({ item: '', uom: 'Sq.Ft.', rate: '', notes: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedProj, fetchedSubs, fetchedWos, fetchedInv, fetchedSnags] = await Promise.all([
        db.getProjects ? db.getProjects() : Promise.resolve([]),
        db.getSubcontractors ? db.getSubcontractors() : Promise.resolve([]),
        db.getSubcontractorWorkOrders ? db.getSubcontractorWorkOrders() : (db.getWorkOrders ? db.getWorkOrders() : Promise.resolve([])),
        db.getInventoryItems ? db.getInventoryItems() : Promise.resolve([]),
        db.getSnags ? db.getSnags() : Promise.resolve([])
      ]);

      const activeProjects = (fetchedProj || []).filter(p => p.status !== 'Completed');
      const subs = fetchedSubs || [];
      const wos = fetchedWos || [];

      setProjects(activeProjects);
      setSubcontractors(subs);
      setWorkOrders(wos);
      setInventoryItems(fetchedInv || []);
      setSnagsList(fetchedSnags || []);

      if (subs.length > 0 && !selectedSubId) {
        setSelectedSubId(String(subs[0].id || subs[0]._id));
      }
    } catch (e) {
      console.error("Error loading subcontractor operations:", e);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // Sync auxiliary tables to localStorage
  useEffect(() => {
    localStorage.setItem('jyanipur_sub_debit_notes', JSON.stringify(debitNotes));
  }, [debitNotes]);

  useEffect(() => {
    localStorage.setItem('jyanipur_sub_labour_logs', JSON.stringify(labourLogs));
  }, [labourLogs]);

  useEffect(() => {
    localStorage.setItem('jyanipur_sub_rate_cards', JSON.stringify(rateCards));
  }, [rateCards]);

  // --- CORE DATABASE ACTIONS ---
  const handleSaveSub = async (e) => {
    e.preventDefault();
    if (!subForm.name.trim()) return alert("Agency / Contractor Name is required.");
    setSubmitting(true);
    try {
      if (typeof db.saveSubcontractor === 'function') {
        await db.saveSubcontractor(subForm);
      } else {
        const cached = JSON.parse(localStorage.getItem('jyanipur_subcontractors') || '[]');
        cached.unshift({ id: Date.now(), ...subForm });
        localStorage.setItem('jyanipur_subcontractors', JSON.stringify(cached));
      }
      setIsSubModalOpen(false);
      setSubForm({ name: '', trade: 'Carpenter', phone: '', gstin: '', pan: '', city: 'Hyderabad' });
      await loadData();
      alert("Subcontractor registered successfully!");
    } catch (err) { 
      alert("Failed to save subcontractor agency."); 
    }
    setSubmitting(false);
  };

  const handleSaveWo = async (e) => {
    e.preventDefault();
    const val = parseFloat(woForm.contractValue);
    if (!woForm.subcontractorId || !woForm.projectId || !val || val <= 0) {
      return alert("Select Subcontractor, Project, and enter a valid Contract Value.");
    }

    setSubmitting(true);
    try {
      const selectedProj = projects.find(p => String(p.id || p._id) === String(woForm.projectId));
      const selectedSub = subcontractors.find(s => String(s.id || s._id) === String(woForm.subcontractorId));

      const payload = {
        ...woForm,
        subcontractorId: Number(woForm.subcontractorId) || woForm.subcontractorId,
        subcontractorName: selectedSub ? selectedSub.name : 'Trade Contractor',
        projectId: Number(woForm.projectId) || woForm.projectId,
        projectName: selectedProj ? (selectedProj.name || selectedProj.projectName) : 'Project Site',
        contractValue: val,
        retentionPercent: parseFloat(woForm.retentionPercent) || 5,
        totalPaid: 0,
        status: 'Active',
        date: woForm.startDate || new Date().toISOString().split('T')[0]
      };

      if (typeof db.saveSubcontractorWorkOrder === 'function') {
        await db.saveSubcontractorWorkOrder(payload);
      } else if (typeof db.saveWorkOrder === 'function') {
        await db.saveWorkOrder(payload);
      } else {
        const cached = JSON.parse(localStorage.getItem('jyanipur_sub_work_orders') || '[]');
        cached.unshift({ id: Date.now(), payments: [], ...payload });
        localStorage.setItem('jyanipur_sub_work_orders', JSON.stringify(cached));
      }

      setIsWoModalOpen(false);
      setWoForm({ subcontractorId: '', projectId: '', scope: '', contractValue: '', retentionPercent: 5, startDate: new Date().toISOString().split('T')[0], completionDate: '' });
      await loadData();
      alert("Trade Work Order contract awarded successfully!");
    } catch (err) { 
      alert("Failed to assign work order contract."); 
    }
    setSubmitting(false);
  };

  const handleSavePay = async (e) => {
    e.preventDefault();
    const payAmt = parseFloat(payForm.amount);
    if (!payForm.workOrderId || !payAmt || payAmt <= 0) {
      return alert("Valid Work Order and Payment Amount required.");
    }

    setSubmitting(true);
    try {
      const payload = {
        ...payForm,
        workOrderId: Number(payForm.workOrderId) || payForm.workOrderId,
        amount: payAmt,
        tdsDeducted: parseFloat(payForm.tdsDeducted) || 0
      };

      if (typeof db.saveSubWoPayment === 'function') {
        await db.saveSubWoPayment(payload);
      } else {
        // Fallback update
        const updatedWOs = workOrders.map(wo => {
          if (String(wo.id || wo._id) === String(payload.workOrderId)) {
            const currentPaid = parseFloat(wo.totalPaid) || 0;
            const existingPayments = wo.payments || [];
            return {
              ...wo,
              totalPaid: currentPaid + payAmt,
              payments: [{ id: Date.now(), ...payload }, ...existingPayments]
            };
          }
          return wo;
        });
        setWorkOrders(updatedWOs);
        localStorage.setItem('jyanipur_sub_work_orders', JSON.stringify(updatedWOs));
      }

      setIsPayModalOpen(false);
      setPayForm({ workOrderId: '', date: new Date().toISOString().split('T')[0], amount: '', mode: 'Bank Transfer', referenceNo: '', notes: '', tdsDeducted: 0 });
      await loadData();
      alert(`Payment voucher of ₹${payAmt.toLocaleString('en-IN')} logged! Work Order balance reconciled.`);
    } catch (err) { 
      alert("Failed to record subcontractor payment."); 
    }
    setSubmitting(false);
  };

  const handleStatusChange = async (id, status) => {
    try {
      if (typeof db.updateSubcontractorWorkOrderStatus === 'function') {
        await db.updateSubcontractorWorkOrderStatus(id, status);
      } else {
        const updated = workOrders.map(w => String(w.id || w._id) === String(id) ? { ...w, status } : w);
        setWorkOrders(updated);
        localStorage.setItem('jyanipur_sub_work_orders', JSON.stringify(updated));
      }
      await loadData();
    } catch (err) { 
      console.error("Failed to update status:", err); 
    }
  };

  // --- RECONCILIATION & TAB ACTIONS ---
  const handleSaveDN = (e) => {
    e.preventDefault();
    if (!selectedSubId || !dnForm.projectId || !dnForm.item || !parseFloat(dnForm.qty)) {
      return alert("Select Subcontractor, Project, Material, and Quantity.");
    }
    const qty = parseFloat(dnForm.qty) || 0;
    const rate = parseFloat(dnForm.rate) || 0;
    const totalDeduction = qty * rate;

    const newNote = {
      ...dnForm,
      id: Date.now(),
      subId: selectedSubId,
      qty,
      rate,
      totalAmount: totalDeduction,
      deducted: false
    };

    setDebitNotes([newNote, ...debitNotes]);
    setDnForm({ date: new Date().toISOString().split('T')[0], projectId: '', item: '', qty: '', rate: '', reason: 'Material Issued from Godown' });
    alert(`Debit Note for ₹${totalDeduction.toLocaleString('en-IN')} issued to agency!`);
  };

  const handleToggleDebitDeduction = (dnId) => {
    setDebitNotes(debitNotes.map(d => d.id === dnId ? { ...d, deducted: !d.deducted } : d));
  };

  const handleSaveLabour = (e) => {
    e.preventDefault();
    if (!selectedSubId || !labourForm.projectId) return alert("Select Subcontractor and Project Site.");
    const skilled = parseInt(labourForm.skilled) || 0;
    const unskilled = parseInt(labourForm.unskilled) || 0;

    const newLog = {
      ...labourForm,
      id: Date.now(),
      subId: selectedSubId,
      skilled,
      unskilled,
      totalWorkers: skilled + unskilled
    };

    setLabourLogs([newLog, ...labourLogs]);
    setLabourForm({ date: new Date().toISOString().split('T')[0], projectId: '', skilled: '', unskilled: '', notes: '' });
    alert("Daily worker headcount logged to muster roll!");
  };

  const handleSaveRate = (e) => {
    e.preventDefault();
    if (!selectedSubId || !rateForm.item || !parseFloat(rateForm.rate)) {
      return alert("Enter item description and negotiated unit rate.");
    }
    const newRate = {
      ...rateForm,
      id: Date.now(),
      subId: selectedSubId,
      rate: parseFloat(rateForm.rate)
    };

    setRateCards([newRate, ...rateCards]);
    setRateForm({ item: '', uom: 'Sq.Ft.', rate: '', notes: '' });
  };

  const toggleRow = (id) => setExpandedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  const openPayModal = (woId) => { 
    setPayForm(prev => ({ ...prev, workOrderId: woId })); 
    setIsPayModalOpen(true); 
  };

  // --- FINANCIAL COMPUTATIONS ---
  const getSubStats = (subId) => {
    const subWOs = workOrders.filter(w => String(w.subcontractorId) === String(subId));
    const totalContractValue = subWOs.reduce((sum, w) => sum + (parseFloat(w.contractValue) || 0), 0);
    const totalPaid = subWOs.reduce((sum, w) => sum + (parseFloat(w.totalPaid) || 0), 0);
    
    // Retention calculation
    const retentionHeld = subWOs.reduce((sum, w) => {
      const pct = parseFloat(w.retentionPercent) || 5;
      return sum + ((parseFloat(w.contractValue) || 0) * (pct / 100));
    }, 0);

    // Debit notes
    const agencyDebits = debitNotes.filter(d => String(d.subId) === String(subId));
    const totalDebits = agencyDebits.reduce((sum, d) => sum + (parseFloat(d.totalAmount) || 0), 0);
    const recoveredDebits = agencyDebits.filter(d => d.deducted).reduce((sum, d) => sum + (parseFloat(d.totalAmount) || 0), 0);

    const netPayable = Math.max(0, totalContractValue - retentionHeld - totalPaid - recoveredDebits);

    return {
      totalWOs: subWOs.length,
      totalContractValue,
      totalPaid,
      retentionHeld,
      totalDebits,
      recoveredDebits,
      netPayable
    };
  };

  // Exporters
  const handleExportDirectory = () => {
    const data = subcontractors.map(s => {
      const stats = getSubStats(s.id || s._id);
      return {
        'Agency Name': s.name,
        'Trade': s.trade,
        'Phone': s.phone || '-',
        'City': s.city || 'Hyderabad',
        'Active Contracts': stats.totalWOs,
        'Contract Value (INR)': stats.totalContractValue,
        'Total Paid (INR)': stats.totalPaid,
        '5% Retention Held (INR)': stats.retentionHeld,
        'Debit Notes (INR)': stats.totalDebits,
        'Net Balance Due (INR)': stats.netPayable
      };
    });
    exportToCSV('Subcontractors_Master_Directory', data);
  };

  const handleExportMusterRoll = () => {
    const data = labourLogs.map(l => {
      const sub = subcontractors.find(s => String(s.id || s._id) === String(l.subId));
      const proj = projects.find(p => String(p.id || p._id) === String(l.projectId));
      return {
        'Date': l.date,
        'Subcontractor': sub ? sub.name : 'Unknown Agency',
        'Trade': sub ? sub.trade : '-',
        'Project Site': proj ? (proj.name || proj.projectName) : 'Site',
        'Skilled Workers': l.skilled,
        'Unskilled Helpers': l.unskilled,
        'Total Force': l.totalWorkers || (l.skilled + l.unskilled),
        'Notes': l.notes || '-'
      };
    });
    exportToCSV('Trade_Labour_Muster_Roll', data);
  };

  const inputClass = "w-full px-4 py-3 rounded-lg border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 text-xs font-medium transition-all shadow-sm disabled:opacity-75 disabled:cursor-not-allowed";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-0.5";

  const totalPortfolioValue = workOrders.reduce((sum, w) => sum + (parseFloat(w.contractValue) || 0), 0);
  const totalPaidAllTime = workOrders.reduce((sum, w) => sum + (parseFloat(w.totalPaid) || 0), 0);
  const totalRetentionHeld = workOrders.reduce((sum, w) => sum + ((parseFloat(w.contractValue) || 0) * ((parseFloat(w.retentionPercent) || 5) / 100)), 0);

  return (
    <div className="w-full h-full flex flex-col font-['Inter',sans-serif]">
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center pb-6 mb-4 border-b border-zinc-200 shrink-0 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Trade Contractors & Work Orders</h2>
          <p className="text-zinc-500 text-sm mt-1 font-medium">Subcontractor agreements, Running Account (RA) bills, 5% DLP retention escrow, on-site muster rolls, and material debit notes.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* TAB SELECTOR */}
          <div className="flex bg-zinc-100 p-1 rounded-lg border border-zinc-200 overflow-x-auto">
            {[
              { id: 'DIRECTORY', label: 'Agency Master' },
              { id: 'LEDGERS', label: 'Work Orders & Ledger' },
              { id: 'RECONCILIATION', label: 'Material Debit Notes' },
              { id: 'HEADCOUNT', label: 'Labour Muster Roll' },
              { id: 'RATES', label: 'Negotiated Rates' },
              { id: 'PERFORMANCE', label: 'QA & Snag Scores' }
            ].map(tab => (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id)} 
                className={`px-3.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-zinc-900 text-white shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button 
            onClick={activeTab === 'HEADCOUNT' ? handleExportMusterRoll : handleExportDirectory}
            className="h-9 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 px-3.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden pb-10">
        
        {/* ========================================== */}
        {/* TAB 1: DIRECTORY                           */}
        {/* ========================================== */}
        {activeTab === 'DIRECTORY' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center h-10 bg-white border border-zinc-200 rounded-lg px-3.5 shadow-sm w-full max-w-sm focus-within:ring-2 focus-within:ring-zinc-900 transition-all">
                <svg className="w-4 h-4 text-zinc-400 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input 
                  type="text" 
                  placeholder="Search agency, trade, or phone..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                  className="bg-transparent border-none text-xs font-medium text-zinc-900 outline-none w-full placeholder:text-zinc-400" 
                />
              </div>

              <button 
                onClick={() => setIsSubModalOpen(true)} 
                className="bg-zinc-900 hover:bg-black text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer h-10 flex items-center gap-2 border border-black"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Register Trade Agency
              </button>
            </div>

            {/* FINANCIAL KPI TILES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm flex flex-col justify-center">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Registered Trade Agencies</span>
                <p className="text-3xl font-black text-zinc-900 tracking-tight">{subcontractors.length}</p>
              </div>
              <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm flex flex-col justify-center">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Total Contract Commitments</span>
                <p className="text-2xl font-black text-zinc-900 tracking-tight">₹{totalPortfolioValue.toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-xl shadow-sm flex flex-col justify-center">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest block mb-2">Certified Payouts Disbursed</span>
                <p className="text-2xl font-black text-emerald-800 tracking-tight">₹{totalPaidAllTime.toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-zinc-900 border border-black p-6 rounded-xl shadow-sm flex flex-col justify-center text-white">
                <span className="text-[10px] font-bold uppercase tracking-widest block mb-2 opacity-80">5% Retention Escrow Held</span>
                <p className="text-2xl font-black tracking-tight">₹{totalRetentionHeld.toLocaleString('en-IN')}</p>
                <span className="text-[9px] font-bold uppercase tracking-widest opacity-80 mt-1">Locked until 12-month DLP expiry</span>
              </div>
            </div>

            {/* MASTER DIRECTORY TABLE */}
            <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-zinc-200 bg-white flex justify-between items-center">
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest">Master Trade Contractor Directory</h3>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-100 px-3 py-1 rounded border border-zinc-200">
                  {subcontractors.length} Verified Agencies
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap min-w-[950px]">
                  <thead>
                    <tr className="bg-zinc-50 text-zinc-500 text-[10px] uppercase tracking-widest font-bold border-b border-zinc-200">
                      <th className="py-3.5 px-6 w-72">Agency / Proprietor</th>
                      <th className="py-3.5 px-6 w-48">Trade Speciality</th>
                      <th className="py-3.5 px-6 w-48">Phone Number</th>
                      <th className="py-3.5 px-6 font-bold text-center w-36">Contracts</th>
                      <th className="py-3.5 px-6 font-bold text-right w-44">Lifetime Contract Value</th>
                      <th className="py-3.5 px-6 font-bold text-right w-40">5% Retention</th>
                      <th className="py-3.5 px-6 font-bold text-right w-44">Net Balance Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-sm">
                    {subcontractors.filter(s => 
                      (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (s.trade || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (s.phone || '').toLowerCase().includes(searchQuery.toLowerCase())
                    ).map(sub => {
                      const stats = getSubStats(sub.id || sub._id);
                      return (
                        <tr 
                          key={sub.id || sub._id} 
                          className="hover:bg-zinc-50/80 transition-colors cursor-pointer group" 
                          onClick={() => { setActiveTab('LEDGERS'); setSelectedSubId(String(sub.id || sub._id)); }}
                        >
                          <td className="py-4 px-6 font-bold text-zinc-900 tracking-tight flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                              {sub.name.charAt(0).toUpperCase()}
                            </span>
                            <div>
                              <p className="font-bold text-zinc-900 tracking-tight">{sub.name}</p>
                              {sub.city && <span className="text-[10px] text-zinc-400 font-medium">{sub.city}</span>}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="bg-zinc-100 text-zinc-700 text-[9px] font-bold px-2.5 py-1 rounded-md uppercase tracking-widest border border-zinc-200">
                              {sub.trade}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-zinc-600 font-mono text-xs">{sub.phone || '-'}</td>
                          <td className="py-4 px-6 text-center font-bold text-zinc-900">
                            <span className="bg-zinc-100 px-3 py-1 rounded-md border border-zinc-200 font-mono text-xs">
                              {stats.totalWOs} WOs
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right font-black text-sm text-zinc-900">
                            ₹ {stats.totalContractValue.toLocaleString('en-IN')}
                          </td>
                          <td className="py-4 px-6 text-right font-medium text-xs text-zinc-500">
                            ₹ {stats.retentionHeld.toLocaleString('en-IN')}
                          </td>
                          <td className="py-4 px-6 text-right font-black text-sm text-red-600 bg-red-50/20">
                            ₹ {stats.netPayable.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      );
                    })}
                    {subcontractors.length === 0 && (
                      <tr>
                        <td colSpan="7" className="py-16 text-center text-zinc-400 font-bold text-xs uppercase tracking-widest">
                          No subcontractors registered. Click "+ Register Trade Agency" above.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TABS 2-5: DUAL PANEL LAYOUT               */}
        {/* ========================================== */}
        {['LEDGERS', 'RECONCILIATION', 'HEADCOUNT', 'RATES'].includes(activeTab) && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full min-h-[600px]">
            
            {/* LEFT SELECTOR PANEL */}
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden h-full flex flex-col">
                <div className="p-4 border-b border-zinc-200 bg-zinc-900 shrink-0 flex justify-between items-center">
                  <h3 className="text-[10px] font-bold text-white uppercase tracking-widest">Select Trade Agency</h3>
                  <span className="text-[9px] text-zinc-400 uppercase tracking-widest font-mono">{subcontractors.length} Total</span>
                </div>
                <div className="p-2 space-y-1 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden">
                  {subcontractors.map(sub => {
                    const idStr = String(sub.id || sub._id);
                    const isSelected = selectedSubId === idStr;
                    return (
                      <button
                        key={idStr} 
                        onClick={() => setSelectedSubId(idStr)}
                        className={`w-full text-left px-3.5 py-2.5 rounded-lg transition-all cursor-pointer flex flex-col ${
                          isSelected 
                            ? 'bg-zinc-900 text-white shadow-sm' 
                            : 'bg-transparent text-zinc-800 hover:bg-zinc-100'
                        }`}
                      >
                        <span className="text-xs font-bold tracking-tight truncate">{sub.name}</span>
                        <span className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${
                          isSelected ? 'text-zinc-400' : 'text-zinc-500'
                        }`}>
                          {sub.trade}
                        </span>
                      </button>
                    );
                  })}
                  {subcontractors.length === 0 && (
                    <p className="text-xs text-center p-4 text-zinc-400 font-bold uppercase tracking-widest">No agencies available.</p>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT MODULE CONTENT */}
            <div className="lg:col-span-9 space-y-6">
              {!selectedSubId ? (
                <div className="bg-white border border-dashed border-zinc-300 rounded-xl p-16 text-center">
                  <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">Select an agency from the left panel to open their ledger.</p>
                </div>
              ) : (
                <>
                  {/* --- TAB 2: LEDGERS & WORK ORDERS --- */}
                  {activeTab === 'LEDGERS' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                        <div>
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Active Contractor Account</span>
                          <h3 className="text-base font-bold text-zinc-900 tracking-tight">
                            {subcontractors.find(s => String(s.id || s._id) === selectedSubId)?.name}
                          </h3>
                        </div>
                        <button 
                          onClick={() => { setWoForm(prev => ({...prev, subcontractorId: selectedSubId})); setIsWoModalOpen(true); }} 
                          className="bg-zinc-900 hover:bg-black text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-2 border border-black"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                          Assign Work Order
                        </button>
                      </div>
                      
                      {workOrders.filter(w => String(w.subcontractorId) === selectedSubId).map(wo => {
                        const contractVal = parseFloat(wo.contractValue) || 0;
                        const paidVal = parseFloat(wo.totalPaid) || 0;
                        const retentionPct = parseFloat(wo.retentionPercent) || 5;
                        const retentionAmt = contractVal * (retentionPct / 100);
                        const balanceToPay = Math.max(0, contractVal - retentionAmt - paidVal);
                        const isExpanded = expandedRows.includes(wo.id || wo._id);

                        return (
                          <div key={wo.id || wo._id} className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
                            <div 
                              className="p-5 bg-white hover:bg-zinc-50/60 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer border-b border-zinc-100" 
                              onClick={() => toggleRow(wo.id || wo._id)}
                            >
                              <div>
                                <span className="bg-zinc-100 text-zinc-700 text-[9px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-widest border border-zinc-200 mb-1.5 inline-block font-mono">
                                  WO#{wo.id || wo._id} • {wo.status || 'Active'}
                                </span>
                                <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2 tracking-tight">
                                  {wo.projectName}
                                  <svg className={`w-4 h-4 text-zinc-400 transition-transform ${isExpanded ? 'rotate-180 text-zinc-900' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                  </svg>
                                </h3>
                                <p className="text-xs text-zinc-500 font-medium mt-0.5 truncate max-w-md">{wo.scope || 'Interior carpentry / turnkey execution'}</p>
                              </div>

                              <div className="flex flex-wrap gap-5 text-right items-center">
                                <div>
                                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Locked Contract</p>
                                  <p className="text-sm font-bold text-zinc-900">₹{contractVal.toLocaleString('en-IN')}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{retentionPct}% Retention</p>
                                  <p className="text-sm font-bold text-zinc-500">₹{retentionAmt.toLocaleString('en-IN')}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Disbursed Paid</p>
                                  <p className="text-sm font-bold text-emerald-700">₹{paidVal.toLocaleString('en-IN')}</p>
                                </div>
                                <div className="pl-4 border-l border-zinc-200">
                                  <p className="text-[9px] font-bold text-red-600 uppercase tracking-widest">Balance Payable</p>
                                  <p className="text-base font-black text-red-600">₹{balanceToPay.toLocaleString('en-IN')}</p>
                                </div>
                              </div>
                            </div>
                            
                            {isExpanded && (
                              <div className="p-6 bg-zinc-50/50">
                                <div className="flex justify-between items-center border-b border-zinc-200 pb-3 mb-4">
                                  <h4 className="text-[10px] font-bold text-zinc-900 uppercase tracking-widest">Disbursement & Interim Bill Ledger</h4>
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); openPayModal(wo.id || wo._id); }} 
                                      className="px-3.5 py-1.5 bg-zinc-900 hover:bg-black text-white rounded-lg text-[9px] font-bold uppercase tracking-widest shadow-sm transition-all flex items-center gap-1.5 border border-black cursor-pointer"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                      </svg>
                                      Log Payout Voucher
                                    </button>
                                  </div>
                                </div>

                                {(!wo.payments || wo.payments.length === 0) ? (
                                  <p className="text-xs text-zinc-400 italic py-4 font-medium text-center">No payment disbursements recorded for this work order yet.</p>
                                ) : (
                                  <table className="w-full text-left border-collapse">
                                    <thead>
                                      <tr className="text-[9px] text-zinc-400 uppercase tracking-widest border-b border-zinc-200 font-bold">
                                        <th className="pb-2.5">Date</th>
                                        <th className="pb-2.5">Mode & UTR Ref</th>
                                        <th className="pb-2.5">Milestone / Work Stage Notes</th>
                                        <th className="pb-2.5 text-right">Amount Paid</th>
                                      </tr>
                                    </thead>
                                    <tbody className="text-xs text-zinc-800 divide-y divide-zinc-100">
                                      {wo.payments.map((pay, pIdx) => (
                                        <tr key={pay.id || pIdx} className="hover:bg-white transition-colors">
                                          <td className="py-3 font-bold text-zinc-500 uppercase tracking-widest text-[10px] font-mono">{pay.date}</td>
                                          <td className="py-3 font-mono">
                                            <span className="bg-zinc-100 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border border-zinc-200 mr-2 text-zinc-700">
                                              {pay.mode}
                                            </span> 
                                            {pay.referenceNo || pay.ref || '-'}
                                          </td>
                                          <td className="py-3 text-zinc-600 font-medium">{pay.notes || '-'}</td>
                                          <td className="py-3 text-right font-black text-emerald-700 text-sm">
                                            ₹{Number(pay.amount).toLocaleString('en-IN')}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {workOrders.filter(w => String(w.subcontractorId) === selectedSubId).length === 0 && (
                        <div className="bg-white border border-dashed border-zinc-300 rounded-xl p-16 text-center">
                          <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">No active work orders assigned to this agency. Click "Assign Work Order" above.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* --- TAB 3: MATERIAL RECONCILIATION & DEBIT NOTES --- */}
                  {activeTab === 'RECONCILIATION' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      <div className="lg:col-span-5 bg-white border border-zinc-200 rounded-xl shadow-sm p-6 h-fit space-y-4">
                        <div className="border-b border-zinc-100 pb-3">
                          <h3 className="text-xs font-bold text-red-600 uppercase tracking-widest">Issue Material Debit Note</h3>
                          <p className="text-xs text-zinc-500 font-medium mt-1 leading-relaxed">
                            Log company warehouse materials issued to agency or damages. Automatically deducted from final settlement.
                          </p>
                        </div>

                        <form onSubmit={handleSaveDN} className="space-y-4">
                          <div>
                            <label className={labelClass}>Project Site <span className="text-red-500">*</span></label>
                            <select 
                              required 
                              value={dnForm.projectId} 
                              onChange={e => setDnForm({...dnForm, projectId: e.target.value})} 
                              className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2318181B%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10 font-bold`}
                            >
                              <option value="">Select Project Site...</option>
                              {projects.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name || p.projectName}</option>)}
                            </select>
                          </div>

                          <div>
                            <label className={labelClass}>Material Issued / Reason <span className="text-red-500">*</span></label>
                            <input 
                              type="text" 
                              required 
                              list="dn-materials-datalist"
                              value={dnForm.item} 
                              onChange={e => setDnForm({...dnForm, item: e.target.value})} 
                              placeholder="e.g. 18mm Marine Ply or Damaged Sanitary fixture" 
                              className={inputClass} 
                            />
                            <datalist id="dn-materials-datalist">
                              {inventoryItems.map(item => (
                                <option key={item.id} value={item.name || item.materialName} />
                              ))}
                            </datalist>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className={labelClass}>Quantity <span className="text-red-500">*</span></label>
                              <input type="number" step="any" required value={dnForm.qty} onChange={e => setDnForm({...dnForm, qty: e.target.value})} className={inputClass} placeholder="0" />
                            </div>
                            <div>
                              <label className={labelClass}>Debit Rate (₹) <span className="text-red-500">*</span></label>
                              <input type="number" step="any" required value={dnForm.rate} onChange={e => setDnForm({...dnForm, rate: e.target.value})} className={`${inputClass} font-bold`} placeholder="0.00" />
                            </div>
                          </div>

                          <button type="submit" className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-[10px] uppercase tracking-widest transition-all shadow-sm cursor-pointer border border-red-700">
                            Issue Debit Note
                          </button>
                        </form>
                      </div>

                      <div className="lg:col-span-7 bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[520px]">
                        <div className="p-4 border-b border-zinc-200 bg-white flex justify-between items-center">
                          <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest">Active Debit Notes (Deductions)</h3>
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                            Total: ₹{debitNotes.filter(d => String(d.subId) === selectedSubId).reduce((s, d) => s + (d.totalAmount || 0), 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="p-4 flex-1 overflow-y-auto space-y-3 [&::-webkit-scrollbar]:hidden bg-zinc-50/40">
                          {debitNotes.filter(d => String(d.subId) === selectedSubId).map(dn => (
                            <div key={dn.id} className="p-4 bg-white border border-zinc-200 rounded-xl flex justify-between items-center shadow-sm">
                              <div>
                                <p className="text-sm font-bold text-zinc-900 tracking-tight">{dn.item}</p>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
                                  {dn.qty} units @ ₹{dn.rate} • <span className="text-zinc-800">{projects.find(p => String(p.id || p._id) === String(dn.projectId))?.name || 'Site'}</span>
                                </p>
                              </div>
                              <div className="text-right flex items-center gap-3">
                                <div>
                                  <p className="text-sm font-black text-red-600 mb-0.5">- ₹{Number(dn.totalAmount).toLocaleString('en-IN')}</p>
                                  <button 
                                    onClick={() => handleToggleDebitDeduction(dn.id)}
                                    className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border cursor-pointer ${
                                      dn.deducted ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                                    }`}
                                  >
                                    {dn.deducted ? 'Deducted in Settlement' : 'Mark Deducted'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                          {debitNotes.filter(d => String(d.subId) === selectedSubId).length === 0 && (
                            <p className="text-xs text-zinc-400 uppercase tracking-widest font-bold text-center py-20">No material debit notes issued to this contractor.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* --- TAB 4: MUSTER ROLL (HEADCOUNT) --- */}
                  {activeTab === 'HEADCOUNT' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      <div className="lg:col-span-4 bg-white border border-zinc-200 rounded-xl shadow-sm p-6 h-fit space-y-4">
                        <div className="border-b border-zinc-100 pb-3">
                          <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest">Log Daily Worker Muster</h3>
                          <p className="text-xs text-zinc-500 font-medium mt-1">Cross-check daily site workforce against work orders.</p>
                        </div>

                        <form onSubmit={handleSaveLabour} className="space-y-4">
                          <div>
                            <label className={labelClass}>Date</label>
                            <input type="date" required value={labourForm.date} onChange={e => setLabourForm({...labourForm, date: e.target.value})} className={inputClass} />
                          </div>
                          <div>
                            <label className={labelClass}>Project Site</label>
                            <select 
                              required 
                              value={labourForm.projectId} 
                              onChange={e => setLabourForm({...labourForm, projectId: e.target.value})} 
                              className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2318181B%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10 font-bold`}
                            >
                              <option value="">Select Project...</option>
                              {projects.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name || p.projectName}</option>)}
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className={labelClass}>Skilled Masters</label>
                              <input type="number" required value={labourForm.skilled} onChange={e => setLabourForm({...labourForm, skilled: e.target.value})} className={`${inputClass} text-center font-bold`} placeholder="0" />
                            </div>
                            <div>
                              <label className={labelClass}>Helpers</label>
                              <input type="number" required value={labourForm.unskilled} onChange={e => setLabourForm({...labourForm, unskilled: e.target.value})} className={`${inputClass} text-center font-bold`} placeholder="0" />
                            </div>
                          </div>
                          <button type="submit" className="w-full py-3 bg-zinc-900 hover:bg-black text-white font-bold rounded-lg text-[10px] uppercase tracking-widest transition-all shadow-sm border border-black cursor-pointer">
                            Log Headcount
                          </button>
                        </form>
                      </div>

                      <div className="lg:col-span-8 bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden h-[520px] flex flex-col">
                        <div className="p-4 border-b border-zinc-200 bg-white flex justify-between items-center">
                          <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest">Labour Headcount Log History</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden">
                          <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
                            <thead>
                              <tr className="bg-zinc-50 sticky top-0 text-zinc-500 text-[10px] uppercase tracking-widest font-bold border-b border-zinc-200">
                                <th className="p-4">Date & Site</th>
                                <th className="p-4 text-center">Skilled</th>
                                <th className="p-4 text-center">Helpers</th>
                                <th className="p-4 text-center text-zinc-900">Total Force</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                              {labourLogs.filter(l => String(l.subId) === selectedSubId).map(log => (
                                <tr key={log.id} className="hover:bg-zinc-50 transition-colors">
                                  <td className="p-4">
                                    <p className="font-bold text-zinc-900 font-mono text-xs">{log.date}</p>
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
                                      {projects.find(p => String(p.id || p._id) === String(log.projectId))?.name || 'Site'}
                                    </p>
                                  </td>
                                  <td className="p-4 text-center font-mono font-bold text-zinc-700">{log.skilled}</td>
                                  <td className="p-4 text-center font-mono font-bold text-zinc-700">{log.unskilled}</td>
                                  <td className="p-4 text-center font-mono font-black text-zinc-900 text-sm">
                                    <span className="bg-zinc-100 px-3 py-1 rounded-md border border-zinc-200">
                                      {Number(log.skilled) + Number(log.unskilled)}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                              {labourLogs.filter(l => String(l.subId) === selectedSubId).length === 0 && (
                                <tr>
                                  <td colSpan="4" className="text-center py-20 text-xs text-zinc-400 uppercase tracking-widest font-bold">No muster roll records for this agency.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* --- TAB 5: RATE CARDS --- */}
                  {activeTab === 'RATES' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      <div className="lg:col-span-4 bg-white border border-zinc-200 rounded-xl shadow-sm p-6 h-fit space-y-4">
                        <div className="border-b border-zinc-100 pb-3">
                          <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest">Add Trade Rate Benchmark</h3>
                          <p className="text-xs text-zinc-500 font-medium mt-1">Locked contract rates for automatic quote generation.</p>
                        </div>

                        <form onSubmit={handleSaveRate} className="space-y-4">
                          <div>
                            <label className={labelClass}>Work Description <span className="text-red-500">*</span></label>
                            <textarea required rows="2" value={rateForm.item} onChange={e => setRateForm({...rateForm, item: e.target.value})} className={`${inputClass} resize-none`} placeholder="e.g. 18mm Plywood Wardrobe Carcase Assembly" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className={labelClass}>UOM</label>
                              <select value={rateForm.uom} onChange={e => setRateForm({...rateForm, uom: e.target.value})} className={inputClass}>
                                <option value="Sq.Ft.">Sq.Ft.</option>
                                <option value="R.Ft.">R.Ft.</option>
                                <option value="Nos">Nos</option>
                                <option value="L.S.">Lump Sum</option>
                              </select>
                            </div>
                            <div>
                              <label className={labelClass}>Negotiated Rate (₹) <span className="text-red-500">*</span></label>
                              <input type="number" step="any" required value={rateForm.rate} onChange={e => setRateForm({...rateForm, rate: e.target.value})} className={`${inputClass} font-bold text-zinc-900`} placeholder="0.00" />
                            </div>
                          </div>
                          <button type="submit" className="w-full py-3 bg-zinc-900 hover:bg-black text-white font-bold rounded-lg text-[10px] uppercase tracking-widest transition-all shadow-sm border border-black cursor-pointer">
                            Save to Trade Rate Card
                          </button>
                        </form>
                      </div>

                      <div className="lg:col-span-8 bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[520px]">
                        <div className="p-4 border-b border-zinc-200 bg-white">
                          <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest">Master Negotiated Schedule of Rates</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden">
                          <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
                            <thead>
                              <tr className="bg-zinc-50 sticky top-0 text-zinc-500 text-[10px] uppercase tracking-widest font-bold border-b border-zinc-200">
                                <th className="p-4">Item Scope</th>
                                <th className="p-4 text-center w-28">UOM</th>
                                <th className="p-4 text-right w-40">Locked Rate</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                              {rateCards.filter(r => String(r.subId) === selectedSubId).map(rate => (
                                <tr key={rate.id} className="hover:bg-zinc-50 transition-colors">
                                  <td className="p-4 font-bold text-zinc-900 whitespace-normal">{rate.item}</td>
                                  <td className="p-4 text-center text-zinc-500 text-xs font-bold uppercase tracking-widest">{rate.uom}</td>
                                  <td className="p-4 text-right font-black text-zinc-900 text-sm">
                                    ₹{Number(rate.rate).toLocaleString('en-IN')}
                                  </td>
                                </tr>
                              ))}
                              {rateCards.filter(r => String(r.subId) === selectedSubId).length === 0 && (
                                <tr>
                                  <td colSpan="3" className="text-center py-20 text-xs text-zinc-400 uppercase tracking-widest font-bold">No custom rate cards saved for this agency.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                </>
              )}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 6: QUALITY & PERFORMANCE               */}
        {/* ========================================== */}
        {activeTab === 'PERFORMANCE' && (
          <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-zinc-200 bg-white flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest">Trade Agency Quality & Reliability Scorecard</h3>
                <p className="text-xs text-zinc-500 font-medium mt-0.5">Computed from defect punch tickets logged during site quality inspections.</p>
              </div>
            </div>

            <div className="p-6 bg-zinc-50/50">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {subcontractors.map(sub => {
                  const subIdStr = String(sub.id || sub._id);
                  const agencySnags = snagsList.filter(s => 
                    String(s.subcontractorId || s.subId) === subIdStr || 
                    (s.assignedTo && s.assignedTo.toLowerCase().includes(sub.name.toLowerCase()))
                  );
                  const totalSnags = agencySnags.length;
                  const resolvedSnags = agencySnags.filter(s => s.status === 'Resolved').length;
                  const resolutionRate = totalSnags === 0 ? 100 : Math.round((resolvedSnags / totalSnags) * 100);
                  const isPoor = resolutionRate < 70 && totalSnags > 0;

                  return (
                    <div key={subIdStr} className="border border-zinc-200 rounded-xl p-6 bg-white shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-bold text-zinc-900 text-base tracking-tight">{sub.name}</h4>
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mt-0.5">{sub.trade}</span>
                          </div>
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm border-2 ${
                            isPoor ? 'border-red-200 text-red-600 bg-red-50' : 'border-zinc-900 text-zinc-900 bg-zinc-50'
                          }`}>
                            {resolutionRate}%
                          </div>
                        </div>

                        <div className="space-y-2.5 border-t border-zinc-100 pt-4 mt-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-zinc-500 font-medium">Defects Logged (Snags)</span>
                            <strong className="text-zinc-900 font-bold">{totalSnags}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-500 font-medium">Defects Resolved</span>
                            <strong className="text-emerald-700 font-bold">{resolvedSnags}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 pt-3 border-t border-zinc-100 flex justify-between items-center text-xs">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Quality Rating</span>
                        <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest border ${
                          isPoor ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {isPoor ? 'High Defect Risk' : 'Reliable Execution'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* --- ADD SUBCONTRACTOR MODAL --- */}
      {isSubModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col border border-zinc-200">
            <div className="px-8 py-6 border-b border-zinc-200 flex justify-between items-center bg-white shrink-0">
              <div>
                <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Register Trade Contractor</h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Vendor Master Profile</p>
              </div>
              <button onClick={() => setIsSubModalOpen(false)} className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 flex items-center justify-center cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSub} className="p-8 space-y-4 bg-zinc-50/50">
              <div>
                <label className={labelClass}>Agency / Contractor Name <span className="text-red-500">*</span></label>
                <input type="text" required value={subForm.name} onChange={e => setSubForm({...subForm, name: e.target.value})} className={inputClass} placeholder="e.g. Ramesh Carpentry Works" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Trade Speciality</label>
                  <select value={subForm.trade} onChange={e => setSubForm({...subForm, trade: e.target.value})} className={`${inputClass} font-bold`}>
                    <option value="Carpenter">Carpenter</option>
                    <option value="Painter">Painter</option>
                    <option value="Electrician">Electrician</option>
                    <option value="Plumber">Plumber</option>
                    <option value="False Ceiling">False Ceiling</option>
                    <option value="Civil/Mason">Civil / Mason</option>
                    <option value="Fabrication">Fabrication</option>
                    <option value="Glass & Mirrors">Glass & Mirrors</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Phone Number</label>
                  <input type="text" value={subForm.phone} onChange={e => setSubForm({...subForm, phone: e.target.value})} className={inputClass} placeholder="+91 98765 43210" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>GSTIN (Optional)</label>
                  <input type="text" value={subForm.gstin} onChange={e => setSubForm({...subForm, gstin: e.target.value.toUpperCase()})} className={`${inputClass} font-mono uppercase`} placeholder="36..." />
                </div>
                <div>
                  <label className={labelClass}>City / Region</label>
                  <input type="text" value={subForm.city} onChange={e => setSubForm({...subForm, city: e.target.value})} className={inputClass} placeholder="Hyderabad" />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-2 border-t border-zinc-200">
                <button type="button" onClick={() => setIsSubModalOpen(false)} className="px-5 py-2.5 bg-white border border-zinc-200 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-700 cursor-pointer">Cancel</button>
                <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-zinc-900 hover:bg-black text-white rounded-lg text-[10px] font-bold uppercase tracking-widest border border-black cursor-pointer">
                  {submitting ? 'Saving...' : 'Save Contractor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ASSIGN WORK ORDER MODAL --- */}
      {isWoModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col border border-zinc-200">
            <div className="px-8 py-6 border-b border-zinc-200 bg-white flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Assign Trade Work Order</h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Scope, Locked Value & 5% DLP Retention</p>
              </div>
              <button onClick={() => setIsWoModalOpen(false)} className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 flex items-center justify-center cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveWo} className="p-8 space-y-4 bg-zinc-50/50">
              <div>
                <label className={labelClass}>Project Site <span className="text-red-500">*</span></label>
                <select 
                  required 
                  value={woForm.projectId} 
                  onChange={e => setWoForm({...woForm, projectId: e.target.value})} 
                  className={`${inputClass} font-bold`}
                >
                  <option value="" disabled>Choose active project...</option>
                  {projects.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name || p.projectName}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Contract Scope Description</label>
                <input type="text" placeholder="e.g. Complete Wardrobe Carpentry & Kitchen Framework" value={woForm.scope} onChange={e => setWoForm({...woForm, scope: e.target.value})} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Contract Value (₹) <span className="text-red-500">*</span></label>
                  <input type="number" step="any" required value={woForm.contractValue} onChange={e => setWoForm({...woForm, contractValue: e.target.value})} className={`${inputClass} font-bold text-zinc-900`} placeholder="0.00" />
                </div>
                <div>
                  <label className={labelClass}>DLP Retention %</label>
                  <input type="number" min="0" max="20" value={woForm.retentionPercent} onChange={e => setWoForm({...woForm, retentionPercent: e.target.value})} className={`${inputClass} text-center font-bold`} placeholder="5" />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-2 border-t border-zinc-200">
                <button type="button" onClick={() => setIsWoModalOpen(false)} className="px-5 py-2.5 bg-white border border-zinc-200 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-700 cursor-pointer">Cancel</button>
                <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-zinc-900 hover:bg-black text-white rounded-lg text-[10px] font-bold uppercase tracking-widest border border-black cursor-pointer">
                  {submitting ? 'Assigning...' : 'Award Contract'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- LOG PAYMENT MODAL --- */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col border border-zinc-200">
            <div className="px-8 py-6 border-b border-zinc-200 bg-white flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Record Contractor Disbursement</h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Direct Work Order Payout Voucher</p>
              </div>
              <button onClick={() => setIsPayModalOpen(false)} className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 flex items-center justify-center cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePay} className="p-8 space-y-4 bg-zinc-50/50">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Payment Date</label>
                  <input type="date" required value={payForm.date} onChange={e => setPayForm({...payForm, date: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Disbursement (₹) <span className="text-red-500">*</span></label>
                  <input type="number" step="any" required value={payForm.amount} onChange={e => setPayForm({...payForm, amount: e.target.value})} className={`${inputClass} font-bold text-emerald-700`} placeholder="0.00" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Payment Mode</label>
                  <select value={payForm.mode} onChange={e => setPayForm({...payForm, mode: e.target.value})} className={`${inputClass} font-bold`}>
                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                    <option value="UPI">UPI</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>UTR / Ref No.</label>
                  <input type="text" value={payForm.referenceNo} onChange={e => setPayForm({...payForm, referenceNo: e.target.value})} className={`${inputClass} font-mono`} placeholder="Ref number" />
                </div>
              </div>

              <div>
                <label className={labelClass}>Milestone Stage / Work Notes</label>
                <input type="text" value={payForm.notes} onChange={e => setPayForm({...payForm, notes: e.target.value})} className={inputClass} placeholder="e.g. 50% framing completion certified" />
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-zinc-200">
                <button type="button" onClick={() => setIsPayModalOpen(false)} className="px-5 py-2.5 bg-white border border-zinc-200 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-700 cursor-pointer">Cancel</button>
                <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-zinc-900 hover:bg-black text-white rounded-lg text-[10px] font-bold uppercase tracking-widest border border-black cursor-pointer">
                  {submitting ? 'Disbursing...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}