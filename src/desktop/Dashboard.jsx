import React, { useState, useEffect } from 'react';
import { 
  getProjects, 
  getIncomeRecords, 
  getPettyCash, 
  getEmployeeExpenses, 
  getSnags, 
  getInventoryItems, 
  getTodayAttendance,
  saveDPR,
  saveIncomeRecord,
  saveSnag
} from '../db';

export default function Dashboard({ setActivePage }) {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [income, setIncome] = useState([]);
  const [pettyCash, setPettyCash] = useState([]);
  const [staffExpenses, setStaffExpenses] = useState([]);
  const [snags, setSnags] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState({});

  // Quick Action Modals
  const [quickModal, setQuickModal] = useState(null); // 'dpr', 'income', 'snag'
  const [selectedSite, setSelectedSite] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Quick Forms
  const todayStr = new Date().toISOString().split('T')[0];
  const [dprData, setDprData] = useState({ date: todayStr, summary: '', loggedBy: '' });
  const [incomeData, setIncomeData] = useState({ date: todayStr, projectId: '', amount: '', paymentMode: 'NEFT/RTGS', referenceNo: '' });
  const [snagData, setSnagData] = useState({ projectId: '', title: '', priority: 'Medium', subcontractor: '' });

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [
        projData, 
        incData, 
        pettyData, 
        empExpData, 
        snagDataList, 
        invData, 
        attData
      ] = await Promise.all([
        getProjects(),
        getIncomeRecords(),
        getPettyCash(),
        getEmployeeExpenses(),
        getSnags(),
        getInventoryItems(),
        getTodayAttendance(todayStr)
      ]);

      const activeProjects = (projData || []).filter(p => p.status !== 'Completed');
      setProjects(activeProjects);
      if (activeProjects.length > 0) {
        setSelectedSite(activeProjects[0].id || activeProjects[0]._id || '');
      }

      setIncome(incData || []);
      setPettyCash(pettyData || []);
      setStaffExpenses(empExpData || []);
      setSnags(snagDataList || []);
      setInventory(invData || []);
      setTodayAttendance(attData || {});
    } catch (err) {
      console.error("Error syncing dashboard telemetry with Neon DB:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const parseAmt = (val) => Number(val?.toString().replace(/[^0-9.-]+/g, "")) || 0;

  // --- Financial Computations ---
  const totalPortfolioBudget = projects.reduce((sum, p) => sum + parseAmt(p.budget), 0);

  const thisMonthIncome = income.filter(i => {
    if (!i.date) return true;
    const d = new Date(i.date);
    return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
  }).reduce((sum, i) => sum + parseAmt(i.amount), 0);

  const thisMonthPetty = pettyCash.filter(p => p.type === 'Expense' || !p.type).reduce((sum, p) => sum + parseAmt(p.amount), 0);
  const thisMonthStaffExp = staffExpenses.reduce((sum, e) => sum + parseAmt(e.amount), 0);

  const totalMonthlyOutflow = thisMonthPetty + thisMonthStaffExp;
  const netOperatingMargin = thisMonthIncome - totalMonthlyOutflow;

  // Attendance Metrics
  const presentStaff = Object.values(todayAttendance).filter(v => v === 'Present').length;
  const halfDayStaff = Object.values(todayAttendance).filter(v => v === 'Half Day').length;
  const absentStaff = Object.values(todayAttendance).filter(v => v === 'Absent').length;

  // Snag & Inventory Alerts
  const openSnags = snags.filter(s => s.status === 'Open' || s.status === 'In Progress' || !s.status);
  const criticalSnags = openSnags.filter(s => s.priority === 'High');
  const lowStockItems = inventory.filter(i => (i.totalStock !== undefined ? i.totalStock : (i.qty || 0)) <= 5);

  // --- Handlers for Quick Action Modals ---
  const handleQuickDpr = async (e) => {
    e.preventDefault();
    if (!selectedSite || !dprData.summary) return alert("Site and summary required.");
    setSubmitting(true);
    try {
      await saveDPR({ ...dprData, projectId: selectedSite });
      setQuickModal(null);
      setDprData({ date: todayStr, summary: '', loggedBy: '' });
      await loadDashboardData();
    } catch (err) {
      alert("Failed to submit DPR.");
    }
    setSubmitting(false);
  };

  const handleQuickIncome = async (e) => {
    e.preventDefault();
    if (!incomeData.projectId || !incomeData.amount) return alert("Site and Amount required.");
    const proj = projects.find(p => String(p.id || p._id) === String(incomeData.projectId));
    setSubmitting(true);
    try {
      await saveIncomeRecord({
        ...incomeData,
        projectName: proj ? (proj.name || proj.projectName) : 'General Site',
        clientName: proj ? proj.clientName : '',
        amount: parseAmt(incomeData.amount)
      });
      setQuickModal(null);
      setIncomeData({ date: todayStr, projectId: '', amount: '', paymentMode: 'NEFT/RTGS', referenceNo: '' });
      await loadDashboardData();
    } catch (err) {
      alert("Failed to record income.");
    }
    setSubmitting(false);
  };

  const handleQuickSnag = async (e) => {
    e.preventDefault();
    if (!snagData.projectId || !snagData.title) return alert("Site and Defect Title required.");
    setSubmitting(true);
    try {
      await saveSnag(snagData);
      setQuickModal(null);
      setSnagData({ projectId: '', title: '', priority: 'Medium', subcontractor: '' });
      await loadDashboardData();
    } catch (err) {
      alert("Failed to log snag.");
    }
    setSubmitting(false);
  };

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-inset focus:ring-[#B45309] text-zinc-900 text-sm font-medium transition-all shadow-sm";
  const labelClass = "block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 ml-0.5";

  return (
    <div className="w-full h-full flex flex-col" style={{ fontFamily: 'Poppins, sans-serif' }}>
      
      {/* HEADER & GLOBAL CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 mb-6 border-b border-zinc-200 shrink-0 gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Executive Command Center</h2>
          <p className="text-zinc-500 text-sm mt-0.5 font-medium">Real-time overview of active portfolio, cash flow, site operations, and inventory.</p>
        </div>

        {/* QUICK ACTION BUTTONS */}
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => {
              if (projects.length > 0) setSelectedSite(projects[0].id || projects[0]._id);
              setQuickModal('dpr');
            }} 
            className="px-3.5 py-2 bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
          >
            <span className="text-sm text-[#B45309]">📝</span> + Quick DPR
          </button>
          <button 
            onClick={() => {
              if (projects.length > 0) setIncomeData(prev => ({ ...prev, projectId: projects[0].id || projects[0]._id }));
              setQuickModal('income');
            }} 
            className="px-3.5 py-2 bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
          >
            <span className="text-sm text-emerald-600">💰</span> + Log Income
          </button>
          <button 
            onClick={() => {
              if (projects.length > 0) setSnagData(prev => ({ ...prev, projectId: projects[0].id || projects[0]._id }));
              setQuickModal('snag');
            }} 
            className="px-3.5 py-2 bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
          >
            <span className="text-sm text-red-500">⚠️</span> + Add Snag
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-zinc-400 font-medium text-sm flex flex-col items-center justify-center space-y-3 flex-1">
          <div className="w-10 h-10 border-4 border-zinc-200 border-t-[#B45309] rounded-full animate-spin"></div>
          <p>Syncing command center telemetry...</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          
          {/* ZONE 1: EXECUTIVE KPI DECK */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white border border-zinc-200 p-5 rounded-2xl shadow-sm flex flex-col justify-center">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Active Sites Portfolio</span>
                <span className="text-xs font-bold bg-amber-50 text-[#B45309] px-2 py-0.5 rounded border border-amber-200/60">{projects.length} Sites</span>
              </div>
              <p className="text-xl font-bold text-zinc-900">₹ {totalPortfolioBudget.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
              <span className="text-xs font-medium text-zinc-400 mt-1">Total Contract Budget</span>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl shadow-sm flex flex-col justify-center">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block mb-1">Collections (This Month)</span>
              <p className="text-xl font-bold text-emerald-700">₹ {thisMonthIncome.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
              <span className="text-xs font-semibold text-emerald-600/80 mt-1">Client Milestone Payments</span>
            </div>

            <div className="bg-white border border-red-200/80 p-5 rounded-2xl shadow-sm flex flex-col justify-center">
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest block mb-1">Direct Outflow (This Month)</span>
              <p className="text-xl font-bold text-red-500">₹ {totalMonthlyOutflow.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
              <span className="text-xs font-medium text-zinc-400 mt-1">Petty Cash + Staff Expenses</span>
            </div>

            <div className="bg-white border border-amber-200/80 p-5 rounded-2xl shadow-sm flex flex-col justify-center">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold text-[#B45309] uppercase tracking-widest">Net Operating Cash</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${netOperatingMargin >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                  {netOperatingMargin >= 0 ? 'Surplus' : 'Deficit'}
                </span>
              </div>
              <p className="text-xl font-bold text-[#B45309]">₹ {netOperatingMargin.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
              <span className="text-xs font-medium text-zinc-400 mt-1">Net Monthly Liquidity</span>
            </div>
          </div>

          {/* ZONE 2: SITE PORTFOLIO & WORKFORCE RADAR */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* LEFT 2 COLUMNS: ACTIVE PROJECTS & P&L STATUS */}
            <div className="lg:col-span-2 bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
              <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Active Site Progress & P&L Utilization</h3>
                <button onClick={() => setActivePage('Projects')} className="text-xs font-semibold text-[#B45309] hover:underline cursor-pointer">
                  View All Sites &rarr;
                </button>
              </div>

              {projects.length === 0 ? (
                <div className="text-center text-zinc-400 text-sm font-medium py-10">No active projects running.</div>
              ) : (
                <div className="space-y-4">
                  {projects.slice(0, 4).map(proj => {
                    const projId = proj.id || proj._id;
                    const siteIncome = income.filter(i => String(i.projectId || i.project_id) === String(projId)).reduce((s, i) => s + parseAmt(i.amount), 0);
                    const sitePetty = pettyCash.filter(p => String(p.projectId || p.project_id) === String(projId)).reduce((s, p) => s + parseAmt(p.amount), 0);
                    const totalBudget = parseAmt(proj.budget) || 1;
                    const pctCollected = Math.min(100, Math.round((siteIncome / totalBudget) * 100));

                    return (
                      <div key={projId} className="p-4 rounded-xl border border-zinc-100 bg-zinc-50/50 hover:bg-zinc-50 transition-colors">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="font-bold text-sm text-zinc-900">{proj.name || proj.projectName} <span className="text-xs text-zinc-400 font-normal">({proj.clientName || 'Client'})</span></span>
                          <span className="text-xs font-bold text-[#B45309]">₹ {siteIncome.toLocaleString('en-IN')} / ₹ {totalBudget.toLocaleString('en-IN')}</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2.5 bg-zinc-200 rounded-full overflow-hidden flex">
                          <div className="bg-[#B45309] h-full transition-all duration-500" style={{ width: `${pctCollected}%` }}></div>
                        </div>

                        <div className="flex justify-between items-center text-[11px] font-medium text-zinc-500 mt-2">
                          <span>Collected: <strong>{pctCollected}%</strong></span>
                          <span>Site Petty Cash Spent: <strong className="text-red-500">₹ {sitePetty.toLocaleString('en-IN')}</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: WORKFORCE & SNAG RADAR */}
            <div className="space-y-6">
              
              {/* TODAY'S ATTENDANCE SUMMARY */}
              <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
                  <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Today's Attendance Radar</h3>
                  <button onClick={() => setActivePage('Employee Attendance')} className="text-xs font-semibold text-[#B45309] hover:underline cursor-pointer">
                    Manage &rarr;
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase block">Present</span>
                    <span className="text-lg font-bold text-emerald-700">{presentStaff}</span>
                  </div>
                  <div className="bg-amber-50 border border-amber-200/60 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-[#B45309] uppercase block">Half Day</span>
                    <span className="text-lg font-bold text-[#B45309]">{halfDayStaff}</span>
                  </div>
                  <div className="bg-red-50 border border-red-100 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-red-500 uppercase block">Absent</span>
                    <span className="text-lg font-bold text-red-500">{absentStaff}</span>
                  </div>
                </div>
              </div>

              {/* QUALITY SNAG BAROMETER */}
              <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
                  <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Handover Quality Snags</h3>
                  <button onClick={() => setActivePage('Site Snags')} className="text-xs font-semibold text-[#B45309] hover:underline cursor-pointer">
                    Punch List &rarr;
                  </button>
                </div>

                <div className="flex justify-between items-center bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                  <div>
                    <span className="text-xs font-bold text-zinc-800">Total Unresolved Snags</span>
                    <p className="text-[11px] text-zinc-400 font-medium">{criticalSnags.length} Critical High-Priority</p>
                  </div>
                  <span className="text-xl font-bold text-red-500 bg-red-50 border border-red-200 px-3 py-1 rounded-xl">
                    {openSnags.length}
                  </span>
                </div>
              </div>

            </div>

          </div>

          {/* ZONE 3: GODOWN INVENTORY & VENDOR ALERTS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* LOW STOCK ALERT WATCH */}
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span>📦</span> Godown Low-Stock Watch
                </h3>
                <button onClick={() => setActivePage('Inventory')} className="text-xs font-semibold text-[#B45309] hover:underline cursor-pointer">
                  Godown &rarr;
                </button>
              </div>

              {lowStockItems.length === 0 ? (
                <p className="text-xs text-zinc-400 italic font-medium py-3">All material stock levels healthy in central storage.</p>
              ) : (
                <div className="flex flex-wrap gap-2 pt-1">
                  {lowStockItems.map((item, idx) => (
                    <span key={item.id || idx} className="px-3 py-1 bg-amber-50 text-[#B45309] border border-amber-200/60 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                      <strong>{item.name || item.materialName}</strong>: {item.totalStock !== undefined ? item.totalStock : (item.qty || 0)} {item.unit || 'Pcs'}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* QUICK LINK HUB */}
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <div className="border-b border-zinc-100 pb-2">
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Frequent Workflows</h3>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3">
                <button onClick={() => setActivePage('Tax Invoice')} className="p-3 bg-zinc-50 hover:bg-amber-50 hover:border-amber-200 text-zinc-800 rounded-xl border border-zinc-200 text-xs font-semibold text-left transition-all cursor-pointer">
                  📑 Draft Tax Invoice
                </button>
                <button onClick={() => setActivePage('Purchase Orders')} className="p-3 bg-zinc-50 hover:bg-amber-50 hover:border-amber-200 text-zinc-800 rounded-xl border border-zinc-200 text-xs font-semibold text-left transition-all cursor-pointer">
                  🛒 Issue Purchase Order
                </button>
                <button onClick={() => setActivePage('Subcontractors')} className="p-3 bg-zinc-50 hover:bg-amber-50 hover:border-amber-200 text-zinc-800 rounded-xl border border-zinc-200 text-xs font-semibold text-left transition-all cursor-pointer">
                  👷 Subcontractor Ledgers
                </button>
                <button onClick={() => setActivePage('Project P&L')} className="p-3 bg-zinc-50 hover:bg-amber-50 hover:border-amber-200 text-zinc-800 rounded-xl border border-zinc-200 text-xs font-semibold text-left transition-all cursor-pointer">
                  📈 Project P&L Report
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* QUICK DPR MODAL */}
      {quickModal === 'dpr' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
              <h2 className="text-xl font-semibold text-zinc-900">Quick Daily Report (DPR)</h2>
              <button onClick={() => setQuickModal(null)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
                ✕
              </button>
            </div>
            <form onSubmit={handleQuickDpr} className="p-6 space-y-4">
              <div>
                <label className={labelClass}>Select Site <span className="text-red-500">*</span></label>
                <select required value={selectedSite} onChange={e => setSelectedSite(e.target.value)} className={inputClass}>
                  {projects.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name || p.projectName}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Work Completed Summary <span className="text-red-500">*</span></label>
                <textarea required rows="3" value={dprData.summary} onChange={e => setDprData({...dprData, summary: e.target.value})} className={`${inputClass} resize-y min-h-[80px]`} placeholder="Summary of site work executed today..."></textarea>
              </div>
              <div>
                <label className={labelClass}>Supervisor Name</label>
                <input type="text" value={dprData.loggedBy} onChange={e => setDprData({...dprData, loggedBy: e.target.value})} className={inputClass} placeholder="Your name..." />
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-zinc-200">
                <button type="button" onClick={() => setQuickModal(null)} className="px-5 py-2.5 bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-semibold rounded-xl text-sm transition-all cursor-pointer">Cancel</button>
                <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-[#B45309] hover:bg-[#92400E] text-white font-medium rounded-xl text-sm shadow-sm transition-all cursor-pointer disabled:opacity-50">
                  {submitting ? 'Submitting...' : 'Submit DPR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK INCOME MODAL */}
      {quickModal === 'income' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
              <h2 className="text-xl font-semibold text-zinc-900">Log Client Payment</h2>
              <button onClick={() => setQuickModal(null)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
                ✕
              </button>
            </div>
            <form onSubmit={handleQuickIncome} className="p-6 space-y-4">
              <div>
                <label className={labelClass}>Select Site <span className="text-red-500">*</span></label>
                <select required value={incomeData.projectId} onChange={e => setIncomeData({...incomeData, projectId: e.target.value})} className={inputClass}>
                  <option value="" disabled>Select active project...</option>
                  {projects.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name || p.projectName} ({p.clientName || 'Client'})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Amount (₹) <span className="text-red-500">*</span></label>
                  <input type="number" step="any" required placeholder="0.00" value={incomeData.amount} onChange={e => setIncomeData({...incomeData, amount: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Payment Mode</label>
                  <select value={incomeData.paymentMode} onChange={e => setIncomeData({...incomeData, paymentMode: e.target.value})} className={inputClass}>
                    <option value="NEFT/RTGS">NEFT / RTGS</option>
                    <option value="IMPS/UPI">IMPS / UPI</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Reference / Transaction No.</label>
                <input type="text" placeholder="UTR or Txn ID" value={incomeData.referenceNo} onChange={e => setIncomeData({...incomeData, referenceNo: e.target.value})} className={inputClass} />
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-zinc-200">
                <button type="button" onClick={() => setQuickModal(null)} className="px-5 py-2.5 bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-semibold rounded-xl text-sm transition-all cursor-pointer">Cancel</button>
                <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-sm shadow-sm transition-all cursor-pointer disabled:opacity-50">
                  {submitting ? 'Recording...' : 'Record Income'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK SNAG MODAL */}
      {quickModal === 'snag' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
              <h2 className="text-xl font-semibold text-zinc-900">Add Quality Snag</h2>
              <button onClick={() => setQuickModal(null)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
                ✕
              </button>
            </div>
            <form onSubmit={handleQuickSnag} className="p-6 space-y-4">
              <div>
                <label className={labelClass}>Select Site <span className="text-red-500">*</span></label>
                <select required value={snagData.projectId} onChange={e => setSnagData({...snagData, projectId: e.target.value})} className={inputClass}>
                  <option value="" disabled>Select active project...</option>
                  {projects.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name || p.projectName}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Defect Title <span className="text-red-500">*</span></label>
                <input type="text" required value={snagData.title} onChange={e => setSnagData({...snagData, title: e.target.value})} placeholder="e.g. Loose door hinge on master bed wardrobe" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Priority</label>
                <select value={snagData.priority} onChange={e => setSnagData({...snagData, priority: e.target.value})} className={inputClass}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High (Critical Handover)</option>
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-zinc-200">
                <button type="button" onClick={() => setQuickModal(null)} className="px-5 py-2.5 bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-semibold rounded-xl text-sm transition-all cursor-pointer">Cancel</button>
                <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl text-sm shadow-sm transition-all cursor-pointer disabled:opacity-50">
                  {submitting ? 'Logging...' : 'Log Defect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}