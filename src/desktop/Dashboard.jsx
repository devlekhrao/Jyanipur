import React, { useState, useEffect } from 'react';
import * as db from '../db';
import { exportToCSV } from '../utils';

export default function Dashboard({ setActivePage = () => {}, companySettings = {} }) {
  const [loading, setLoading] = useState(true);
  
  // Interactive Time Filter State
  const [timeFilter, setTimeFilter] = useState('Month');
  const todayStr = new Date().toISOString().split('T')[0];
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: todayStr
  });

  const handleTimeFilter = (filter) => {
    setTimeFilter(filter);
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    if (filter === 'Today') {
      setDateRange({ start: today, end: today });
    } else if (filter === 'Week') {
      const day = now.getDay() || 7; 
      if (day !== 1) now.setHours(now.getHours() - 24 * (day - 1));
      setDateRange({ start: now.toISOString().split('T')[0], end: today });
    } else if (filter === 'Month') {
      setDateRange({ start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0], end: today });
    } else if (filter === 'Year') {
      setDateRange({ start: new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0], end: today });
    } else if (filter === 'All Time') {
      setDateRange({ start: '2000-01-01', end: today });
    }
  };

  // Data Collections
  const [projects, setProjects] = useState([]);
  const [income, setIncome] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [pettyCash, setPettyCash] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [estimations, setEstimations] = useState([]);
  const [snags, setSnags] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [subWOs, setSubWOs] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState({});

  // Quick Action Modal States
  const [quickModal, setQuickModal] = useState(null);
  const [selectedSite, setSelectedSite] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Quick Action Form States
  const [dprData, setDprData] = useState({ date: todayStr, summary: '', loggedBy: '' });
  const [incomeData, setIncomeData] = useState({ date: todayStr, projectId: '', amount: '', paymentMode: 'NEFT/RTGS', referenceNo: '', notes: '' });
  const [snagData, setSnagData] = useState({ projectId: '', title: '', priority: 'Medium', subcontractor: '' });

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [
        projData, incData, purData, pettyData, snagDataList, invData, attData, invList, estList, subData
      ] = await Promise.all([
        db.getProjects ? db.getProjects() : Promise.resolve([]),
        db.getIncomeRecords ? db.getIncomeRecords() : Promise.resolve([]),
        db.getPurchases ? db.getPurchases() : Promise.resolve([]),
        db.getPettyCash ? db.getPettyCash() : Promise.resolve([]),
        db.getSnags ? db.getSnags() : Promise.resolve([]),
        db.getInventoryItems ? db.getInventoryItems() : Promise.resolve([]),
        db.getTodayAttendance ? db.getTodayAttendance(todayStr) : Promise.resolve({}),
        db.getInvoices ? db.getInvoices() : Promise.resolve([]),
        db.getEstimations ? db.getEstimations() : Promise.resolve([]),
        db.getSubcontractorWorkOrders ? db.getSubcontractorWorkOrders() : Promise.resolve([])
      ]);

      const activeProjects = (projData || []).filter(p => p.status !== 'Completed');
      setProjects(activeProjects);
      if (activeProjects.length > 0 && !selectedSite) {
        setSelectedSite(activeProjects[0].id || activeProjects[0]._id || '');
      }

      setIncome(incData || []);
      setPurchases((purData || []).filter(p => !p.isCancelled));
      setPettyCash(pettyData || []);
      setSnags(snagDataList || []);
      setInventory(invData || []);
      setTodayAttendance(attData || {});
      setInvoices((invList || []).filter(i => !i.isCancelled));
      setEstimations((estList || []).filter(e => !e.isCancelled));
      setSubWOs(subData || []);
    } catch (err) {
      console.error("Error syncing dashboard telemetry:", err);
    }
    setLoading(false);
  };

  useEffect(() => { loadDashboardData(); }, []);

  const parseAmt = (val) => {
    if (typeof val === 'number') return val;
    return Number(val?.toString().replace(/[^0-9.-]+/g, "")) || 0;
  };

  const isWithinRange = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr).getTime();
    const start = new Date(dateRange.start).getTime();
    const end = new Date(dateRange.end).getTime() + 86400000;
    return d >= start && d <= end;
  };

  // --- Real-time Filtered Computations ---
  const totalPortfolioBudget = projects.reduce((sum, p) => sum + parseAmt(p.budget), 0);

  const rangeIncome = income.filter(i => isWithinRange(i.date)).reduce((sum, i) => sum + parseAmt(i.amount), 0);
  const rangePurchases = purchases.filter(p => isWithinRange(p.invoiceDate || p.date)).reduce((sum, p) => sum + parseAmt(p.totalAmount), 0);
  const rangePetty = pettyCash.filter(p => (p.type === 'Expense' || !p.type) && isWithinRange(p.date)).reduce((sum, p) => sum + parseAmt(p.amount), 0);

  let rangeSubPayments = 0;
  subWOs.forEach(wo => {
    (wo.payments || []).forEach(pay => {
      if (isWithinRange(pay.date)) rangeSubPayments += parseAmt(pay.amount);
    });
  });

  const rangeInvoices = invoices.filter(i => isWithinRange(i.date)).reduce((sum, i) => sum + parseAmt(i.amount || i.totalAmount), 0);
  const rangeEstimations = estimations.filter(e => isWithinRange(e.date)).reduce((sum, e) => sum + parseAmt(e.amount || e.totalAmount), 0);

  const totalRangeOutflow = rangePurchases + rangePetty + rangeSubPayments;
  const netOperatingMargin = rangeIncome - totalRangeOutflow;

  // Chart Scaling Height Normalizer
  const chartMax = Math.max(rangeEstimations, rangeInvoices, rangeIncome, totalRangeOutflow, 1);
  const getScaledY = (val) => 200 - (180 * (val / chartMax));

  const yEst = getScaledY(rangeEstimations);
  const yInv = getScaledY(rangeInvoices);
  const yInc = getScaledY(rangeIncome);
  const yOut = getScaledY(totalRangeOutflow);

  // Workforce & Quality
  const presentStaff = Object.values(todayAttendance).filter(v => v === 'Present').length;
  const halfDayStaff = Object.values(todayAttendance).filter(v => v === 'Half Day').length;
  const absentStaff = Object.values(todayAttendance).filter(v => v === 'Absent').length;

  const openSnags = snags.filter(s => s.status === 'Open' || s.status === 'In Progress' || !s.status);
  const criticalSnags = openSnags.filter(s => s.priority === 'High' || s.priority === 'Critical');
  const lowStockItems = inventory.filter(i => {
    const stock = i.totalStock !== undefined ? i.totalStock : (i.qty || 0);
    const min = i.minThreshold !== undefined ? i.minThreshold : 5;
    return stock <= min;
  });

  // --- Quick Automated Action Handlers ---
  const handleQuickDpr = async (e) => {
    e.preventDefault();
    if (!selectedSite || !dprData.summary) return alert("Project site and work summary required.");
    setSubmitting(true);
    try {
      const selectedProj = projects.find(p => String(p.id || p._id) === String(selectedSite));
      const record = { ...dprData, projectId: selectedSite, projectName: selectedProj ? (selectedProj.name || selectedProj.projectName) : 'Site Execution' };
      if (typeof db.saveDPR === 'function') await db.saveDPR(record);
      setQuickModal(null);
      setDprData({ date: todayStr, summary: '', loggedBy: '' });
      await loadDashboardData();
      alert("Daily Progress Report logged!");
    } catch (err) { alert("Failed to submit DPR."); }
    setSubmitting(false);
  };

  const handleQuickIncome = async (e) => {
    e.preventDefault();
    const amountVal = parseAmt(incomeData.amount);
    if (!incomeData.projectId || amountVal <= 0) return alert("Valid Project site and Amount required.");
    setSubmitting(true);
    try {
      const proj = projects.find(p => String(p.id || p._id) === String(incomeData.projectId));
      const record = { ...incomeData, projectName: proj ? (proj.name || proj.projectName) : 'General Site', clientName: proj ? proj.clientName : '', amount: amountVal };
      if (typeof db.saveIncomeRecord === 'function') await db.saveIncomeRecord(record);
      setQuickModal(null);
      setIncomeData({ date: todayStr, projectId: '', amount: '', paymentMode: 'NEFT/RTGS', referenceNo: '', notes: '' });
      await loadDashboardData();
      alert(`Payment of ₹${amountVal.toLocaleString('en-IN')} logged to project revenue!`);
    } catch (err) { alert("Failed to record income."); }
    setSubmitting(false);
  };

  const handleQuickSnag = async (e) => {
    e.preventDefault();
    if (!snagData.projectId || !snagData.title) return alert("Project site and defect title required.");
    setSubmitting(true);
    try {
      const proj = projects.find(p => String(p.id || p._id) === String(snagData.projectId));
      const record = { ...snagData, projectName: proj ? (proj.name || proj.projectName) : 'Site Quality Check', status: 'Open', date: todayStr };
      if (typeof db.saveSnag === 'function') await db.saveSnag(record);
      setQuickModal(null);
      setSnagData({ projectId: '', title: '', priority: 'Medium', subcontractor: '' });
      await loadDashboardData();
      alert("Quality defect added to Punch List!");
    } catch (err) { alert("Failed to log snag."); }
    setSubmitting(false);
  };

  const handleExportOverview = () => {
    const summaryData = [
      { 'Metric': 'Date Range', 'Value': `${dateRange.start} to ${dateRange.end}` },
      { 'Metric': 'Active Sites Portfolio Budget', 'Value': totalPortfolioBudget },
      { 'Metric': 'Client Estimations Issued', 'Value': rangeEstimations },
      { 'Metric': 'Tax Invoices Raised', 'Value': rangeInvoices },
      { 'Metric': 'Realized Cash Income', 'Value': rangeIncome },
      { 'Metric': 'Material Purchases Outflow', 'Value': rangePurchases },
      { 'Metric': 'Trade Contractor Payouts', 'Value': rangeSubPayments },
      { 'Metric': 'Petty Cash & Site Outflow', 'Value': rangePetty },
      { 'Metric': 'Total Direct Outflows', 'Value': totalRangeOutflow },
      { 'Metric': 'Net Operating Cash Flow', 'Value': netOperatingMargin },
      { 'Metric': 'Open Quality Snags', 'Value': openSnags.length },
      { 'Metric': 'Critical Handover Snags', 'Value': criticalSnags.length },
      { 'Metric': 'Low Stock Inventory Items', 'Value': lowStockItems.length }
    ];
    exportToCSV(`Executive_Dashboard_Audit_${todayStr}`, summaryData);
  };

  const inputClass = "w-full px-4 py-3 rounded-lg border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 text-xs font-medium transition-all shadow-sm";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-0.5";

  return (
    <div className="w-full h-full flex flex-col font-['Inter',sans-serif]">
      
      {/* HEADER & DATE RANGE CONTROLS */}
      <div className="flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center pb-6 mb-6 border-b border-zinc-200 shrink-0 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Executive Command Center</h2>
          <p className="text-zinc-500 text-sm mt-1 font-medium">Real-time financial reconciliation, site burn rates, material inventory, and workforce telemetry.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Interactive Time Filter Pills */}
          <div className="flex gap-1 p-1 bg-zinc-100 rounded-lg border border-zinc-200">
            {['Today', 'Week', 'Month', 'Year', 'All Time'].map(filter => (
              <button 
                key={filter}
                onClick={() => handleTimeFilter(filter)}
                className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                  timeFilter === filter ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Hidden/Collapsible custom date pickers based on filter */}
          {timeFilter === 'Custom' && (
            <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-zinc-200 shadow-sm animate-in fade-in">
              <input 
                type="date" 
                value={dateRange.start} 
                onChange={e => { setDateRange({...dateRange, start: e.target.value}); setTimeFilter('Custom'); }}
                className="bg-transparent border-none text-[11px] font-bold text-zinc-800 outline-none px-2 py-1.5 cursor-pointer uppercase tracking-wider font-mono"
              />
              <span className="text-zinc-300 font-bold">-</span>
              <input 
                type="date" 
                value={dateRange.end} 
                onChange={e => { setDateRange({...dateRange, end: e.target.value}); setTimeFilter('Custom'); }}
                className="bg-transparent border-none text-[11px] font-bold text-zinc-800 outline-none px-2 py-1.5 cursor-pointer uppercase tracking-wider font-mono"
              />
            </div>
          )}

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => { if (projects.length > 0) setSelectedSite(projects[0].id || projects[0]._id); setQuickModal('dpr'); }} 
              className="h-10 px-4 bg-white border border-zinc-200 text-zinc-800 hover:bg-zinc-900 hover:text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Quick DPR
            </button>
            <button 
              onClick={() => { if (projects.length > 0) setIncomeData(prev => ({ ...prev, projectId: projects[0].id || projects[0]._id })); setQuickModal('income'); }} 
              className="h-10 px-4 bg-white border border-zinc-200 text-zinc-800 hover:bg-zinc-900 hover:text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Log Income
            </button>
            <button 
              onClick={handleExportOverview}
              className="h-10 px-4 bg-zinc-900 hover:bg-black text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-2 border border-black"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
              Audit Export
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-zinc-400 font-medium text-sm flex flex-col items-center justify-center space-y-3 flex-1">
          <div className="w-10 h-10 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin"></div>
          <p>Syncing live ERP telemetry across operations, purchasing, and finance...</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-10">
          
          {/* UNIFIED FINANCIAL METRICS STRIP (Replaces 6 detached boxes) */}
          <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-zinc-200">
            
            {/* Group 1: Pipeline */}
            <div className="flex-1 flex divide-x divide-zinc-200">
              <div className="p-5 flex-1 hover:bg-zinc-50 transition-colors cursor-pointer flex flex-col justify-between" onClick={() => setActivePage('Estimation')}>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Estimations (Bids)</span>
                <p className="text-xl font-black text-zinc-900 tracking-tight font-mono">₹ {(rangeEstimations/100000).toFixed(2)}L</p>
              </div>
              <div className="p-5 flex-1 hover:bg-zinc-50 transition-colors cursor-pointer flex flex-col justify-between" onClick={() => setActivePage('Tax Invoice')}>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Invoiced (Tax Inv)</span>
                <p className="text-xl font-black text-zinc-900 tracking-tight font-mono">₹ {(rangeInvoices/100000).toFixed(2)}L</p>
              </div>
            </div>

            {/* Group 2: Cash Flow */}
            <div className="flex-1 flex divide-x divide-emerald-200/50 bg-emerald-50/20">
              <div className="p-5 flex-1 hover:bg-emerald-50 transition-colors cursor-pointer flex flex-col justify-between" onClick={() => setActivePage('Income')}>
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest block mb-2">Cash Inflow</span>
                <p className="text-xl font-black text-emerald-800 tracking-tight font-mono">₹ {(rangeIncome/100000).toFixed(2)}L</p>
              </div>
              <div className="p-5 flex-1 hover:bg-red-50 transition-colors cursor-pointer bg-red-50/40 flex flex-col justify-between" onClick={() => setActivePage('Project P&L')}>
                <span className="text-[10px] font-bold text-red-700 uppercase tracking-widest block mb-2">Direct Outflows</span>
                <p className="text-xl font-black text-red-700 tracking-tight font-mono">₹ {(totalRangeOutflow/100000).toFixed(2)}L</p>
              </div>
            </div>

            {/* Group 3: Net Operating & Budget */}
            <div className="flex-1 flex divide-x divide-zinc-200 bg-white">
              <div className={`p-5 flex-1 transition-colors cursor-pointer flex flex-col justify-between ${netOperatingMargin >= 0 ? 'bg-zinc-900 text-white hover:bg-black' : 'bg-red-600 text-white hover:bg-red-700'}`} onClick={() => setActivePage('Project P&L')}>
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold uppercase tracking-widest block mb-2 opacity-80">Net Cash</span>
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest ${netOperatingMargin >= 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-200 border border-red-500/30'}`}>
                    {netOperatingMargin >= 0 ? 'Surplus' : 'Deficit'}
                  </span>
                </div>
                <p className="text-xl font-black tracking-tight font-mono">₹ {netOperatingMargin.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
              </div>
              <div className="p-5 flex-1 hover:bg-zinc-50 transition-colors cursor-pointer flex flex-col justify-between" onClick={() => setActivePage('Projects')}>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Portfolio Budget</span>
                <p className="text-xl font-black text-zinc-900 tracking-tight font-mono">₹ {(totalPortfolioBudget/100000).toFixed(2)}L</p>
              </div>
            </div>
          </div>

          {/* ZONE 1.5: STATIC AREA CHART (Density / Overlapping curves visual) */}
          <div className="bg-[#ebebeb] border border-zinc-300 rounded-sm p-4 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10 bg-white/80 p-2 rounded-sm mb-2 backdrop-blur-sm shadow-sm inline-block w-fit">
              <h3 className="text-[10px] font-bold text-zinc-900 uppercase tracking-widest">Pipeline Distribution Density</h3>
            </div>
            
            <div className="relative h-48 w-full mt-2">
              {/* SVG Area Chart mimicking Density Curves */}
              <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 400 200">
                
                {/* Grid Lines */}
                <g stroke="white" strokeWidth="1.5">
                  <line x1="0" y1="40" x2="400" y2="40" />
                  <line x1="0" y1="80" x2="400" y2="80" />
                  <line x1="0" y1="120" x2="400" y2="120" />
                  <line x1="0" y1="160" x2="400" y2="160" />
                  
                  <line x1="80" y1="0" x2="80" y2="200" />
                  <line x1="160" y1="0" x2="160" y2="200" />
                  <line x1="240" y1="0" x2="240" y2="200" />
                  <line x1="320" y1="0" x2="320" y2="200" />
                </g>

                {/* Density Curves */}
                {/* Blue (Outflow) - Placed in back */}
                <path 
                  d={`M 100 200 C 140 200, 180 ${yOut}, 240 ${yOut} C 310 ${yOut}, 360 200, 400 200 L 400 200 Z`} 
                  fill="rgba(122, 172, 245, 0.85)" 
                  stroke="black" 
                  strokeWidth="1.5" 
                  strokeLinejoin="round"
                  className="transition-all duration-1000"
                />
                
                {/* Orange (Invoices) */}
                <path 
                  d={`M 10 200 C 50 200, 80 ${yInv}, 120 ${yInv} C 160 ${yInv}, 180 200, 230 200 L 230 200 Z`} 
                  fill="rgba(235, 155, 145, 0.85)" 
                  stroke="black" 
                  strokeWidth="1.5" 
                  strokeLinejoin="round"
                  className="transition-all duration-1000"
                />

                {/* Teal (Income) */}
                <path 
                  d={`M -10 200 C 30 200, 60 ${yInc}, 90 ${yInc} C 120 ${yInc}, 130 180, 150 180 C 170 180, 185 ${yInc + (200-yInc)*0.7}, 200 ${yInc + (200-yInc)*0.7} C 215 ${yInc + (200-yInc)*0.7}, 235 200, 270 200 Z`} 
                  fill="rgba(88, 169, 167, 0.85)" 
                  stroke="black" 
                  strokeWidth="1.5" 
                  strokeLinejoin="round"
                  className="transition-all duration-1000"
                />

                {/* Pink/Purple (Estimations) - Placed in front */}
                <path 
                  d={`M -20 200 C 10 200, 40 ${yEst}, 60 ${yEst} C 80 ${yEst}, 100 200, 140 200 Z`} 
                  fill="rgba(195, 142, 222, 0.85)" 
                  stroke="black" 
                  strokeWidth="1.5" 
                  strokeLinejoin="round"
                  className="transition-all duration-1000"
                />
              </svg>

              {/* Y-Axis Labels matching reference scale style */}
              <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[10px] text-zinc-600 font-mono py-1 pr-1 bg-[#ebebeb]/50">
                <span>006 -</span>
                <span>004 -</span>
                <span>002 -</span>
                <span>000 -</span>
              </div>
            </div>
            
            {/* Legend mapping to our metrics */}
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-zinc-300 text-[9px] font-bold uppercase tracking-widest text-zinc-600">
              <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full border border-black bg-[#c38ede]"></span> Est</div>
              <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full border border-black bg-[#58a9a7]"></span> Inc</div>
              <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full border border-black bg-[#eb9b91]"></span> Inv</div>
              <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full border border-black bg-[#7aacf5]"></span> Out</div>
            </div>
          </div>

          {/* ZONE 2: SITE PORTFOLIO PROGRESS & WORKFORCE RADAR */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* ACTIVE SITE EXECUTION & P&L STATUS */}
            <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-xl p-6 shadow-sm flex flex-col justify-between space-y-4">
              <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
                <div>
                  <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest">Active Project Sites & Financial Realization</h3>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Budget vs Collected Inflow vs Direct Site Costs</p>
                </div>
                <button 
                  onClick={() => setActivePage('Projects')} 
                  className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
                >
                  All Projects &rarr;
                </button>
              </div>

              {projects.length === 0 ? (
                <div className="text-center text-zinc-400 text-xs font-bold uppercase tracking-widest py-12">
                  No active projects currently in execution.
                </div>
              ) : (
                <div className="space-y-4">
                  {projects.slice(0, 4).map(proj => {
                    const projId = proj.id || proj._id;
                    const siteIncome = income
                      .filter(i => String(i.projectId || i.project_id) === String(projId))
                      .reduce((s, i) => s + parseAmt(i.amount), 0);

                    const sitePurchases = purchases
                      .filter(p => String(p.projectId) === String(projId))
                      .reduce((s, p) => s + parseAmt(p.totalAmount), 0);

                    const sitePetty = pettyCash
                      .filter(p => String(p.projectId || p.project_id) === String(projId) && p.type === 'Expense')
                      .reduce((s, p) => s + parseAmt(p.amount), 0);

                    let siteSubPay = 0;
                    subWOs.filter(w => String(w.projectId) === String(projId)).forEach(wo => {
                      (wo.payments || []).forEach(pay => { siteSubPay += parseAmt(pay.amount); });
                    });

                    const totalCostSpent = sitePurchases + sitePetty + siteSubPay;
                    const totalBudget = parseAmt(proj.budget) || 1;
                    const pctCollected = Math.min(100, Math.round((siteIncome / totalBudget) * 100));

                    return (
                      <div key={projId} onClick={() => setActivePage('Project P&L')} className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 hover:bg-zinc-50 hover:border-zinc-300 transition-colors cursor-pointer">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-sm text-zinc-900 tracking-tight">
                            {proj.name || proj.projectName} 
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest ml-2">({proj.clientName || 'Client'})</span>
                          </span>
                          <span className="text-xs font-bold text-zinc-900 font-mono">
                            ₹ {siteIncome.toLocaleString('en-IN')} <span className="text-zinc-400 font-medium">/ ₹ {totalBudget.toLocaleString('en-IN')}</span>
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2 bg-zinc-200 rounded-full overflow-hidden flex">
                          <div className="bg-zinc-900 h-full transition-all duration-500" style={{ width: `${pctCollected}%` }}></div>
                        </div>

                        <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-2.5">
                          <span>Realized: <strong className="text-zinc-900">{pctCollected}%</strong></span>
                          <span>Total Costs Burned: <strong className="text-red-600 font-mono">₹ {totalCostSpent.toLocaleString('en-IN')}</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* WORKFORCE & QUALITY RADAR */}
            <div className="space-y-6">
              
              {/* ATTENDANCE TELEMETRY */}
              <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm space-y-3 hover:border-zinc-300 transition-colors cursor-pointer" onClick={() => setActivePage('Employee Attendance')}>
                <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
                  <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest">Today's Workforce Radar</h3>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Attendance &rarr;</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg">
                    <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-widest block mb-1">Present</span>
                    <span className="text-xl font-black text-emerald-800">{presentStaff}</span>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                    <span className="text-[9px] font-bold text-amber-700 uppercase tracking-widest block mb-1">Half Day</span>
                    <span className="text-xl font-black text-amber-700">{halfDayStaff}</span>
                  </div>
                  <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                    <span className="text-[9px] font-bold text-red-700 uppercase tracking-widest block mb-1">Absent</span>
                    <span className="text-xl font-black text-red-700">{absentStaff}</span>
                  </div>
                </div>
              </div>

              {/* QUALITY SNAG BAROMETER */}
              <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm space-y-3 hover:border-zinc-300 transition-colors cursor-pointer" onClick={() => setActivePage('Site Snags')}>
                <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
                  <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest">Quality & Defect Radar</h3>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Punch List &rarr;</span>
                </div>

                <div className="flex justify-between items-center bg-zinc-50 p-4 rounded-xl border border-zinc-200 mt-1">
                  <div>
                    <span className="text-xs font-bold text-zinc-900">Unresolved Site Snags</span>
                    <p className="text-[10px] text-red-600 font-bold uppercase tracking-widest mt-1">
                      {criticalSnags.length} Critical (Gated)
                    </p>
                  </div>
                  <span className="text-2xl font-black text-zinc-900">
                    {openSnags.length}
                  </span>
                </div>
              </div>

            </div>

          </div>

          {/* ZONE 3: GODOWN INVENTORY & SHORTCUT WORKFLOWS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* LOW STOCK ALERT WATCH */}
            <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm space-y-3 hover:border-zinc-300 transition-colors cursor-pointer" onClick={() => setActivePage('Inventory')}>
              <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest flex items-center gap-2">
                  <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Godown Low-Stock Watch
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Inventory &rarr;</span>
              </div>

              {lowStockItems.length === 0 ? (
                <p className="text-xs text-zinc-400 font-medium py-3 italic">All godown stock levels are optimal.</p>
              ) : (
                <div className="flex flex-wrap gap-2 pt-2">
                  {lowStockItems.map((item, idx) => (
                    <span 
                      key={item.id || idx} 
                      className={`px-3 py-1.5 border rounded-lg text-[10px] uppercase tracking-widest font-bold flex items-center gap-1.5 ${
                        item.totalStock === 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${item.totalStock === 0 ? 'bg-red-600' : 'bg-amber-600'}`}></span>
                      {item.name || item.materialName}: {item.totalStock !== undefined ? item.totalStock : (item.qty || 0)} {item.unit || 'Nos'}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* FREQUENT AUTOMATED WORKFLOW SHORTCUTS */}
            <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
              <div className="border-b border-zinc-100 pb-3 mb-3">
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest">Connected Workflows</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setActivePage('Tax Invoice')} 
                  className="p-3.5 bg-zinc-50 hover:bg-zinc-900 hover:text-white text-zinc-700 rounded-lg border border-zinc-200 hover:border-black text-[10px] font-bold uppercase tracking-widest text-left transition-all cursor-pointer flex items-center gap-2 group"
                >
                  <svg className="w-4 h-4 text-zinc-400 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Tax Invoices
                </button>
                <button 
                  onClick={() => setActivePage('Project Control')} 
                  className="p-3.5 bg-zinc-50 hover:bg-zinc-900 hover:text-white text-zinc-700 rounded-lg border border-zinc-200 hover:border-black text-[10px] font-bold uppercase tracking-widest text-left transition-all cursor-pointer flex items-center gap-2 group"
                >
                  <svg className="w-4 h-4 text-zinc-400 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  Milestones
                </button>
                <button 
                  onClick={() => setActivePage('Subcontractors')} 
                  className="p-3.5 bg-zinc-50 hover:bg-zinc-900 hover:text-white text-zinc-700 rounded-lg border border-zinc-200 hover:border-black text-[10px] font-bold uppercase tracking-widest text-left transition-all cursor-pointer flex items-center gap-2 group"
                >
                  <svg className="w-4 h-4 text-zinc-400 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  RA Bills
                </button>
                <button 
                  onClick={() => setActivePage('Project P&L')} 
                  className="p-3.5 bg-zinc-50 hover:bg-zinc-900 hover:text-white text-zinc-700 rounded-lg border border-zinc-200 hover:border-black text-[10px] font-bold uppercase tracking-widest text-left transition-all cursor-pointer flex items-center gap-2 group"
                >
                  <svg className="w-4 h-4 text-zinc-400 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Project P&L
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* QUICK DPR MODAL */}
      {quickModal === 'dpr' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-zinc-200 animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-zinc-200 flex justify-between items-center bg-white shrink-0">
              <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Quick Daily Progress Report</h2>
              <button 
                onClick={() => setQuickModal(null)} 
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-8 overflow-y-auto bg-[#F4F4F5]">
              <form id="dprForm" onSubmit={handleQuickDpr} className="space-y-5 bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                <div>
                  <label className={labelClass}>Select Site <span className="text-red-500">*</span></label>
                  <select 
                    required 
                    value={selectedSite} 
                    onChange={e => setSelectedSite(e.target.value)} 
                    className={`${inputClass} appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2318181B%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10 font-bold`}
                  >
                    {projects.map(p => (
                      <option key={p.id || p._id} value={p.id || p._id}>{p.name || p.projectName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Work Completed Summary <span className="text-red-500">*</span></label>
                  <textarea 
                    required 
                    rows="3" 
                    value={dprData.summary} 
                    onChange={e => setDprData({...dprData, summary: e.target.value})} 
                    className={`${inputClass} resize-y min-h-[90px] leading-relaxed`} 
                    placeholder="Summary of site work executed today..."
                  ></textarea>
                </div>
                <div>
                  <label className={labelClass}>Supervisor / Engineer Name</label>
                  <input 
                    type="text" 
                    value={dprData.loggedBy} 
                    onChange={e => setDprData({...dprData, loggedBy: e.target.value})} 
                    className={inputClass} 
                    placeholder="Your name..." 
                  />
                </div>
              </form>
            </div>
            <div className="px-8 py-5 border-t border-zinc-200 flex justify-end gap-3 bg-white shrink-0">
              <button 
                type="button" 
                onClick={() => setQuickModal(null)} 
                className="px-6 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-700 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="dprForm" 
                disabled={submitting} 
                className="px-8 py-2.5 bg-zinc-900 hover:bg-black text-white rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-sm border border-black cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit DPR'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK INCOME MODAL */}
      {quickModal === 'income' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-zinc-200 animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-zinc-200 flex justify-between items-center bg-white shrink-0">
              <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Log Client Payment</h2>
              <button 
                onClick={() => setQuickModal(null)} 
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-8 overflow-y-auto bg-[#F4F4F5]">
              <form id="incomeForm" onSubmit={handleQuickIncome} className="space-y-5 bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                <div>
                  <label className={labelClass}>Select Site <span className="text-red-500">*</span></label>
                  <select 
                    required 
                    value={incomeData.projectId} 
                    onChange={e => setIncomeData({...incomeData, projectId: e.target.value})} 
                    className={`${inputClass} appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2318181B%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10 font-bold`}
                  >
                    <option value="" disabled>Select active project...</option>
                    {projects.map(p => (
                      <option key={p.id || p._id} value={p.id || p._id}>
                        {p.name || p.projectName} ({p.clientName || 'Client'})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Amount (₹) <span className="text-red-500">*</span></label>
                    <input 
                      type="number" 
                      step="any" 
                      required 
                      placeholder="0.00" 
                      value={incomeData.amount} 
                      onChange={e => setIncomeData({...incomeData, amount: e.target.value})} 
                      className={`${inputClass} font-bold text-emerald-700 font-mono`} 
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Payment Mode</label>
                    <select 
                      value={incomeData.paymentMode} 
                      onChange={e => setIncomeData({...incomeData, paymentMode: e.target.value})} 
                      className={`${inputClass} font-bold`}
                    >
                      <option value="NEFT/RTGS">NEFT / RTGS</option>
                      <option value="IMPS/UPI">IMPS / UPI</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Cash">Cash</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Reference / UTR No.</label>
                  <input 
                    type="text" 
                    placeholder="Bank reference or UTR ID" 
                    value={incomeData.referenceNo} 
                    onChange={e => setIncomeData({...incomeData, referenceNo: e.target.value})} 
                    className={`${inputClass} font-mono`} 
                  />
                </div>
              </form>
            </div>
            <div className="px-8 py-5 border-t border-zinc-200 flex justify-end gap-3 bg-white shrink-0">
              <button 
                type="button" 
                onClick={() => setQuickModal(null)} 
                className="px-6 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-700 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="incomeForm" 
                disabled={submitting} 
                className="px-8 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-sm transition-all cursor-pointer disabled:opacity-50 border border-emerald-800"
              >
                {submitting ? 'Recording...' : 'Record Income'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK SNAG MODAL */}
      {quickModal === 'snag' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-zinc-200 animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-zinc-200 flex justify-between items-center bg-white shrink-0">
              <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Add Quality Snag</h2>
              <button 
                onClick={() => setQuickModal(null)} 
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-8 overflow-y-auto bg-[#F4F4F5]">
              <form id="snagForm" onSubmit={handleQuickSnag} className="space-y-5 bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                <div>
                  <label className={labelClass}>Select Site <span className="text-red-500">*</span></label>
                  <select 
                    required 
                    value={snagData.projectId} 
                    onChange={e => setSnagData({...snagData, projectId: e.target.value})} 
                    className={`${inputClass} appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2318181B%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10 font-bold`}
                  >
                    <option value="" disabled>Select active project...</option>
                    {projects.map(p => (
                      <option key={p.id || p._id} value={p.id || p._id}>{p.name || p.projectName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Defect Title <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required 
                    value={snagData.title} 
                    onChange={e => setSnagData({...snagData, title: e.target.value})} 
                    placeholder="e.g. Loose door hinge on master bed wardrobe" 
                    className={inputClass} 
                  />
                </div>
                <div>
                  <label className={labelClass}>Priority</label>
                  <select 
                    value={snagData.priority} 
                    onChange={e => setSnagData({...snagData, priority: e.target.value})} 
                    className={`${inputClass} font-bold`}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High (Critical Handover)</option>
                  </select>
                </div>
              </form>
            </div>
            <div className="px-8 py-5 border-t border-zinc-200 flex justify-end gap-3 bg-white shrink-0">
              <button 
                type="button" 
                onClick={() => setQuickModal(null)} 
                className="px-6 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-700 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="snagForm" 
                disabled={submitting} 
                className="px-8 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-sm transition-all cursor-pointer disabled:opacity-50 border border-red-800"
              >
                {submitting ? 'Logging...' : 'Log Defect'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}