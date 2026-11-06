import React, { useState, useEffect } from 'react';
import * as db from '../db';
import { exportToCSV } from '../utils';

export default function VendorLedger({ companySettings = {} }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ledgers, setLedgers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [expandedVendor, setExpandedVendor] = useState(null);
  const [expandedSubTab, setExpandedSubTab] = useState('ALL'); // 'ALL' | 'BILLS' | 'PAYMENTS'
  const [searchQuery, setSearchQuery] = useState('');
  const [agingFilter, setAgingFilter] = useState('ALL'); // 'ALL' | 'OVERDUE_60' | 'DUE_30'
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [payForm, setPayForm] = useState({ 
    vendorName: '', 
    date: new Date().toISOString().split('T')[0], 
    amount: '', 
    mode: 'Bank Transfer', 
    referenceNo: '', 
    notes: '',
    linkedBillNo: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedLedgers, fetchedPurchases] = await Promise.all([
        db.getVendorLedgers ? db.getVendorLedgers() : Promise.resolve([]),
        db.getPurchases ? db.getPurchases() : Promise.resolve([])
      ]);

      const validPurchases = (fetchedPurchases || []).filter(p => !p.isCancelled);
      setPurchases(validPurchases);

      // Cache fallback for payments
      const cachedPayments = JSON.parse(localStorage.getItem('jyanipur_vendor_payments') || '[]');

      // Reconcile ledgers dynamically from purchases + payments if DB ledger is empty or sparse
      const vendorMap = new Map();

      // Seed from existing ledgers
      (fetchedLedgers || []).forEach(l => {
        vendorMap.set(l.vendorName, {
          vendorName: l.vendorName,
          totalBilled: parseFloat(l.totalBilled) || 0,
          totalPaid: parseFloat(l.totalPaid) || 0,
          balance: parseFloat(l.balance) || 0,
          payments: l.payments || [],
          bills: []
        });
      });

      // Populate & verify purchase bills
      validPurchases.forEach(p => {
        const vName = p.vendorName || 'Unassigned Supplier';
        if (!vendorMap.has(vName)) {
          vendorMap.set(vName, {
            vendorName: vName,
            totalBilled: 0,
            totalPaid: 0,
            balance: 0,
            payments: [],
            bills: []
          });
        }
        const v = vendorMap.get(vName);
        const billAmt = parseFloat(p.totalAmount) || 0;
        v.bills.push({
          id: p.id || p._id,
          invoiceNo: p.invoiceNo,
          date: p.invoiceDate || p.date,
          projectName: p.projectName || 'Central Godown',
          totalAmount: billAmt,
          taxableAmount: parseFloat(p.taxableAmount) || 0,
          gstAmount: parseFloat(p.gstAmount) || 0
        });
      });

      // Merge local cached payments if not already reflected
      cachedPayments.forEach(cp => {
        if (vendorMap.has(cp.vendorName)) {
          const v = vendorMap.get(cp.vendorName);
          if (!v.payments.some(p => String(p.id) === String(cp.id))) {
            v.payments.push(cp);
          }
        }
      });

      // Recalculate totals and compute AP aging buckets
      const today = new Date();
      const reconciledLedgers = Array.from(vendorMap.values()).map(v => {
        const calculatedBilled = v.bills.length > 0 
          ? v.bills.reduce((sum, b) => sum + b.totalAmount, 0) 
          : v.totalBilled;
        
        const calculatedPaid = v.payments.length > 0
          ? v.payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
          : v.totalPaid;

        const balance = Math.max(0, calculatedBilled - calculatedPaid);

        // Compute Accounts Payable (AP) Aging on outstanding bills
        let current0_30 = 0;
        let aging31_60 = 0;
        let overdue60Plus = 0;

        v.bills.forEach(b => {
          const billDate = new Date(b.date || today);
          const diffDays = Math.max(0, Math.floor((today - billDate) / (1000 * 60 * 60 * 24)));
          
          if (diffDays <= 30) {
            current0_30 += b.totalAmount;
          } else if (diffDays <= 60) {
            aging31_60 += b.totalAmount;
          } else {
            overdue60Plus += b.totalAmount;
          }
        });

        // Sort payments and bills by date descending
        v.payments.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        v.bills.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

        return {
          ...v,
          totalBilled: calculatedBilled,
          totalPaid: calculatedPaid,
          balance,
          current0_30,
          aging31_60,
          overdue60Plus
        };
      });

      // Sort by highest outstanding balance
      reconciledLedgers.sort((a, b) => b.balance - a.balance);
      setLedgers(reconciledLedgers);

    } catch (error) {
      console.error("Error fetching vendor ledgers:", error);
      setLedgers([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSavePay = async (e) => {
    e.preventDefault();
    const payAmt = parseFloat(payForm.amount);
    if (!payAmt || payAmt <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        id: Date.now(),
        ...payForm,
        amount: payAmt
      };

      if (typeof db.saveVendorPayment === 'function') {
        await db.saveVendorPayment(payload);
      } else {
        const cached = JSON.parse(localStorage.getItem('jyanipur_vendor_payments') || '[]');
        cached.unshift(payload);
        localStorage.setItem('jyanipur_vendor_payments', JSON.stringify(cached));
      }

      setIsModalOpen(false);
      setPayForm({ vendorName: '', date: new Date().toISOString().split('T')[0], amount: '', mode: 'Bank Transfer', referenceNo: '', notes: '', linkedBillNo: '' });
      await loadData();
      alert(`Remittance of ₹${payAmt.toLocaleString('en-IN')} logged to ${payload.vendorName}'s ledger!`);
    } catch (error) {
      alert("Error saving payment to cloud database.");
    }
    setSubmitting(false);
  };

  const openPayModal = (vendorName, defaultAmount = '') => {
    const targetLedger = ledgers.find(l => l.vendorName === vendorName);
    setPayForm({ 
      vendorName, 
      amount: defaultAmount || (targetLedger ? String(targetLedger.balance || '') : ''), 
      date: new Date().toISOString().split('T')[0], 
      mode: 'Bank Transfer',
      referenceNo: '', 
      notes: '',
      linkedBillNo: ''
    });
    setIsModalOpen(true);
  };

  const handleExportStatement = (ledger) => {
    const statementRows = [];
    
    (ledger.bills || []).forEach(b => {
      statementRows.push({
        'Date': b.date,
        'Transaction Type': 'PURCHASE INVOICE',
        'Reference / Bill No': b.invoiceNo,
        'Site / Destination': b.projectName,
        'Debit / Invoiced (₹)': b.totalAmount,
        'Credit / Remittance (₹)': 0,
        'Details': `Material Purchase Bill`
      });
    });

    (ledger.payments || []).forEach(p => {
      statementRows.push({
        'Date': p.date,
        'Transaction Type': 'PAYMENT DISBURSEMENT',
        'Reference / Bill No': p.referenceNo || p.ref || '-',
        'Site / Destination': 'Bank Remittance',
        'Debit / Invoiced (₹)': 0,
        'Credit / Remittance (₹)': parseFloat(p.amount) || 0,
        'Details': `${p.mode} - ${p.notes || 'Settlement'}`
      });
    });

    statementRows.sort((a, b) => new Date(a.Date) - new Date(b.Date));
    exportToCSV(`Vendor_Statement_${ledger.vendorName.replace(/[^a-zA-Z0-9]/g, '_')}`, statementRows);
  };

  const handleExportMasterLedger = () => {
    const data = filteredLedgers.map(l => ({
      'Supplier / Vendor': l.vendorName,
      'Total Billed (INR)': l.totalBilled,
      'Total Paid (INR)': l.totalPaid,
      'Net Balance Due (INR)': l.balance,
      '0 - 30 Days (Current)': l.current0_30,
      '31 - 60 Days (Aging)': l.aging31_60,
      '60+ Days (Overdue)': l.overdue60Plus
    }));
    exportToCSV('Vendor_Accounts_Payable_Aging_Report', data);
  };

  const filteredLedgers = ledgers.filter(l => {
    const matchesSearch = (l.vendorName || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (agingFilter === 'OVERDUE_60') return l.overdue60Plus > 0;
    if (agingFilter === 'DUE_30') return l.balance > 0;
    return true;
  });

  const totalBilled = ledgers.reduce((sum, l) => sum + (parseFloat(l.totalBilled) || 0), 0);
  const totalPaid = ledgers.reduce((sum, l) => sum + (parseFloat(l.totalPaid) || 0), 0);
  const totalPayable = ledgers.reduce((sum, l) => sum + (parseFloat(l.balance) || 0), 0);
  const totalOverdue60 = ledgers.reduce((sum, l) => sum + (parseFloat(l.overdue60Plus) || 0), 0);

  const inputClass = "w-full px-4 py-3 rounded-lg border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 text-xs font-medium transition-all shadow-sm disabled:opacity-75 disabled:cursor-not-allowed";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-0.5";

  return (
    <div className="w-full h-full font-['Inter',sans-serif] flex flex-col">
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center pb-6 mb-4 border-b border-zinc-200 shrink-0 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Vendor Accounts Payable & Aging Ledger</h2>
          <p className="text-zinc-500 text-sm mt-1 font-medium">Reconcile supplier purchase bills, payment remittances, and 30/60/90-day trade credit aging.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="flex items-center h-10 bg-white border border-zinc-200 rounded-lg px-3.5 shadow-sm w-full md:w-64 focus-within:ring-2 focus-within:ring-zinc-900 transition-all">
            <svg className="w-4 h-4 text-zinc-400 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              placeholder="Search vendor or supplier..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="bg-transparent border-none text-xs font-medium text-zinc-900 outline-none w-full placeholder:text-zinc-400" 
            />
          </div>

          {/* Aging Filter */}
          <div className="flex bg-zinc-100 p-1 rounded-lg border border-zinc-200">
            {[
              { id: 'ALL', label: 'All Vendors' },
              { id: 'DUE_30', label: 'Outstanding Balance' },
              { id: 'OVERDUE_60', label: '60+ Days Overdue' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setAgingFilter(f.id)}
                className={`px-3 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                  agingFilter === f.id ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button 
            onClick={handleExportMasterLedger}
            className="h-10 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 px-4 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export AP Report
          </button>
        </div>
      </div>

      {/* KPI METRIC TILES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6 shrink-0">
        <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Active Suppliers</span>
          <p className="text-3xl font-black text-zinc-900 tracking-tight">{ledgers.length}</p>
        </div>

        <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Total Invoiced (Billed)</span>
          <p className="text-2xl font-black text-zinc-900 tracking-tight">₹ {totalBilled.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest block mb-2">Total Remitted (Paid)</span>
          <p className="text-2xl font-black text-emerald-800 tracking-tight">₹ {totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="bg-zinc-900 border border-black p-6 rounded-xl shadow-sm flex flex-col justify-center relative overflow-hidden text-white">
          <svg className="absolute -right-4 -bottom-6 w-32 h-32 opacity-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-widest block mb-2 relative z-10 opacity-80">Net Balance Due</span>
          <p className="text-2xl font-black tracking-tight relative z-10">₹ {totalPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          {totalOverdue60 > 0 && (
            <span className="text-[9px] font-bold text-red-400 uppercase tracking-widest mt-1 relative z-10">
              ₹{totalOverdue60.toLocaleString('en-IN')} Overdue (&gt;60 Days)
            </span>
          )}
        </div>
      </div>

      {/* ACCOUNTS PAYABLE TABLE */}
      <div className="bg-white border border-zinc-200 rounded-xl shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[950px]">
            <thead>
              <tr className="bg-zinc-50 text-zinc-500 text-[10px] uppercase tracking-widest font-bold border-b border-zinc-200 sticky top-0 z-10">
                <th className="py-4 px-6 w-12 text-center">#</th>
                <th className="py-4 px-4 font-bold">Supplier / Vendor</th>
                <th className="py-4 px-6 font-bold text-right w-36">Total Billed</th>
                <th className="py-4 px-6 font-bold text-right w-36">Total Paid</th>
                <th className="py-4 px-6 font-bold text-right w-40">Net Balance Due</th>
                <th className="py-4 px-6 font-bold text-center w-36">Aging Profile</th>
                <th className="py-4 px-6 font-bold text-right w-48">Action</th>
              </tr>
            </thead>
            <tbody className="text-sm text-zinc-800 divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-16 text-center text-zinc-400 font-medium text-xs">
                    Syncing vendor accounts from database...
                  </td>
                </tr>
              ) : filteredLedgers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400 border border-zinc-200">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <p className="text-zinc-500 font-medium text-xs">No matching vendor accounts found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLedgers.map(l => {
                  const isExpanded = expandedVendor === l.vendorName;
                  const balanceVal = parseFloat(l.balance) || 0;
                  const hasOverdue = l.overdue60Plus > 0;
                  
                  return (
                    <React.Fragment key={l.vendorName}>
                      <tr 
                        className={`transition-colors cursor-pointer group ${isExpanded ? 'bg-zinc-50' : 'hover:bg-zinc-50/70'}`} 
                        onClick={() => setExpandedVendor(isExpanded ? null : l.vendorName)}
                      >
                        <td className="py-4 px-6 text-center">
                          <div className={`w-6 h-6 rounded flex items-center justify-center text-zinc-500 transition-all ${isExpanded ? 'rotate-90 bg-zinc-900 text-white' : 'bg-zinc-100 group-hover:bg-zinc-200'}`}>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </td>
                        <td className="py-4 px-4 font-bold text-zinc-900 tracking-tight">
                          <p className="font-bold text-zinc-900">{l.vendorName}</p>
                          <span className="text-[10px] text-zinc-400 font-medium">
                            {(l.bills || []).length} Invoices • {(l.payments || []).length} Remittances
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right font-medium text-xs text-zinc-700">
                          ₹{(parseFloat(l.totalBilled) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-6 text-right font-bold text-xs text-emerald-700">
                          ₹{(parseFloat(l.totalPaid) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-6 text-right font-black text-sm">
                          <span className={balanceVal > 0 ? 'text-red-600' : 'text-zinc-400'}>
                            ₹{balanceVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          {balanceVal === 0 ? (
                            <span className="px-2.5 py-1 rounded bg-zinc-100 text-zinc-600 border border-zinc-200 text-[9px] font-bold uppercase tracking-widest">
                              Clear
                            </span>
                          ) : hasOverdue ? (
                            <span className="px-2.5 py-1 rounded bg-red-50 text-red-700 border border-red-200 text-[9px] font-bold uppercase tracking-widest">
                              &gt; 60 Days Overdue
                            </span>
                          ) : l.aging31_60 > 0 ? (
                            <span className="px-2.5 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-bold uppercase tracking-widest">
                              31-60 Days Due
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 text-[9px] font-bold uppercase tracking-widest">
                              Current (0-30d)
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleExportStatement(l)}
                              className="px-2.5 py-1.5 bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 rounded-lg text-[9px] font-bold uppercase tracking-widest shadow-sm transition-all"
                              title="Export Account Passbook"
                            >
                              Statement
                            </button>
                            <button 
                              onClick={() => openPayModal(l.vendorName)} 
                              className="px-3 py-1.5 bg-zinc-900 hover:bg-black text-white font-bold text-[9px] uppercase tracking-widest rounded-lg transition-all shadow-sm cursor-pointer border border-black"
                            >
                              Log Payment
                            </button>
                          </div>
                        </td>
                      </tr>
                      
                      {/* EXPANDED FULL VENDOR PASSBOOK (BILLS + REMITTANCES) */}
                      {isExpanded && (
                        <tr className="bg-zinc-100/40 border-b border-zinc-200">
                          <td></td>
                          <td colSpan="6" className="py-4 pr-6 pl-2">
                            <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm space-y-4">
                              
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-100 pb-3 gap-3">
                                <div>
                                  <h4 className="text-[10px] font-bold text-zinc-900 uppercase tracking-widest flex items-center gap-2">
                                    <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    Ledger Passbook — {l.vendorName}
                                  </h4>
                                  <p className="text-xs text-zinc-500 font-medium mt-0.5">
                                    Billed: ₹{l.totalBilled.toLocaleString('en-IN')} • Paid: ₹{l.totalPaid.toLocaleString('en-IN')} • Balance: ₹{l.balance.toLocaleString('en-IN')}
                                  </p>
                                </div>

                                {/* Sub-Tab Filter */}
                                <div className="flex bg-zinc-100 p-1 rounded-lg border border-zinc-200">
                                  {['ALL', 'BILLS', 'PAYMENTS'].map(tab => (
                                    <button
                                      key={tab}
                                      onClick={() => setExpandedSubTab(tab)}
                                      className={`px-3 py-1 rounded text-[9px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                                        expandedSubTab === tab ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'
                                      }`}
                                    >
                                      {tab === 'ALL' ? 'Full Passbook' : tab === 'BILLS' ? `Invoices (${(l.bills || []).length})` : `Remittances (${(l.payments || []).length})`}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* TAB 1: BILLS VIEW */}
                              {(expandedSubTab === 'ALL' || expandedSubTab === 'BILLS') && (
                                <div className="space-y-2">
                                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Purchase Invoices (Debits)</span>
                                  {(!l.bills || l.bills.length === 0) ? (
                                    <p className="text-xs text-zinc-400 font-medium italic py-2">No purchase bills logged for this supplier.</p>
                                  ) : (
                                    <table className="w-full text-left text-xs border-collapse">
                                      <thead>
                                        <tr className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold border-b border-zinc-200 pb-2">
                                          <th className="pb-2">Invoice Date</th>
                                          <th className="pb-2">Bill / Invoice No.</th>
                                          <th className="pb-2">Destination Site</th>
                                          <th className="pb-2 text-right">Taxable</th>
                                          <th className="pb-2 text-right">GST</th>
                                          <th className="pb-2 text-right">Invoice Total</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-zinc-100">
                                        {l.bills.map((bill, bIdx) => (
                                          <tr key={bill.id || bIdx} className="hover:bg-zinc-50">
                                            <td className="py-2.5 font-mono text-[10px] text-zinc-500 font-bold">{bill.date}</td>
                                            <td className="py-2.5 font-bold text-zinc-900">{bill.invoiceNo}</td>
                                            <td className="py-2.5 text-zinc-600">{bill.projectName}</td>
                                            <td className="py-2.5 text-right font-medium text-zinc-600">₹{bill.taxableAmount.toLocaleString('en-IN')}</td>
                                            <td className="py-2.5 text-right font-medium text-zinc-600">₹{bill.gstAmount.toLocaleString('en-IN')}</td>
                                            <td className="py-2.5 text-right font-black text-zinc-900">₹{bill.totalAmount.toLocaleString('en-IN')}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  )}
                                </div>
                              )}

                              {/* TAB 2: REMITTANCES VIEW */}
                              {(expandedSubTab === 'ALL' || expandedSubTab === 'PAYMENTS') && (
                                <div className="space-y-2 pt-2 border-t border-zinc-100">
                                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Disbursements & Remittances (Credits)</span>
                                  {(!l.payments || l.payments.length === 0) ? (
                                    <p className="text-xs text-zinc-400 font-medium italic py-2">No payment disbursements recorded for this vendor.</p>
                                  ) : (
                                    <table className="w-full text-left text-xs border-collapse">
                                      <thead>
                                        <tr className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold border-b border-zinc-200 pb-2">
                                          <th className="pb-2">Payment Date</th>
                                          <th className="pb-2">Mode & UTR / Ref</th>
                                          <th className="pb-2">Remarks / Notes</th>
                                          <th className="pb-2 text-right">Disbursed Amount</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-zinc-100">
                                        {l.payments.map((pay, pIdx) => (
                                          <tr key={pay.id || pIdx} className="hover:bg-zinc-50">
                                            <td className="py-2.5 font-mono text-[10px] text-zinc-500 font-bold">{pay.date}</td>
                                            <td className="py-2.5 font-mono">
                                              <span className="bg-zinc-100 px-2 py-0.5 rounded text-[9px] font-bold text-zinc-700 uppercase tracking-widest border border-zinc-200 mr-2">
                                                {pay.mode}
                                              </span> 
                                              {pay.ref || pay.referenceNo || '-'}
                                            </td>
                                            <td className="py-2.5 text-zinc-600">{pay.notes || '-'}</td>
                                            <td className="py-2.5 text-right font-black text-emerald-700">
                                              ₹{(parseFloat(pay.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  )}
                                </div>
                              )}

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD PAYMENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] border border-zinc-200">
            
            <div className="px-8 py-6 border-b border-zinc-200 flex justify-between items-center bg-white shrink-0">
              <div>
                <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Record Supplier Payment</h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                  Vendor: <span className="text-zinc-900 font-black">{payForm.vendorName}</span>
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 transition-colors flex items-center justify-center cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto [&::-webkit-scrollbar]:hidden bg-[#F4F4F5]">
              <form id="payForm" onSubmit={handleSavePay} className="space-y-4 bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Payment Date <span className="text-red-500">*</span></label>
                    <input type="date" required value={payForm.date} onChange={e => setPayForm({...payForm, date: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Amount (₹) <span className="text-red-500">*</span></label>
                    <input type="number" step="any" required value={payForm.amount} onChange={e => setPayForm({...payForm, amount: e.target.value})} className={`${inputClass} font-bold text-emerald-700`} placeholder="0.00" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Payment Mode</label>
                    <select 
                      value={payForm.mode} 
                      onChange={e => setPayForm({...payForm, mode: e.target.value})} 
                      className={`${inputClass} font-bold`}
                    >
                      <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                      <option value="UPI">UPI</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Cash">Cash</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>UTR / Cheque No.</label>
                    <input type="text" value={payForm.referenceNo} onChange={e => setPayForm({...payForm, referenceNo: e.target.value})} className={`${inputClass} font-mono`} placeholder="Ref number" />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Remarks / Voucher Notes</label>
                  <input type="text" value={payForm.notes} onChange={e => setPayForm({...payForm, notes: e.target.value})} className={inputClass} placeholder="e.g. Cleared invoice AP-802" />
                </div>
              </form>
            </div>

            <div className="px-8 py-5 border-t border-zinc-200 flex justify-end gap-3 bg-white shrink-0">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)} 
                className="px-6 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="payForm" 
                disabled={submitting} 
                className="px-8 py-2.5 bg-zinc-900 hover:bg-black text-white font-bold rounded-lg text-[10px] uppercase tracking-widest shadow-sm transition-all cursor-pointer disabled:opacity-50 border border-black"
              >
                {submitting ? 'Recording...' : 'Record Payment'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}