import React, { useState, useEffect } from 'react';
import * as db from '../db';
import { exportToCSV } from '../utils';

const EXPENSE_CATEGORIES = [
  'Site Tea & Refreshments',
  'Rapid Hardware & Materials',
  'Fuel & Site Travel',
  'Daily Coolie & Spot Labor',
  'Debris Removal & Unloading',
  'Safety & First Aid Supplies',
  'Stationery & Site Prints',
  'Tools Repair & Blades',
  'Emergency Electrical/Plumbing',
  'Miscellaneous'
];

export default function PettyCash({ companySettings = {} }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All'); // 'All' | 'Expense' | 'Advance' | 'Pending Audit'
  const [projectFilter, setProjectFilter] = useState('All');
  const [supervisorFilter, setSupervisorFilter] = useState('All');
  
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVoucherForPrint, setSelectedVoucherForPrint] = useState(null);

  const [formData, setFormData] = useState({
    projectId: '',
    projectName: '',
    date: currentDate.toISOString().split('T')[0],
    type: 'Expense', // 'Expense' | 'Advance'
    category: 'Rapid Hardware & Materials',
    amount: '',
    description: '',
    loggedBy: '',
    voucherNo: '',
    status: 'Approved', // 'Approved' | 'Pending Audit'
    receiptUrl: '',
    receiptName: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [txns, projs, emps] = await Promise.all([
        db.getPettyCash ? db.getPettyCash() : Promise.resolve([]),
        db.getProjects ? db.getProjects() : Promise.resolve([]),
        db.getEmployees ? db.getEmployees() : Promise.resolve([])
      ]);

      const cachedTxns = JSON.parse(localStorage.getItem('jyanipur_pettycash') || '[]');
      const combined = [...(txns || [])];
      
      cachedTxns.forEach(ct => {
        if (!combined.some(t => String(t.id || t._id) === String(ct.id || ct._id))) {
          combined.push(ct);
        }
      });

      combined.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      setTransactions(combined);
      setProjects((projs || []).filter(p => p.status !== 'Completed'));
      setEmployees((emps || []).filter(e => e.status !== 'Inactive'));
    } catch (e) {
      console.error("Error loading petty cash ledger:", e);
      setTransactions([]);
      setProjects([]);
      setEmployees([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleProjectSelect = (projId) => {
    const proj = projects.find(p => String(p.id || p._id) === String(projId));
    setFormData(prev => ({
      ...prev,
      projectId: proj ? (proj.id || proj._id) : '',
      projectName: proj ? (proj.name || proj.projectName) : 'Office / General Overhead'
    }));
  };

  const handleReceiptUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          receiptUrl: reader.result,
          receiptName: file.name
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // --- AUTOMATION: ATOMIC PERSISTENCE + VAULT SYNC ---
  const handleSave = async (e) => {
    e.preventDefault();
    const amountVal = parseFloat(formData.amount);
    if (!amountVal || amountVal <= 0) {
      alert("Please enter a valid monetary amount.");
      return;
    }

    setSubmitting(true);
    try {
      const selectedProj = projects.find(p => String(p.id || p._id) === String(formData.projectId));
      const voucherNum = formData.voucherNo || `PV/${new Date().getFullYear().toString().slice(-2)}/${Date.now().toString().slice(-4)}`;

      const record = {
        id: Date.now(),
        ...formData,
        voucherNo: voucherNum,
        projectId: formData.projectId ? (Number(formData.projectId) || formData.projectId) : '',
        projectName: selectedProj ? (selectedProj.name || selectedProj.projectName) : 'Office / General Overhead',
        amount: amountVal,
        status: formData.status || 'Approved',
        category: formData.type === 'Advance' ? 'Imprest Funding' : formData.category
      };

      if (typeof db.savePettyCash === 'function') {
        await db.savePettyCash(record);
      } else {
        const cached = JSON.parse(localStorage.getItem('jyanipur_pettycash') || '[]');
        cached.unshift(record);
        localStorage.setItem('jyanipur_pettycash', JSON.stringify(cached));
      }

      // Sync receipt voucher to Central Document Vault
      if (formData.receiptUrl) {
        const vaultDoc = {
          id: Date.now() + 1,
          projectId: record.projectId || '',
          projectName: record.projectName,
          documentName: `Petty Cash Voucher #${voucherNum} - ${record.description || record.category}`,
          category: 'Site Operations',
          fileUrl: formData.receiptUrl,
          fileType: formData.receiptUrl.includes('data:application/pdf') ? 'PDF' : 'IMAGE',
          notes: `Logged by ${record.loggedBy || 'Supervisor'} on ${record.date}`,
          uploadedAt: record.date
        };

        if (typeof db.saveVaultDocument === 'function') {
          await db.saveVaultDocument(vaultDoc);
        } else {
          const vCache = JSON.parse(localStorage.getItem('jyanipur_vault_documents') || '[]');
          vCache.unshift(vaultDoc);
          localStorage.setItem('jyanipur_vault_documents', JSON.stringify(vCache));
        }
      }

      setIsModalOpen(false);
      setFormData({
        projectId: '',
        projectName: '',
        date: currentDate.toISOString().split('T')[0],
        type: 'Expense',
        category: 'Rapid Hardware & Materials',
        amount: '',
        description: '',
        loggedBy: '',
        voucherNo: '',
        status: 'Approved',
        receiptUrl: '',
        receiptName: ''
      });
      await loadData();
      alert(`Voucher ${voucherNum} recorded successfully!`);
    } catch (err) {
      console.error("Failed to save petty cash entry:", err);
      alert("Failed to save entry. Check database connection.");
    }
    setSubmitting(false);
  };

  const handleUpdateStatus = async (item, newStatus) => {
    try {
      const updatedRecord = { ...item, status: newStatus };
      if (typeof db.savePettyCash === 'function') {
        await db.savePettyCash(updatedRecord);
      } else {
        const cached = JSON.parse(localStorage.getItem('jyanipur_pettycash') || '[]');
        const updated = cached.map(t => String(t.id || t._id) === String(item.id || item._id) ? updatedRecord : t);
        localStorage.setItem('jyanipur_pettycash', JSON.stringify(updated));
      }
      await loadData();
    } catch (err) {
      console.error("Failed to update voucher status:", err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Permanently delete this petty cash transaction?")) {
      setLoading(true);
      try {
        if (typeof db.deletePettyCash === 'function') {
          await db.deletePettyCash(id);
        } else {
          const cached = JSON.parse(localStorage.getItem('jyanipur_pettycash') || '[]');
          const updated = cached.filter(t => String(t.id || t._id) !== String(id));
          localStorage.setItem('jyanipur_pettycash', JSON.stringify(updated));
        }
      } catch (err) {
        console.error("Deletion failed:", err);
      } finally {
        await loadData();
      }
    }
  };

  const handleExport = () => {
    const exportData = filteredTxns.map(t => ({
      'Voucher No': t.voucherNo || '-',
      'Date': t.date,
      'Type': t.type === 'Advance' ? 'IMPREST ADVANCE (+)' : 'SITE EXPENSE (-)',
      'Status': t.status || 'Approved',
      'Project Site': t.projectName || 'Office / General',
      'Category': t.category || '-',
      'Description / Purpose': t.description,
      'Supervisor / Staff': t.loggedBy || '-',
      'Amount (INR)': t.amount
    }));
    exportToCSV(`Petty_Cash_Register_${selectedMonth}_${selectedYear}`, exportData);
  };

  // Filter Pipeline
  const filteredTxns = transactions.filter(t => {
    if (!t.date) return false;
    const d = new Date(t.date);
    const inMonth = d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
    if (!inMonth) return false;

    if (activeTab === 'Pending Audit' && t.status !== 'Pending Audit') return false;
    if (activeTab === 'Expense' && t.type !== 'Expense') return false;
    if (activeTab === 'Advance' && t.type !== 'Advance') return false;

    if (projectFilter !== 'All' && String(t.projectId) !== String(projectFilter)) return false;
    if (supervisorFilter !== 'All' && t.loggedBy !== supervisorFilter) return false;

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (
        (t.voucherNo && t.voucherNo.toLowerCase().includes(q)) ||
        (t.projectName && t.projectName.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q)) ||
        (t.loggedBy && t.loggedBy.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // KPI Computations
  const totalAdvancesAllTime = transactions.filter(t => t.type === 'Advance').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const totalExpensesAllTime = transactions.filter(t => t.type === 'Expense').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const liveWalletBalance = totalAdvancesAllTime - totalExpensesAllTime;

  const currentMonthExpenses = filteredTxns.filter(t => t.type === 'Expense').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const currentMonthAdvances = filteredTxns.filter(t => t.type === 'Advance').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const pendingAuditCount = transactions.filter(t => t.status === 'Pending Audit').length;

  // Supervisor Imprest Breakdown Map
  const supervisorWallets = {};
  transactions.forEach(t => {
    const name = t.loggedBy || 'General Staff';
    if (!supervisorWallets[name]) supervisorWallets[name] = { advances: 0, expenses: 0 };
    if (t.type === 'Advance') supervisorWallets[name].advances += parseFloat(t.amount) || 0;
    if (t.type === 'Expense') supervisorWallets[name].expenses += parseFloat(t.amount) || 0;
  });

  const inputClass = "w-full px-4 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 text-xs font-medium transition-all shadow-sm disabled:opacity-75 disabled:cursor-not-allowed";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-0.5";

  return (
    <div className="w-full h-full flex flex-col font-['Inter',sans-serif]">
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center pb-6 mb-4 border-b border-zinc-200 shrink-0 gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Site Petty Cash & Imprest Register</h2>
          <p className="text-zinc-500 text-sm mt-1 font-medium">Spot cash advances to supervisors, site expense reconciliation, and voucher audits.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="flex items-center h-10 bg-white border border-zinc-200 rounded-lg px-3.5 shadow-sm w-full md:w-auto focus-within:ring-2 focus-within:ring-zinc-900 transition-all">
            <svg className="w-4 h-4 text-zinc-400 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              placeholder="Search voucher, site, staff..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="bg-transparent border-none text-xs font-medium text-zinc-900 outline-none w-full md:w-48 placeholder:text-zinc-400" 
            />
          </div>

          {/* Month & Year Selectors */}
          <div className="flex items-center bg-white border border-zinc-200 rounded-lg shadow-sm h-10">
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(Number(e.target.value))} 
              className="bg-transparent border-none text-[10px] font-bold uppercase tracking-widest text-zinc-900 outline-none cursor-pointer px-3 py-2.5 appearance-none"
            >
              {Array.from({length: 12}, (_, i) => (
                <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('en-US', { month: 'short' })}</option>
              ))}
            </select>
            <div className="w-[1px] h-4 bg-zinc-200"></div>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(Number(e.target.value))} 
              className="bg-transparent border-none text-[10px] font-bold uppercase tracking-widest text-zinc-900 outline-none cursor-pointer px-3 py-2.5 appearance-none"
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

          {/* Supervisor Filter */}
          <select 
            value={supervisorFilter} 
            onChange={(e) => setSupervisorFilter(e.target.value)} 
            className="h-10 bg-white border border-zinc-200 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-800 px-3 py-2 outline-none cursor-pointer shadow-sm"
          >
            <option value="All">All Supervisors</option>
            {employees.map(emp => (
              <option key={emp.id || emp._id} value={emp.fullName}>{emp.fullName}</option>
            ))}
          </select>

          <button 
            onClick={handleExport}
            className="h-10 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 px-4 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export CSV
          </button>

          <button 
            onClick={() => { 
              setFormData(prev => ({ 
                ...prev, 
                type: 'Advance', 
                category: 'Imprest Funding',
                voucherNo: `ADV/${new Date().getFullYear().toString().slice(-2)}/${Date.now().toString().slice(-4)}`
              })); 
              setIsModalOpen(true); 
            }} 
            className="h-10 bg-white border border-zinc-300 hover:border-black text-zinc-900 px-4 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Issue Float (+IN)
          </button>

          <button 
            onClick={() => { 
              setFormData(prev => ({ 
                ...prev, 
                type: 'Expense', 
                category: 'Rapid Hardware & Materials',
                voucherNo: `EXP/${new Date().getFullYear().toString().slice(-2)}/${Date.now().toString().slice(-4)}`
              })); 
              setIsModalOpen(true); 
            }} 
            className="h-10 bg-zinc-900 hover:bg-black text-white px-5 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-2 border border-black"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Log Site Expense (-OUT)
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6 shrink-0 print:hidden">
        <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest block mb-1.5">Monthly Cash Funded</span>
          <p className="text-2xl font-black text-emerald-800 tracking-tight font-mono">₹ {currentMonthAdvances.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
          <span className="text-[9px] font-bold text-emerald-700/80 uppercase tracking-widest mt-0.5">Imprest Advances to Site</span>
        </div>

        <div className="bg-red-50 border border-red-200 p-5 rounded-xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-red-700 uppercase tracking-widest block mb-1.5">Monthly Site Expenses</span>
          <p className="text-2xl font-black text-red-700 tracking-tight font-mono">₹ {currentMonthExpenses.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
          <span className="text-[9px] font-bold text-red-700/80 uppercase tracking-widest mt-0.5">Spot Hardware & Tea Outflows</span>
        </div>

        <div className="bg-white border border-zinc-200 p-5 rounded-xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">All-Time Disbursed</span>
          <p className="text-2xl font-black text-zinc-900 tracking-tight font-mono">₹ {totalExpensesAllTime.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">Total Loose Cash Spend</span>
        </div>

        <div className={`p-5 rounded-xl shadow-sm flex flex-col justify-center relative overflow-hidden ${
          liveWalletBalance >= 0 ? 'bg-zinc-900 border border-black text-white' : 'bg-red-600 border border-red-700 text-white'
        }`}>
          <svg className="absolute -right-4 -bottom-6 w-32 h-32 opacity-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-widest block mb-1.5 relative z-10 opacity-80">Floating Wallet Balance</span>
          <p className="text-2xl font-black tracking-tight relative z-10 font-mono">₹ {liveWalletBalance.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
          <span className="text-[9px] font-bold uppercase tracking-widest opacity-80 mt-0.5 relative z-10">Unspent Cash in Hands</span>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex justify-between items-center mb-4 shrink-0 print:hidden">
        <div className="flex gap-2 p-1 bg-zinc-100 rounded-lg w-fit border border-zinc-200">
          {[
            { id: 'All', label: 'All Vouchers' },
            { id: 'Expense', label: 'Site Expenses (-)' },
            { id: 'Advance', label: 'Float Inward (+)' },
            { id: 'Pending Audit', label: `Pending Audit (${pendingAuditCount})` }
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)} 
              className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                activeTab === tab.id ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
          {filteredTxns.length} Vouchers Listed
        </span>
      </div>

      {/* TRANSACTION TABLE */}
      <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden">
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1050px]">
            <thead>
              <tr className="bg-zinc-50 text-zinc-500 text-[10px] uppercase tracking-widest font-bold border-b border-zinc-200 sticky top-0 z-10">
                <th className="py-3.5 px-6 w-32">Date</th>
                <th className="py-3.5 px-6 w-36 font-mono">Voucher #</th>
                <th className="py-3.5 px-6 w-28 text-center">Type</th>
                <th className="py-3.5 px-6 w-48">Project Site</th>
                <th className="py-3.5 px-6 w-44">Category</th>
                <th className="py-3.5 px-6">Description / Purpose</th>
                <th className="py-3.5 px-6 w-36">Supervisor</th>
                <th className="py-3.5 px-6 text-right w-36">Amount</th>
                <th className="py-3.5 px-6 text-center w-32">Audit Status</th>
                <th className="py-3.5 px-6 text-right w-32">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="10" className="py-16 text-center text-zinc-400 font-medium text-xs">
                    Syncing petty cash ledger from database...
                  </td>
                </tr>
              ) : filteredTxns.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-16 text-center text-zinc-400 font-bold text-xs uppercase tracking-widest">
                    No petty cash vouchers recorded for this period.
                  </td>
                </tr>
              ) : (
                filteredTxns.map(t => (
                  <tr key={t.id || t._id} className="hover:bg-zinc-50/80 transition-colors group">
                    <td className="py-3.5 px-6 font-bold text-zinc-500 text-xs uppercase tracking-widest font-mono">{t.date}</td>
                    
                    <td className="py-3.5 px-6 font-mono text-xs font-bold text-zinc-900">
                      {t.voucherNo || `PV-${String(t.id).slice(-4)}`}
                    </td>

                    <td className="py-3.5 px-6 text-center">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border ${
                        t.type === 'Advance' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {t.type}
                      </span>
                    </td>

                    <td className="py-3.5 px-6 font-bold text-zinc-900 tracking-tight text-xs">
                      {t.projectName || 'Office / General Overhead'}
                    </td>

                    <td className="py-3.5 px-6">
                      <span className="text-[9px] font-bold text-zinc-600 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded">
                        {t.category || (t.type === 'Advance' ? 'Imprest Funding' : 'Site Expense')}
                      </span>
                    </td>

                    <td className="py-3.5 px-6 text-xs text-zinc-700 font-medium truncate max-w-[260px]">
                      {t.description}
                    </td>

                    <td className="py-3.5 px-6 text-xs font-bold text-zinc-600">
                      {t.loggedBy || 'Site Staff'}
                    </td>

                    <td className={`py-3.5 px-6 text-right font-black text-sm font-mono ${
                      t.type === 'Advance' ? 'text-emerald-700 bg-emerald-50/30' : 'text-red-600 bg-red-50/30'
                    }`}>
                      {t.type === 'Expense' ? '-' : '+'} ₹{parseFloat(t.amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                    </td>

                    <td className="py-3.5 px-6 text-center">
                      <select
                        value={t.status || 'Approved'}
                        onChange={(e) => handleUpdateStatus(t, e.target.value)}
                        className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border outline-none cursor-pointer ${
                          t.status === 'Approved' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                          t.status === 'Pending Audit' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                          'bg-red-50 text-red-700 border-red-200'
                        }`}
                      >
                        <option value="Approved">Approved</option>
                        <option value="Pending Audit">Pending Audit</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </td>

                    <td className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedVoucherForPrint(t)}
                          className="p-1.5 bg-zinc-100 hover:bg-zinc-900 hover:text-white rounded text-zinc-600 transition-all border border-zinc-200"
                          title="Print / View Payment Voucher"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                        </button>

                        {t.receiptUrl && (
                          <a 
                            href={t.receiptUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="p-1.5 bg-zinc-100 hover:bg-zinc-900 hover:text-white rounded text-zinc-600 border border-zinc-200 transition-all"
                            title="View Attached Receipt"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                          </a>
                        )}

                        <button 
                          onClick={() => handleDelete(t.id || t._id)} 
                          className="p-1.5 bg-white text-red-500 hover:bg-red-600 hover:text-white border border-red-200 shadow-sm rounded transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                          title="Delete Transaction"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- RECORD PETTY CASH VOUCHER MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] border border-zinc-200">
            
            <div className="px-8 py-6 border-b border-zinc-200 flex justify-between items-center bg-white shrink-0">
              <div>
                <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
                  {formData.type === 'Advance' ? 'Issue Imprest Float (+)' : 'Log Site Expense Voucher (-)'}
                </h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                  {formData.type === 'Advance' ? 'Transfer floating cash to site wallet' : 'Direct deduction for site loose cash purchases'}
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-8 overflow-y-auto bg-zinc-50/50">
              <div className="flex bg-white border border-zinc-200 p-1 rounded-xl mb-5 shadow-sm">
                <button 
                  type="button" 
                  onClick={() => setFormData({...formData, type: 'Expense', category: 'Rapid Hardware & Materials'})} 
                  className={`flex-1 py-1.5 rounded-lg text-[9px] uppercase tracking-widest font-bold transition-all cursor-pointer ${
                    formData.type === 'Expense' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:bg-zinc-50'
                  }`}
                >
                  Expense (-OUT)
                </button>
                <button 
                  type="button" 
                  onClick={() => setFormData({...formData, type: 'Advance', category: 'Imprest Funding'})} 
                  className={`flex-1 py-1.5 rounded-lg text-[9px] uppercase tracking-widest font-bold transition-all cursor-pointer ${
                    formData.type === 'Advance' ? 'bg-emerald-700 text-white shadow-sm' : 'text-zinc-500 hover:bg-zinc-50'
                  }`}
                >
                  Float (+IN)
                </button>
              </div>

              <form id="pettyForm" onSubmit={handleSave} className="space-y-4 bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Voucher Date <span className="text-red-500">*</span></label>
                    <input 
                      type="date" 
                      required 
                      value={formData.date} 
                      onChange={e => setFormData({...formData, date: e.target.value})} 
                      className={inputClass} 
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Amount (₹) <span className="text-red-500">*</span></label>
                    <input 
                      type="number" 
                      step="any" 
                      required 
                      value={formData.amount} 
                      onChange={e => setFormData({...formData, amount: e.target.value})} 
                      className={`${inputClass} font-bold text-zinc-900`} 
                      placeholder="0.00" 
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Cost Center / Project Site</label>
                  <select 
                    value={formData.projectId} 
                    onChange={e => handleProjectSelect(e.target.value)} 
                    className={`${inputClass} font-bold`}
                  >
                    <option value="">Office / General Overhead</option>
                    {projects.map(p => (
                      <option key={p.id || p._id} value={p.id || p._id}>
                        {p.name || p.projectName}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.type === 'Expense' && (
                  <div>
                    <label className={labelClass}>Expense Category</label>
                    <select 
                      value={formData.category} 
                      onChange={e => setFormData({...formData, category: e.target.value})} 
                      className={`${inputClass} font-bold`}
                    >
                      {EXPENSE_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className={labelClass}>Description / Purpose <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. 5 bags white cement & unloading coolie" 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                    className={inputClass} 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Supervisor / Logged By</label>
                    <input 
                      type="text" 
                      list="supervisors-datalist"
                      value={formData.loggedBy} 
                      onChange={e => setFormData({...formData, loggedBy: e.target.value})} 
                      className={inputClass} 
                      placeholder="Staff name..." 
                    />
                    <datalist id="supervisors-datalist">
                      {employees.map(emp => (
                        <option key={emp.id || emp._id} value={emp.fullName} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className={labelClass}>Verification Status</label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({...formData, status: e.target.value})}
                      className={`${inputClass} font-bold`}
                    >
                      <option value="Approved">Approved</option>
                      <option value="Pending Audit">Pending Audit</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Attach Receipt Voucher (Auto-Syncs to Vault)</label>
                  <input 
                    type="file" 
                    accept="image/*,.pdf" 
                    onChange={handleReceiptUpload} 
                    className="w-full text-xs text-zinc-600 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:text-[9px] file:font-bold file:uppercase file:bg-zinc-200 file:text-zinc-900 cursor-pointer border border-zinc-200 rounded-lg bg-zinc-50" 
                  />
                </div>
              </form>
            </div>

            <div className="px-8 py-4 border-t border-zinc-200 flex justify-end gap-2 bg-white shrink-0">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)} 
                className="px-5 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-bold uppercase tracking-widest rounded-lg text-[10px] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="pettyForm" 
                disabled={submitting} 
                className={`px-6 py-2.5 text-white font-bold uppercase tracking-widest rounded-lg text-[10px] shadow-sm transition-all cursor-pointer disabled:opacity-50 border ${
                  formData.type === 'Advance' 
                    ? 'bg-emerald-700 hover:bg-emerald-800 border-emerald-800' 
                    : 'bg-zinc-900 hover:bg-black border-black'
                }`}
              >
                {submitting ? 'Saving...' : `Save ${formData.type}`}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* --- PRINTABLE PETTY CASH VOUCHER SLIP MODAL --- */}
      {selectedVoucherForPrint && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-zinc-200 max-h-[90vh]">
            <div className="px-6 py-4 border-b border-zinc-200 bg-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-base font-bold text-zinc-900 tracking-tight">Petty Cash Payment Voucher</h3>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">
                  {selectedVoucherForPrint.voucherNo || 'PV-000'}
                </p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all cursor-pointer shadow-sm"
                >
                  Print Voucher
                </button>
                <button onClick={() => setSelectedVoucherForPrint(null)} className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 cursor-pointer">✕</button>
              </div>
            </div>

            {/* Printable A5/Voucher Layout */}
            <div className="p-8 overflow-y-auto bg-white text-zinc-900 text-xs space-y-5">
              <div className="flex justify-between items-start border-b-2 border-black pb-3">
                <div>
                  <h1 className="text-sm font-black uppercase text-black">{companySettings.companyName || 'Jyanipur Interiors & Construction'}</h1>
                  <p className="text-[9px] text-zinc-500">{companySettings.companyAddress || 'Kondapur, Hyderabad'}</p>
                </div>
                <div className="text-right font-mono">
                  <p className="text-[10px] font-bold text-black uppercase">{selectedVoucherForPrint.voucherNo || 'PV-000'}</p>
                  <p className="text-[9px] text-zinc-500">Date: {selectedVoucherForPrint.date}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-50 rounded-lg border border-zinc-200 text-xs">
                <div>
                  <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest block mb-0.5">Project / Cost Center</span>
                  <p className="font-bold text-zinc-900">{selectedVoucherForPrint.projectName || 'General Overhead'}</p>
                </div>
                <div>
                  <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest block mb-0.5">Disbursed To / Staff</span>
                  <p className="font-bold text-zinc-900">{selectedVoucherForPrint.loggedBy || 'Site Supervisor'}</p>
                </div>
              </div>

              <div className="border border-zinc-200 rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500 font-bold uppercase tracking-widest text-[9px]">Classification:</span>
                  <span className="font-bold text-zinc-900">{selectedVoucherForPrint.type === 'Advance' ? 'Imprest Floating Advance' : selectedVoucherForPrint.category}</span>
                </div>
                <div className="flex justify-between items-start text-xs border-t border-zinc-100 pt-2">
                  <span className="text-zinc-500 font-bold uppercase tracking-widest text-[9px]">Particulars / Purpose:</span>
                  <span className="font-medium text-zinc-800 text-right max-w-xs">{selectedVoucherForPrint.description}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-t-2 border-zinc-900 pt-3 mt-2">
                  <span className="font-black text-xs uppercase tracking-widest">Amount Paid:</span>
                  <span className="font-black text-base font-mono">₹ {parseFloat(selectedVoucherForPrint.amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
              </div>

              {selectedVoucherForPrint.receiptUrl && (
                <div className="p-2 border border-zinc-200 rounded-lg bg-zinc-50 text-center">
                  <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Attached Receipt Image</span>
                  <img src={selectedVoucherForPrint.receiptUrl} alt="Receipt Voucher" className="h-28 mx-auto object-contain rounded" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-zinc-200 text-[10px]">
                <div>
                  <div className="border-t border-black w-36 pt-1 mt-6">
                    <p className="font-bold text-black uppercase">Receiver Signature</p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <div className="border-t border-black w-36 pt-1 mt-6 text-right">
                    <p className="font-bold text-black uppercase">Authorized Approver</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}