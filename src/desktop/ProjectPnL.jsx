import React, { useState, useEffect } from 'react';
import { 
  getProjects, getInvoices, getIncomeRecords, getSubcontractorWorkOrders, 
  getPettyCash, getEstimations, getClientWorkOrders 
} from '../db';

export default function ProjectPnL() {
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('overview'); // 'overview' or 'detail'
  
  const [masterPnLList, setMasterPnLList] = useState([]);
  const [globalTotals, setGlobalTotals] = useState({ income: 0, cost: 0, profit: 0 });
  const [activeProject, setActiveProject] = useState(null);

  const loadGlobalData = async () => {
    setLoading(true);
    try {
      // 1. Fetch EVERYTHING at once for maximum speed
      const [projs, invoices, incomes, subWOs, petty, ests, clientWOs] = await Promise.all([
        getProjects(),
        getInvoices ? getInvoices() : Promise.resolve([]),
        getIncomeRecords ? getIncomeRecords() : Promise.resolve([]),
        getSubcontractorWorkOrders ? getSubcontractorWorkOrders() : Promise.resolve([]),
        getPettyCash ? getPettyCash() : Promise.resolve([]),
        getEstimations ? getEstimations() : Promise.resolve([]),
        getClientWorkOrders ? getClientWorkOrders() : Promise.resolve([])
      ]);

      const activeProjects = (projs || []).filter(proj => proj.status !== 'Completed');

      let globalInc = 0;
      let globalCst = 0;
      let globalNet = 0;

      // 2. Crunch P&L for EVERY project simultaneously
      const crunchedData = activeProjects.map(proj => {
        const pId = String(proj.id || proj._id);

        // Revenue
        const projEsts = ests.filter(e => e.clientName === proj.clientName && e.status !== 'Rejected');
        const estTotal = projEsts.reduce((sum, e) => sum + (Number(e.totalAmount) || 0), 0);
        
        const projClientWOs = clientWOs.filter(w => w.projectName === proj.name && !w.isCancelled);
        const clientWoTotal = projClientWOs.reduce((sum, w) => sum + (Number(w.totalAmount) || 0), 0);

        const projInvoices = invoices.filter(i => (i.client === proj.clientName || i.projectName === proj.name) && !i.isCancelled);
        const invoicedTotal = projInvoices.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

        const projIncomes = incomes.filter(i => String(i.projectId) === pId);
        const incomeCollected = projIncomes.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

        // Costs
        const projSubWOs = subWOs.filter(w => String(w.projectId) === pId || w.projectName === proj.name);
        const subAllocated = projSubWOs.reduce((sum, w) => sum + (Number(w.contractValue) || 0), 0);
        const subPaid = projSubWOs.reduce((sum, w) => sum + (Number(w.totalPaid) || 0), 0);

        const projPetty = petty.filter(p => String(p.projectId) === pId && p.type === 'Expense');
        const pettyExpenses = projPetty.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        const totalActualCost = subPaid + pettyExpenses;
        const netProfit = incomeCollected - totalActualCost;
        const margin = incomeCollected > 0 ? ((netProfit / incomeCollected) * 100).toFixed(1) : 0;

        // Transactions Feed (For detailed view)
        const txns = [
          ...projIncomes.map(i => ({ id: `inc_${i.id}`, date: i.date, type: 'Income', amount: i.amount, desc: `Payment Received: ${i.paymentMode}`, isCredit: true })),
          ...projPetty.map(p => ({ id: `exp_${p.id}`, date: p.date, type: 'Site Expense', amount: p.amount, desc: p.description, isCredit: false }))
        ];
        projSubWOs.forEach(wo => {
          (wo.payments || []).forEach(pay => {
            txns.push({ id: `subpay_${pay.id}`, date: pay.date, type: 'Sub Payment', amount: pay.amount, desc: `Paid to ${wo.subName} (${wo.trade})`, isCredit: false });
          });
        });
        txns.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Add to Global Totals
        globalInc += incomeCollected;
        globalCst += totalActualCost;
        globalNet += netProfit;

        return {
          ...proj,
          budget: Number(proj.budget) || 0,
          estimationsTotal: estTotal || clientWoTotal, 
          invoicedTotal,
          incomeCollected,
          subcontractorAllocated: subAllocated,
          subcontractorPaid: subPaid,
          pettyCashExpenses: pettyExpenses,
          totalCost: totalActualCost,
          netProfit,
          margin,
          recentTransactions: txns.slice(0, 15)
        };
      });

      // Sort by Highest Net Profit
      crunchedData.sort((a, b) => b.netProfit - a.netProfit);

      setMasterPnLList(crunchedData);
      setGlobalTotals({ income: globalInc, cost: globalCst, profit: globalNet });

    } catch (err) {
      console.error("Error crunching master P&L data:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadGlobalData();
  }, []);

  const handleViewDetail = (projectData) => {
    setActiveProject(projectData);
    setCurrentView('detail');
  };

  const handleBackToOverview = () => {
    setActiveProject(null);
    setCurrentView('overview');
  };

  // ==========================================
  // VIEW 1: GLOBAL MASTERBOARD (All Projects)
  // ==========================================
  if (currentView === 'overview') {
    return (
      <div className="w-full h-full flex flex-col bg-zinc-50 print:bg-white print:p-0" style={{ fontFamily: 'Poppins, sans-serif' }}>
        
        {/* HEADER & CONTROLS */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 mb-6 border-b border-zinc-200 shrink-0 gap-4 print:hidden">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Master P&L Overview</h2>
            <p className="text-zinc-500 text-sm mt-0.5 font-medium">Compare profits and losses across all active projects instantly.</p>
          </div>
          <button onClick={() => window.print()} className="bg-[#B45309] hover:bg-[#92400E] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer flex items-center gap-1.5 h-10">
            🖨️ Print Master Report
          </button>
        </div>

        {/* PRINT ONLY HEADER */}
        <div className="hidden print:block border-b-2 border-zinc-800 pb-4 mb-6">
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight uppercase">Company Master P&L Report</h1>
          <p className="text-xs text-zinc-500 font-medium mt-1">Generated on: {new Date().toLocaleDateString()}</p>
        </div>

        {loading ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-sm flex flex-col items-center justify-center space-y-3 flex-1">
            <div className="w-10 h-10 border-4 border-zinc-200 border-t-[#B45309] rounded-full animate-spin"></div>
            <p>Crunching financial records across all projects...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-10">
            
            {/* COMPANY GLOBAL TOTALS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl shadow-sm flex flex-col justify-center relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 text-emerald-100 opacity-50 text-6xl">📈</div>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest block mb-1 relative z-10">Total Company Income</span>
                <p className="text-3xl font-black text-emerald-800 relative z-10">₹ {globalTotals.income.toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-red-50 border border-red-100 p-6 rounded-2xl shadow-sm flex flex-col justify-center relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 text-red-100 opacity-50 text-6xl">📉</div>
                <span className="text-xs font-bold text-red-700 uppercase tracking-widest block mb-1 relative z-10">Total Company Expenses</span>
                <p className="text-3xl font-black text-red-800 relative z-10">₹ {globalTotals.cost.toLocaleString('en-IN')}</p>
              </div>
              <div className={`p-6 rounded-2xl shadow-sm border flex flex-col justify-center relative overflow-hidden ${
                globalTotals.profit >= 0 ? 'bg-[#B45309] border-[#B45309] text-white' : 'bg-red-600 border-red-600 text-white'
              }`}>
                <span className="text-xs font-bold uppercase tracking-widest block mb-1 opacity-90 relative z-10">Net Company Profit</span>
                <p className="text-3xl font-black relative z-10">₹ {globalTotals.profit.toLocaleString('en-IN')}</p>
              </div>
            </div>

            {/* MASTER PROJECT TABLE */}
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-zinc-100 bg-zinc-50/50 flex justify-between items-center">
                <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest">All Active Projects</h3>
                <span className="text-xs font-semibold text-zinc-500 bg-white px-2.5 py-1 rounded-lg border border-zinc-200">{masterPnLList.length} Projects</span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1000px]">
                  <thead>
                    <tr className="text-zinc-500 text-[10px] uppercase tracking-wider border-b border-zinc-100">
                      <th className="py-4 px-6 font-bold w-64">Project Name & Client</th>
                      <th className="py-4 px-6 font-bold text-right">Target Budget</th>
                      <th className="py-4 px-6 font-bold text-right text-emerald-700">Income In</th>
                      <th className="py-4 px-6 font-bold text-right text-red-500">Costs Out</th>
                      <th className="py-4 px-6 font-bold text-right">Net Profit</th>
                      <th className="py-4 px-6 font-bold text-right">Margin %</th>
                      <th className="py-4 px-6 font-bold text-center">Status</th>
                      <th className="py-4 px-6 font-bold text-right print:hidden">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50 text-sm">
                    {masterPnLList.map(proj => (
                      <tr key={proj.id} className="hover:bg-amber-50/30 transition-colors group">
                        <td className="py-4 px-6">
                          <p className="font-bold text-zinc-900 truncate max-w-[200px]">{proj.name || proj.projectName}</p>
                          <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mt-0.5">{proj.clientName}</p>
                        </td>
                        <td className="py-4 px-6 text-right font-semibold text-zinc-600">
                          ₹ {proj.budget.toLocaleString('en-IN')}
                        </td>
                        <td className="py-4 px-6 text-right font-bold text-emerald-600">
                          ₹ {proj.incomeCollected.toLocaleString('en-IN')}
                        </td>
                        <td className="py-4 px-6 text-right font-bold text-red-500">
                          ₹ {proj.totalCost.toLocaleString('en-IN')}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className={`px-2.5 py-1 rounded text-xs font-bold ${
                            proj.netProfit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {proj.netProfit >= 0 ? '+' : ''}₹ {proj.netProfit.toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right font-black">
                          <span className={`${proj.margin >= 15 ? 'text-emerald-600' : proj.margin > 0 ? 'text-amber-500' : 'text-red-500'}`}>
                            {proj.margin}%
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                            proj.status === 'Ongoing' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {proj.status || 'Planning'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right print:hidden">
                          <button 
                            onClick={() => handleViewDetail(proj)} 
                            className="px-3 py-1.5 bg-zinc-100 hover:bg-[#B45309] text-zinc-700 hover:text-white border border-zinc-200 hover:border-[#B45309] rounded-lg font-bold cursor-pointer text-[10px] uppercase tracking-widest transition-all"
                          >
                            View Report
                          </button>
                        </td>
                      </tr>
                    ))}
                    {masterPnLList.length === 0 && (
                      <tr>
                        <td colSpan="8" className="py-12 text-center text-zinc-400 font-medium text-sm">
                          No active projects found. Add projects in the Projects module.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW 2: SINGLE PROJECT RICH DASHBOARD
  // ==========================================
  if (currentView === 'detail' && activeProject) {
    return (
      <div className="w-full h-full flex flex-col bg-zinc-50 print:bg-white print:p-0" style={{ fontFamily: 'Poppins, sans-serif' }}>
        
        {/* HEADER & CONTROLS */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 mb-6 border-b border-zinc-200 shrink-0 gap-4 print:hidden">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">{activeProject.name || activeProject.projectName}</h2>
            <p className="text-[#B45309] text-xs font-bold uppercase tracking-widest mt-1">Client: {activeProject.clientName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleBackToOverview} className="text-zinc-600 hover:text-zinc-900 text-xs font-bold transition-colors cursor-pointer bg-white px-4 py-2.5 rounded-xl border border-zinc-200 shadow-sm flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              All Projects
            </button>
            <button onClick={() => window.print()} className="bg-[#B45309] hover:bg-[#92400E] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer flex items-center gap-1.5">
              🖨️ Print
            </button>
          </div>
        </div>

        {/* PRINT ONLY HEADER */}
        <div className="hidden print:block border-b-2 border-zinc-800 pb-4 mb-6">
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight uppercase">Project Profit & Loss Report</h1>
          <p className="text-sm font-semibold text-[#B45309] mt-1">Project: {activeProject.name}</p>
          <p className="text-xs text-zinc-500 font-medium">Generated on: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-10">
          
          {/* TOP SUMMARY METRICS */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white border border-zinc-200 p-5 rounded-2xl shadow-sm flex flex-col justify-center">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Target Budget</span>
              <p className="text-xl font-bold text-zinc-900">₹ {(activeProject.budget || 0).toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white border border-zinc-200 p-5 rounded-2xl shadow-sm flex flex-col justify-center">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Total Billed</span>
              <p className="text-xl font-bold text-blue-600">₹ {(activeProject.invoicedTotal || 0).toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl shadow-sm flex flex-col justify-center">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block mb-1">Income Collected</span>
              <p className="text-xl font-bold text-emerald-700">₹ {(activeProject.incomeCollected || 0).toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-red-50 border border-red-100 p-5 rounded-2xl shadow-sm flex flex-col justify-center">
              <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest block mb-1">Total Costs Paid</span>
              <p className="text-xl font-bold text-red-600">₹ {(activeProject.totalCost || 0).toLocaleString('en-IN')}</p>
            </div>
            <div className={`p-5 rounded-2xl shadow-sm border flex flex-col justify-center ${
              (activeProject.netProfit || 0) >= 0 ? 'bg-[#B45309] border-[#B45309] text-white' : 'bg-red-600 border-red-600 text-white'
            }`}>
              <span className="text-[10px] font-bold uppercase tracking-widest block mb-1 opacity-80">Current Net Profit</span>
              <p className="text-xl font-bold">₹ {(activeProject.netProfit || 0).toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* VISUAL MARGIN BAR */}
          <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Financial Health & Margin</h3>
              <span className={`text-xl font-black ${
                (activeProject.margin || 0) >= 15 ? 'text-emerald-600' : (activeProject.margin || 0) > 0 ? 'text-amber-500' : 'text-red-500'
              }`}>
                {activeProject.margin}% <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Margin</span>
              </span>
            </div>
            
            <div className="w-full h-4 bg-zinc-100 rounded-full overflow-hidden flex shadow-inner">
              <div 
                className="h-full bg-emerald-500 transition-all duration-500" 
                style={{ width: `${Math.min(((activeProject.incomeCollected || 0) / ((activeProject.incomeCollected || 0) + (activeProject.totalCost || 0) || 1)) * 100, 100)}%` }}
              ></div>
              <div 
                className="h-full bg-red-500 transition-all duration-500" 
                style={{ width: `${Math.min(((activeProject.totalCost || 0) / ((activeProject.incomeCollected || 0) + (activeProject.totalCost || 0) || 1)) * 100, 100)}%` }}
              ></div>
            </div>

            <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              <span className="text-emerald-600">Total Money In</span>
              <span className="text-red-500">Total Money Out</span>
            </div>
          </div>

          {/* DUAL LEDGER BREAKDOWN */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 break-inside-avoid">
            
            {/* Revenue Ledger */}
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-zinc-100 bg-emerald-50/30 flex items-center justify-between">
                <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-widest flex items-center gap-2">
                  <span className="text-base">📈</span> Revenue & Income
                </h3>
                <span className="text-sm font-bold text-emerald-700">₹ {(activeProject.incomeCollected || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="p-5 flex-1 space-y-4">
                
                <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
                  <div>
                    <p className="text-sm font-bold text-zinc-800">Approved Estimations / Contracts</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Value of signed client documents</p>
                  </div>
                  <p className="font-semibold text-zinc-900 text-sm">₹ {(activeProject.estimationsTotal || 0).toLocaleString('en-IN')}</p>
                </div>

                <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
                  <div>
                    <p className="text-sm font-bold text-zinc-800">Tax Invoices Raised</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Officially billed to client</p>
                  </div>
                  <p className="font-semibold text-blue-600 text-sm">₹ {(activeProject.invoicedTotal || 0).toLocaleString('en-IN')}</p>
                </div>

                <div className="flex justify-between items-center bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                  <div>
                    <p className="text-sm font-bold text-emerald-800">Actual Income Received</p>
                    <p className="text-[10px] text-emerald-600 mt-0.5">Funds deposited in bank</p>
                  </div>
                  <p className="font-black text-emerald-700 text-lg">₹ {(activeProject.incomeCollected || 0).toLocaleString('en-IN')}</p>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Pending Client Dues</p>
                  <p className="font-bold text-amber-600 text-xs">
                    ₹ {Math.max(0, activeProject.invoicedTotal - activeProject.incomeCollected).toLocaleString('en-IN')}
                  </p>
                </div>

              </div>
            </div>

            {/* Cost Ledger */}
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-zinc-100 bg-red-50/30 flex items-center justify-between">
                <h3 className="text-xs font-bold text-red-700 uppercase tracking-widest flex items-center gap-2">
                  <span className="text-base">📉</span> Expenses & Costs
                </h3>
                <span className="text-sm font-bold text-red-600">₹ {(activeProject.totalCost || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="p-5 flex-1 space-y-4">
                
                <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
                  <div>
                    <p className="text-sm font-bold text-zinc-800">Subcontractor Allocations</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Total locked value for subs</p>
                  </div>
                  <p className="font-semibold text-zinc-900 text-sm">₹ {(activeProject.subcontractorAllocated || 0).toLocaleString('en-IN')}</p>
                </div>

                <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
                  <div>
                    <p className="text-sm font-bold text-zinc-800">Subcontractor Payouts</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Actual advances and bills paid</p>
                  </div>
                  <p className="font-semibold text-red-500 text-sm">₹ {(activeProject.subcontractorPaid || 0).toLocaleString('en-IN')}</p>
                </div>

                <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
                  <div>
                    <p className="text-sm font-bold text-zinc-800">Site & Petty Cash Expenses</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Misc site materials, labor, fuel</p>
                  </div>
                  <p className="font-semibold text-red-500 text-sm">₹ {(activeProject.pettyCashExpenses || 0).toLocaleString('en-IN')}</p>
                </div>

                <div className="flex justify-between items-center bg-red-50 p-3 rounded-xl border border-red-100">
                  <div>
                    <p className="text-sm font-bold text-red-800">Total Money Outflow</p>
                    <p className="text-[10px] text-red-600 mt-0.5">Actual cash spent</p>
                  </div>
                  <p className="font-black text-red-600 text-lg">₹ {(activeProject.totalCost || 0).toLocaleString('en-IN')}</p>
                </div>

              </div>
            </div>

          </div>

          {/* RECENT FINANCIAL TRANSACTIONS */}
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden break-inside-avoid">
            <div className="p-5 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
              <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-widest">Recent Financial Ledger</h3>
              <span className="text-[10px] font-semibold text-zinc-400 bg-white px-2 py-1 rounded-lg border border-zinc-200">Last 15 Transactions</span>
            </div>
            
            {activeProject.recentTransactions && activeProject.recentTransactions.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 text-sm font-medium italic">
                No financial transactions logged for this project yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="text-zinc-400 text-[10px] uppercase tracking-wider border-b border-zinc-100">
                      <th className="py-3 px-5 font-bold">Date</th>
                      <th className="py-3 px-5 font-bold">Type</th>
                      <th className="py-3 px-5 font-bold">Description / Notes</th>
                      <th className="py-3 px-5 font-bold text-right">Amount Out</th>
                      <th className="py-3 px-5 font-bold text-right">Amount In</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50 text-sm">
                    {(activeProject.recentTransactions || []).map(txn => (
                      <tr key={txn.id} className="hover:bg-zinc-50 transition-colors">
                        <td className="py-3 px-5 text-xs text-zinc-500 font-medium">{txn.date}</td>
                        <td className="py-3 px-5">
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            txn.isCredit ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
                          }`}>
                            {txn.type}
                          </span>
                        </td>
                        <td className="py-3 px-5 font-medium text-zinc-800 truncate max-w-[300px]">{txn.desc}</td>
                        <td className="py-3 px-5 text-right font-semibold text-red-500">
                          {!txn.isCredit ? `₹ ${parseFloat(txn.amount || 0).toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="py-3 px-5 text-right font-bold text-emerald-600">
                          {txn.isCredit ? `₹ ${parseFloat(txn.amount || 0).toLocaleString('en-IN')}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    );
  }

  return null; // Fallback
}