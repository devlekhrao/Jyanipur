import React, { useState, useEffect } from 'react';
import * as db from '../db';
import { exportToCSV } from '../utils';

export default function ProjectPnL({ companySettings = {} }) {
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('overview'); // 'overview' or 'detail'
  
  const [masterPnLList, setMasterPnLList] = useState([]);
  const [globalTotals, setGlobalTotals] = useState({ 
    budget: 0, 
    invoiced: 0, 
    income: 0, 
    materials: 0, 
    godownDispatches: 0,
    subcontractors: 0, 
    retentionHeld: 0,
    debitRecoveries: 0,
    pettyCash: 0, 
    cost: 0, 
    profit: 0 
  });
  const [activeProject, setActiveProject] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [detailFilter, setDetailFilter] = useState('All'); // All, Income, Material, Inventory, Subcontractor, PettyCash, DebitRecovery

  const parseAmt = (val) => {
    if (typeof val === 'number') return val;
    return Number(val?.toString().replace(/[^0-9.-]+/g, "")) || 0;
  };

  const loadGlobalData = async () => {
    setLoading(true);
    try {
      const [
        projs, 
        invoices, 
        incomes, 
        subWOs, 
        petty, 
        ests, 
        clientWOs, 
        purchases, 
        raBills, 
        changeOrders,
        inventoryMovements,
        inventoryItems
      ] = await Promise.all([
        db.getProjects ? db.getProjects() : Promise.resolve([]),
        db.getInvoices ? db.getInvoices() : Promise.resolve([]),
        db.getIncomeRecords ? db.getIncomeRecords() : Promise.resolve([]),
        db.getSubcontractorWorkOrders ? db.getSubcontractorWorkOrders() : Promise.resolve([]),
        db.getPettyCash ? db.getPettyCash() : Promise.resolve([]),
        db.getEstimations ? db.getEstimations() : Promise.resolve([]),
        db.getClientWorkOrders ? db.getClientWorkOrders() : Promise.resolve([]),
        db.getPurchases ? db.getPurchases() : Promise.resolve([]),
        db.getRaBills ? db.getRaBills() : Promise.resolve([]),
        db.getChangeOrders ? db.getChangeOrders() : Promise.resolve([]),
        db.getInventoryMovements ? db.getInventoryMovements() : Promise.resolve([]),
        db.getInventoryItems ? db.getInventoryItems() : Promise.resolve([])
      ]);

      // Cache Fallbacks for complete reconciliation
      const cachedSubWOs = JSON.parse(localStorage.getItem('jyanipur_sub_work_orders') || '[]');
      const cachedDebitNotes = JSON.parse(localStorage.getItem('jyanipur_sub_debit_notes') || '[]');
      const cachedInventory = JSON.parse(localStorage.getItem('jyanipur_inventory') || '[]');
      const cachedClientWos = JSON.parse(localStorage.getItem('jyanipur_client_work_orders') || '[]');

      // Merge Subcontractor WOs
      const allSubWOs = [...(subWOs || [])];
      cachedSubWOs.forEach(cw => {
        if (!allSubWOs.some(w => String(w.id || w._id) === String(cw.id || cw._id))) {
          allSubWOs.push(cw);
        }
      });

      // Merge Inventory Movements
      const allMovements = [...(inventoryMovements || [])];
      cachedInventory.forEach(cm => {
        if (!allMovements.some(m => String(m.id || m._id) === String(cm.id || cm._id))) {
          allMovements.push(cm);
        }
      });

      // Build Inventory item rate map for Godown dispatch costing
      const itemRateMap = new Map();
      (inventoryItems || []).forEach(it => {
        itemRateMap.set((it.name || '').trim().toLowerCase(), parseAmt(it.unitCost || it.rate || 0));
      });

      const activeProjects = (projs || []).filter(proj => proj.status !== 'Completed');

      let gBudget = 0;
      let gInvoiced = 0;
      let gIncome = 0;
      let gMaterials = 0;
      let gGodownDispatches = 0;
      let gSubs = 0;
      let gRetention = 0;
      let gDebitRec = 0;
      let gPetty = 0;
      let gTotalCost = 0;
      let gProfit = 0;

      const crunchedData = activeProjects.map(proj => {
        const pId = String(proj.id || proj._id);
        const pName = (proj.name || proj.projectName || '').toLowerCase().trim();
        const clientName = (proj.clientName || '').toLowerCase().trim();

        // 1. Target Contract Value & Scope Variations
        const baseBudget = parseAmt(proj.budget);
        const projCOs = (changeOrders || []).filter(co => 
          String(co.projectId) === pId || (co.projectName && co.projectName.toLowerCase().trim() === pName)
        );
        const changeOrderTotal = projCOs.reduce((sum, co) => sum + parseAmt(co.additionalCost), 0);
        
        const projEsts = (ests || []).filter(e => 
          (e.clientName && e.clientName.toLowerCase().trim() === clientName) && e.status !== 'Rejected'
        );
        const estTotal = projEsts.reduce((sum, e) => sum + parseAmt(e.totalAmount), 0);
        
        const projClientWOs = [...(clientWOs || []), ...cachedClientWos].filter(w => 
          (w.projectName && w.projectName.toLowerCase().trim() === pName) && !w.isCancelled
        );
        const clientWoTotal = projClientWOs.reduce((sum, w) => sum + parseAmt(w.totalAmount), 0);

        const targetBudget = Math.max(baseBudget + changeOrderTotal, estTotal, clientWoTotal);

        // 2. Revenue Inflow & Invoiced Billings
        const projInvoices = (invoices || []).filter(i => 
          (String(i.projectId) === pId || 
           (i.projectName && i.projectName.toLowerCase().trim() === pName) ||
           (i.client && i.client.toLowerCase().trim() === clientName) ||
           (i.partyName && i.partyName.toLowerCase().trim() === clientName)) && 
          !i.isCancelled
        );
        const invoicedTotal = projInvoices.reduce((sum, i) => sum + parseAmt(i.amount), 0);

        const projIncomes = (incomes || []).filter(i => 
          String(i.projectId) === pId || 
          (i.projectName && i.projectName.toLowerCase().trim() === pName)
        );
        const incomeCollected = projIncomes.reduce((sum, i) => sum + parseAmt(i.amount), 0);

        // 3. Direct Materials Purchases (Purchases & PO Bills)
        const projPurchases = (purchases || []).filter(pur => 
          (String(pur.projectId) === pId || (pur.projectName && pur.projectName.toLowerCase().trim() === pName)) &&
          !pur.isCancelled
        );
        const materialCost = projPurchases.reduce((sum, p) => sum + parseAmt(p.totalAmount), 0);

        // 4. Godown Stock Dispatched directly to this Site (-OUT from Inventory)
        const projGodownDispatches = allMovements.filter(m => 
          m.type === 'OUT' && (String(m.projectId) === pId || (m.projectName && m.projectName.toLowerCase().trim() === pName))
        );
        const godownDispatchCost = projGodownDispatches.reduce((sum, m) => {
          const qty = parseAmt(m.quantity);
          const unitRate = itemRateMap.get((m.itemName || '').trim().toLowerCase()) || parseAmt(m.unitRate || m.rate || 0);
          return sum + (qty * unitRate);
        }, 0);

        // 5. Subcontractor Allocations, Disbursed Payments & 5% Retention
        const projSubWOs = allSubWOs.filter(w => 
          String(w.projectId) === pId || 
          (w.projectName && w.projectName.toLowerCase().trim() === pName)
        );
        const subAllocated = projSubWOs.reduce((sum, w) => sum + parseAmt(w.contractValue), 0);
        
        let subPaid = projSubWOs.reduce((sum, w) => sum + parseAmt(w.totalPaid), 0);

        // Include Certified RA Bills if not counted in WO payments
        const projRaBills = (raBills || []).filter(b => 
          String(b.projectId) === pId || 
          (b.projectName && b.projectName.toLowerCase().trim() === pName)
        );
        const raBillsTotal = projRaBills.reduce((sum, b) => sum + parseAmt(b.netPayable), 0);
        if (subPaid === 0 && raBillsTotal > 0) {
          subPaid = raBillsTotal;
        }

        // 5% Retention held (deferred liability, not disbursed cash)
        const retentionHeld = projSubWOs.reduce((sum, w) => {
          const pct = parseAmt(w.retentionPercent || 5);
          return sum + (parseAmt(w.contractValue) * (pct / 100));
        }, 0);

        // 6. Subcontractor Material Debit Notes (Recoveries credited back to company)
        const projDebitNotes = cachedDebitNotes.filter(d => 
          (String(d.projectId) === pId || (d.projectName && d.projectName.toLowerCase().trim() === pName)) &&
          d.deducted
        );
        const debitRecoveries = projDebitNotes.reduce((sum, d) => sum + parseAmt(d.totalAmount || (d.qty * d.rate)), 0);

        // 7. Site Petty Cash Expenses
        const projPetty = (petty || []).filter(p => 
          (String(p.projectId) === pId || (p.projectName && p.projectName.toLowerCase().trim() === pName)) && 
          p.type === 'Expense'
        );
        const pettyExpenses = projPetty.reduce((sum, p) => sum + parseAmt(p.amount), 0);

        // 8. Total Actual Realized Costs (Disbursed Outflows - Debit Recoveries)
        const totalActualCost = Math.max(0, (materialCost + godownDispatchCost + subPaid + pettyExpenses) - debitRecoveries);
        const netProfit = incomeCollected - totalActualCost;
        const margin = incomeCollected > 0 ? ((netProfit / incomeCollected) * 100).toFixed(1) : '0.0';
        const budgetConsumption = targetBudget > 0 ? ((totalActualCost / targetBudget) * 100).toFixed(1) : '0.0';
        const isBudgetOverrun = targetBudget > 0 && totalActualCost > targetBudget;

        // Area & Cost per Sq.Ft. Metric
        const carpetArea = parseAmt(proj.area || proj.sqft || proj.carpetArea || 0);
        const costPerSqFt = carpetArea > 0 ? Math.round(totalActualCost / carpetArea) : 0;
        const revenuePerSqFt = carpetArea > 0 ? Math.round(incomeCollected / carpetArea) : 0;

        // 9. Chronological Financial Audit Stream
        const txns = [
          ...projIncomes.map(i => ({ 
            id: `inc_${i.id || Math.random()}`, 
            date: i.date, 
            type: 'Income', 
            amount: parseAmt(i.amount), 
            desc: `Client Payment: ${i.paymentMode || 'Direct Remittance'} (${i.referenceNo || 'Receipt'})`, 
            isCredit: true 
          })),
          ...projPurchases.map(pur => ({ 
            id: `pur_${pur.id || Math.random()}`, 
            date: pur.invoiceDate || pur.date, 
            type: 'Material', 
            amount: parseAmt(pur.totalAmount), 
            desc: `Direct Purchase: ${pur.vendorName} (Bill #${pur.invoiceNo || 'N/A'})`, 
            isCredit: false 
          })),
          ...projGodownDispatches.map(m => {
            const val = parseAmt(m.quantity) * (itemRateMap.get((m.itemName || '').trim().toLowerCase()) || parseAmt(m.unitRate || m.rate || 0));
            return {
              id: `godown_${m.id || Math.random()}`,
              date: m.date,
              type: 'Inventory',
              amount: val,
              desc: `Godown Dispatch: ${m.quantity} ${m.unit} of ${m.itemName} (${m.challanNo || 'Delivery Gate Pass'})`,
              isCredit: false
            };
          }),
          ...projPetty.map(p => ({ 
            id: `exp_${p.id || Math.random()}`, 
            date: p.date, 
            type: 'PettyCash', 
            amount: parseAmt(p.amount), 
            desc: `Site Petty Cash: ${p.description || p.category || 'Sundry'}`, 
            isCredit: false 
          })),
          ...projDebitNotes.map(d => ({
            id: `dn_${d.id || Math.random()}`,
            date: d.date,
            type: 'DebitRecovery',
            amount: parseAmt(d.totalAmount || (d.qty * d.rate)),
            desc: `Material Debit Recovery: ${d.item} deducted from trade agency`,
            isCredit: true
          }))
        ];

        projSubWOs.forEach(wo => {
          (wo.payments || []).forEach(pay => {
            txns.push({ 
              id: `subpay_${pay.id || Math.random()}`, 
              date: pay.date, 
              type: 'Subcontractor', 
              amount: parseAmt(pay.amount), 
              desc: `Trade Payout: ${wo.subcontractorName || wo.subName || 'Agency'} (${wo.trade || 'Work Order'})`, 
              isCredit: false 
            });
          });
        });

        txns.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

        // Aggregate Global Sums
        gBudget += targetBudget;
        gInvoiced += invoicedTotal;
        gIncome += incomeCollected;
        gMaterials += materialCost;
        gGodownDispatches += godownDispatchCost;
        gSubs += subPaid;
        gRetention += retentionHeld;
        gDebitRec += debitRecoveries;
        gPetty += pettyExpenses;
        gTotalCost += totalActualCost;
        gProfit += netProfit;

        return {
          ...proj,
          budget: targetBudget,
          originalBudget: baseBudget,
          carpetArea,
          costPerSqFt,
          revenuePerSqFt,
          changeOrderTotal,
          estimationsTotal: estTotal || clientWoTotal,
          invoicedTotal,
          incomeCollected,
          materialCost,
          godownDispatchCost,
          subcontractorAllocated: subAllocated,
          subcontractorPaid: subPaid,
          retentionHeld,
          debitRecoveries,
          pettyCashExpenses: pettyExpenses,
          totalCost: totalActualCost,
          netProfit,
          margin,
          budgetConsumption,
          isBudgetOverrun,
          recentTransactions: txns
        };
      });

      crunchedData.sort((a, b) => b.netProfit - a.netProfit);

      setMasterPnLList(crunchedData);
      setGlobalTotals({
        budget: gBudget,
        invoiced: gInvoiced,
        income: gIncome,
        materials: gMaterials,
        godownDispatches: gGodownDispatches,
        subcontractors: gSubs,
        retentionHeld: gRetention,
        debitRecoveries: gDebitRec,
        pettyCash: gPetty,
        cost: gTotalCost,
        profit: gProfit
      });
    } catch (err) {
      console.error("Error crunching master P&L ledger:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadGlobalData();
  }, []);

  const handleViewDetail = (projectData) => {
    setActiveProject(projectData);
    setDetailFilter('All');
    setCurrentView('detail');
  };

  const handleBackToOverview = () => {
    setActiveProject(null);
    setCurrentView('overview');
    loadGlobalData();
  };

  const handleExportStatement = (project) => {
    const exportData = (project.recentTransactions || []).map(t => ({
      'Date': t.date,
      'Classification': t.type,
      'Description / Particulars': t.desc,
      'Cash Flow': t.isCredit ? 'INFLOW (CREDIT)' : 'OUTFLOW (DEBIT)',
      'Amount (INR)': t.amount
    }));
    exportToCSV(`PnL_Audit_Statement_${(project.name || project.projectName || 'Site').replace(/[^a-zA-Z0-9]/g, '_')}`, exportData);
  };

  const handleExportMasterSummary = () => {
    const data = filteredMasterList.map(p => ({
      'Project Site': p.name || p.projectName,
      'Client Name': p.clientName || '-',
      'Contract Budget (INR)': p.budget,
      'Client Invoiced (INR)': p.invoicedTotal,
      'Collected Income (INR)': p.incomeCollected,
      'Direct Materials (INR)': p.materialCost,
      'Godown Dispatches (INR)': p.godownDispatchCost,
      'Subcontractor Payouts (INR)': p.subcontractorPaid,
      '5% Retention Locked (INR)': p.retentionHeld,
      'Debit Note Credits (INR)': p.debitRecoveries,
      'Petty Cash (INR)': p.pettyCashExpenses,
      'Total Realized Cost (INR)': p.totalCost,
      'Net Realized Profit (INR)': p.netProfit,
      'Margin %': `${p.margin}%`,
      'Cost per SqFt': p.costPerSqFt > 0 ? `₹${p.costPerSqFt}` : '-'
    }));
    exportToCSV('Jyanipur_Master_Projects_PnL_Audit', data);
  };

  const filteredMasterList = masterPnLList.filter(proj => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (proj.name && proj.name.toLowerCase().includes(q)) ||
      (proj.projectName && proj.projectName.toLowerCase().includes(q)) ||
      (proj.clientName && proj.clientName.toLowerCase().includes(q))
    );
  });

  // ==========================================
  // VIEW 1: GLOBAL MASTERBOARD (All Sites)
  // ==========================================
  if (currentView === 'overview') {
    return (
      <div className="w-full h-full flex flex-col font-['Inter',sans-serif] print:bg-white print:p-0">
        
        {/* HEADER & CONTROLS */}
        <div className="flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center pb-6 mb-4 border-b border-zinc-200 shrink-0 gap-4 print:hidden">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Project P&L Command Center</h2>
            <p className="text-zinc-500 text-sm mt-1 font-medium">Reconciles material bills, Godown dispatches, trade contractor settlements, debit notes, client receipts, and site petty cash.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center h-10 bg-white border border-zinc-200 rounded-lg px-3.5 shadow-sm w-full md:w-64 focus-within:ring-2 focus-within:ring-zinc-900 transition-all">
              <svg className="w-4 h-4 text-zinc-400 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input 
                type="text" 
                placeholder="Search project or client..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                className="bg-transparent border-none text-xs font-medium text-zinc-900 outline-none w-full placeholder:text-zinc-400" 
              />
            </div>

            <button 
              onClick={handleExportMasterSummary}
              className="h-10 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 px-4 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export CSV
            </button>

            <button 
              onClick={() => window.print()} 
              className="bg-zinc-900 hover:bg-black text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-2 border border-black h-10"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Master P&L
            </button>
          </div>
        </div>

        {/* PRINT ONLY HEADER */}
        <div className="hidden print:block border-b-2 border-black pb-4 mb-6">
          <h1 className="text-2xl font-black text-black tracking-tight uppercase">{companySettings.companyName || 'Jyanipur Interiors & Construction'}</h1>
          <p className="text-xs text-zinc-600 font-bold mt-1 uppercase tracking-widest">Master Project Profit & Loss Audit Report • {new Date().toLocaleDateString()}</p>
        </div>

        {loading ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-xs flex flex-col items-center justify-center space-y-3 flex-1">
            <div className="w-10 h-10 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin"></div>
            <p>Reconciling project financials across procurement, Godown, and payroll...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-6 [&::-webkit-scrollbar]:hidden pb-10">
            
            {/* EXECUTIVE FINANCIAL KPI TILES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm flex flex-col justify-center">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Total Contract Volume</span>
                <p className="text-2xl font-black text-zinc-900 tracking-tight">₹ {globalTotals.budget.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Invoiced: ₹{globalTotals.invoiced.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-xl shadow-sm flex flex-col justify-center relative overflow-hidden">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest block mb-2 relative z-10">Realized Cash Inflow</span>
                <p className="text-2xl font-black text-emerald-800 tracking-tight relative z-10">₹ {globalTotals.income.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                <span className="text-[10px] font-bold text-emerald-700/80 uppercase tracking-widest mt-1">Deposited in Bank</span>
              </div>

              <div className="bg-red-50 border border-red-200 p-6 rounded-xl shadow-sm flex flex-col justify-center relative overflow-hidden">
                <span className="text-[10px] font-bold text-red-700 uppercase tracking-widest block mb-2 relative z-10">Direct Cost Outflows</span>
                <p className="text-2xl font-black text-red-800 tracking-tight relative z-10">₹ {globalTotals.cost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                <span className="text-[10px] font-bold text-red-700/80 uppercase tracking-widest mt-1">
                  Mat: ₹{(globalTotals.materials + globalTotals.godownDispatches).toLocaleString('en-IN', { maximumFractionDigits: 0 })} • Subs: ₹{globalTotals.subcontractors.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              </div>

              <div className={`p-6 rounded-xl shadow-sm flex flex-col justify-center relative overflow-hidden ${
                globalTotals.profit >= 0 ? 'bg-zinc-900 border border-black text-white' : 'bg-red-600 border border-red-700 text-white'
              }`}>
                <span className="text-[10px] font-bold uppercase tracking-widest block mb-2 opacity-80 relative z-10">Company Net Realized Profit</span>
                <p className="text-2xl font-black tracking-tight relative z-10">₹ {globalTotals.profit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-80 mt-1">
                  Margin: {globalTotals.income > 0 ? ((globalTotals.profit / globalTotals.income) * 100).toFixed(1) : 0}% • Escrow: ₹{globalTotals.retentionHeld.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* MASTER PROJECT TABLE */}
            <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-0">
              <div className="p-5 border-b border-zinc-200 bg-white flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest">Active Project Profitability Table</h3>
                  <p className="text-xs text-zinc-500 font-medium mt-0.5">Automated reconciliation across Material Purchases, Godown Dispatches, Trade RA Bills, and Client Incomes.</p>
                </div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-100 px-3 py-1 rounded border border-zinc-200">
                  {filteredMasterList.length} Active Sites
                </span>
              </div>
              
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1250px]">
                  <thead>
                    <tr className="bg-zinc-50 text-zinc-500 text-[10px] uppercase tracking-widest font-bold border-b border-zinc-200 sticky top-0 z-10">
                      <th className="py-3.5 px-6 w-60">Project Site & Client</th>
                      <th className="py-3.5 px-6 text-right w-36">Contract Value</th>
                      <th className="py-3.5 px-6 text-right text-emerald-700 w-36">Collected In</th>
                      <th className="py-3.5 px-6 text-right text-zinc-700 w-32">Materials (PO)</th>
                      <th className="py-3.5 px-6 text-right text-zinc-700 w-32">Godown Dispatched</th>
                      <th className="py-3.5 px-6 text-right text-zinc-700 w-32">Trade Subs Paid</th>
                      <th className="py-3.5 px-6 text-right text-red-600 w-36">Total Site Cost</th>
                      <th className="py-3.5 px-6 text-right w-40">Net Profit</th>
                      <th className="py-3.5 px-6 text-right w-24">Margin %</th>
                      <th className="py-3.5 px-6 text-right w-32 print:hidden">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-sm">
                    {filteredMasterList.map(proj => (
                      <tr key={proj.id || proj._id} className="hover:bg-zinc-50/80 transition-colors group">
                        <td className="py-4 px-6">
                          <p className="font-bold text-zinc-900 truncate tracking-tight">{proj.name || proj.projectName}</p>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
                            {proj.clientName} {proj.costPerSqFt > 0 ? `• ₹${proj.costPerSqFt}/SqFt` : ''}
                          </p>
                        </td>

                        <td className="py-4 px-6 text-right font-bold text-zinc-700 text-xs font-mono">
                          ₹ {(proj.budget || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          {proj.changeOrderTotal > 0 && (
                            <span className="text-[9px] text-zinc-400 block font-normal">+₹{proj.changeOrderTotal.toLocaleString('en-IN')} variation</span>
                          )}
                        </td>

                        <td className="py-4 px-6 text-right font-black text-emerald-700 text-xs bg-emerald-50/20 font-mono">
                          ₹ {(proj.incomeCollected || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>

                        <td className="py-4 px-6 text-right font-medium text-xs text-zinc-700 font-mono">
                          ₹ {(proj.materialCost || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>

                        <td className="py-4 px-6 text-right font-medium text-xs text-zinc-700 font-mono">
                          ₹ {(proj.godownDispatchCost || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>

                        <td className="py-4 px-6 text-right font-medium text-xs text-zinc-700 font-mono">
                          ₹ {(proj.subcontractorPaid || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          {proj.retentionHeld > 0 && (
                            <span className="text-[8px] text-zinc-400 block font-normal font-sans">₹{proj.retentionHeld.toLocaleString('en-IN')} retention held</span>
                          )}
                        </td>

                        <td className="py-4 px-6 text-right font-black text-xs text-red-600 bg-red-50/20 font-mono">
                          ₹ {(proj.totalCost || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          {proj.isBudgetOverrun && (
                            <span className="text-[8px] font-bold text-red-600 uppercase tracking-widest block font-sans">Over Budget!</span>
                          )}
                        </td>

                        <td className="py-4 px-6 text-right">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-black tracking-widest border font-mono ${
                            proj.netProfit >= 0 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {proj.netProfit >= 0 ? '+' : ''}₹ {(proj.netProfit || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </span>
                        </td>

                        <td className="py-4 px-6 text-right font-black text-sm font-mono">
                          <span className={proj.margin >= 15 ? 'text-emerald-700' : proj.margin > 0 ? 'text-amber-600' : 'text-red-600'}>
                            {proj.margin}%
                          </span>
                        </td>

                        <td className="py-4 px-6 text-right print:hidden">
                          <button 
                            onClick={() => handleViewDetail(proj)} 
                            className="px-3.5 py-1.5 bg-zinc-900 hover:bg-black text-white rounded-lg font-bold cursor-pointer text-[10px] uppercase tracking-widest transition-all shadow-sm border border-black"
                          >
                            Statement
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredMasterList.length === 0 && (
                      <tr>
                        <td colSpan="10" className="py-16 text-center text-zinc-400 font-bold text-xs uppercase tracking-widest">
                          No active projects found.
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
  // VIEW 2: SINGLE SITE COMPLETE P&L STATEMENT
  // ==========================================
  if (currentView === 'detail' && activeProject) {
    const transactions = (activeProject.recentTransactions || []).filter(t => {
      if (detailFilter === 'All') return true;
      if (detailFilter === 'Income') return t.type === 'Income';
      if (detailFilter === 'Material') return t.type === 'Material';
      if (detailFilter === 'Inventory') return t.type === 'Inventory';
      if (detailFilter === 'Subcontractor') return t.type === 'Subcontractor';
      if (detailFilter === 'PettyCash') return t.type === 'PettyCash';
      if (detailFilter === 'DebitRecovery') return t.type === 'DebitRecovery';
      return true;
    });

    const materialPercent = activeProject.totalCost > 0 ? Math.round(((activeProject.materialCost + activeProject.godownDispatchCost) / activeProject.totalCost) * 100) : 0;
    const subPercent = activeProject.totalCost > 0 ? Math.round((activeProject.subcontractorPaid / activeProject.totalCost) * 100) : 0;
    const pettyPercent = activeProject.totalCost > 0 ? Math.round((activeProject.pettyCashExpenses / activeProject.totalCost) * 100) : 0;

    return (
      <div className="w-full h-full flex flex-col font-['Inter',sans-serif] print:bg-white print:p-0">
        
        {/* Header & Controls */}
        <div className="flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center pb-6 mb-4 border-b border-zinc-200 shrink-0 gap-4 print:hidden">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-100 border border-zinc-200 px-2.5 py-0.5 rounded">
                Client: {activeProject.clientName}
              </span>
              {activeProject.carpetArea > 0 && (
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-100 border border-zinc-200 px-2.5 py-0.5 rounded">
                  Carpet Area: {activeProject.carpetArea} Sq.Ft.
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">{activeProject.name || activeProject.projectName}</h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={() => handleExportStatement(activeProject)} 
              className="bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-800 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-2 h-10"
            >
              <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export Statement
            </button>
            <button 
              onClick={() => window.print()} 
              className="bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-800 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-2 h-10"
            >
              <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Audit PDF
            </button>
            <button 
              onClick={handleBackToOverview} 
              className="bg-zinc-900 hover:bg-black text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all cursor-pointer shadow-sm flex items-center gap-2 border border-black h-10"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Masterboard
            </button>
          </div>
        </div>

        {/* PRINT ONLY HEADER */}
        <div className="hidden print:block border-b-2 border-black pb-4 mb-6">
          <h1 className="text-2xl font-black text-black tracking-tight uppercase">Project Audit Statement & P&L Ledger</h1>
          <p className="text-sm font-bold text-zinc-800 mt-1 uppercase tracking-widest">Site: {activeProject.name || activeProject.projectName} • Client: {activeProject.clientName}</p>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Generated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-6 [&::-webkit-scrollbar]:hidden pb-10">
          
          {/* TOP SUMMARY METRICS */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white border border-zinc-200 p-5 rounded-xl shadow-sm flex flex-col justify-center">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">Target Budget</span>
              <p className="text-xl font-black text-zinc-900 tracking-tight font-mono">₹ {(activeProject.budget || 0).toLocaleString('en-IN')}</p>
              {activeProject.changeOrderTotal > 0 && (
                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">+₹{activeProject.changeOrderTotal.toLocaleString('en-IN')} Variations</span>
              )}
            </div>

            <div className="bg-white border border-zinc-200 p-5 rounded-xl shadow-sm flex flex-col justify-center">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">Total Invoiced</span>
              <p className="text-xl font-black text-zinc-700 tracking-tight font-mono">₹ {(activeProject.invoicedTotal || 0).toLocaleString('en-IN')}</p>
              <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Official Tax Bills</span>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-xl shadow-sm flex flex-col justify-center">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest block mb-1.5">Collected Inflow</span>
              <p className="text-xl font-black text-emerald-800 tracking-tight font-mono">₹ {(activeProject.incomeCollected || 0).toLocaleString('en-IN')}</p>
              <span className="text-[9px] text-emerald-700/80 font-bold uppercase tracking-widest mt-0.5">Bank Deposits</span>
            </div>

            <div className="bg-red-50 border border-red-200 p-5 rounded-xl shadow-sm flex flex-col justify-center">
              <span className="text-[10px] font-bold text-red-700 uppercase tracking-widest block mb-1.5">Realized Cost Outflow</span>
              <p className="text-xl font-black text-red-800 tracking-tight font-mono">₹ {(activeProject.totalCost || 0).toLocaleString('en-IN')}</p>
              <span className="text-[9px] text-red-700/80 font-bold uppercase tracking-widest mt-0.5">Burn: {activeProject.budgetConsumption}%</span>
            </div>

            <div className={`p-5 rounded-xl shadow-sm border flex flex-col justify-center ${
              (activeProject.netProfit || 0) >= 0 ? 'bg-zinc-900 border-black text-white' : 'bg-red-600 border-red-700 text-white'
            }`}>
              <span className="text-[10px] font-bold uppercase tracking-widest block mb-1.5 opacity-80">Net Realized Profit</span>
              <p className="text-xl font-black tracking-tight font-mono">₹ {(activeProject.netProfit || 0).toLocaleString('en-IN')}</p>
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-80 mt-0.5">{activeProject.margin}% Profit Margin</span>
            </div>
          </div>

          {/* VISUAL COST STRUCTURE BAR */}
          <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm print:hidden">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-widest">Site Cost Outflow Allocation</h4>
              <span className="text-xs font-mono font-bold text-zinc-600">Total: ₹{activeProject.totalCost.toLocaleString('en-IN')}</span>
            </div>
            <div className="w-full h-3 rounded-full bg-zinc-100 flex overflow-hidden">
              <div style={{ width: `${materialPercent}%` }} className="bg-blue-600 h-full" title={`Materials: ${materialPercent}%`}></div>
              <div style={{ width: `${subPercent}%` }} className="bg-zinc-900 h-full" title={`Subcontractors: ${subPercent}%`}></div>
              <div style={{ width: `${pettyPercent}%` }} className="bg-amber-500 h-full" title={`Petty Cash: ${pettyPercent}%`}></div>
            </div>
            <div className="flex flex-wrap gap-4 mt-3 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Materials ({materialPercent}%) • ₹{(activeProject.materialCost + activeProject.godownDispatchCost).toLocaleString('en-IN')}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-900"></span> Subcontractors ({subPercent}%) • ₹{activeProject.subcontractorPaid.toLocaleString('en-IN')}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Petty Cash ({pettyPercent}%) • ₹{activeProject.pettyCashExpenses.toLocaleString('en-IN')}
              </span>
              {activeProject.debitRecoveries > 0 && (
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Less Debit Recoveries • -₹{activeProject.debitRecoveries.toLocaleString('en-IN')}
                </span>
              )}
            </div>
          </div>

          {/* DUAL LEDGER BREAKDOWN (REVENUE VS EXPENSE) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 break-inside-avoid">
            
            {/* Revenue Ledger Card */}
            <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-zinc-200 bg-emerald-50/40 flex items-center justify-between">
                <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-widest flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  Client Revenue Breakdown
                </h3>
                <span className="text-sm font-black text-emerald-800 font-mono">₹ {(activeProject.incomeCollected || 0).toLocaleString('en-IN')}</span>
              </div>
              
              <div className="p-6 flex-1 space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
                  <div>
                    <p className="text-xs font-bold text-zinc-900">Approved Scope / Contract Estimate</p>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Value of signed estimate / client contract</p>
                  </div>
                  <p className="font-bold text-zinc-900 text-xs font-mono">₹ {(activeProject.estimationsTotal || 0).toLocaleString('en-IN')}</p>
                </div>

                <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
                  <div>
                    <p className="text-xs font-bold text-zinc-900">Official Tax Invoices Raised</p>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Billed output tax invoices</p>
                  </div>
                  <p className="font-bold text-zinc-900 text-xs font-mono">₹ {(activeProject.invoicedTotal || 0).toLocaleString('en-IN')}</p>
                </div>

                <div className="flex justify-between items-center bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                  <div>
                    <p className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Deposited Client Income</p>
                    <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-widest mt-0.5">Confirmed bank credit</p>
                  </div>
                  <p className="font-black text-emerald-800 text-base font-mono">₹ {(activeProject.incomeCollected || 0).toLocaleString('en-IN')}</p>
                </div>

                <div className="flex justify-between items-center pt-1 text-xs">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Pending Client Receivables</span>
                  <span className="font-black text-zinc-900 font-mono">
                    ₹ {Math.max(0, activeProject.invoicedTotal - activeProject.incomeCollected).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Direct Cost Ledger Card */}
            <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-zinc-200 bg-red-50/40 flex items-center justify-between">
                <h3 className="text-xs font-bold text-red-900 uppercase tracking-widest flex items-center gap-2">
                  <svg className="w-4 h-4 text-red-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
                  </svg>
                  Site Outflow Breakdown
                </h3>
                <span className="text-sm font-black text-red-800 font-mono">₹ {(activeProject.totalCost || 0).toLocaleString('en-IN')}</span>
              </div>
              
              <div className="p-6 flex-1 space-y-3.5">
                <div className="flex justify-between items-center pb-2.5 border-b border-zinc-100">
                  <div>
                    <p className="text-xs font-bold text-zinc-900">Direct Purchases & PO Bills</p>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Materials purchased directly for site</p>
                  </div>
                  <p className="font-bold text-zinc-900 text-xs font-mono">₹ {(activeProject.materialCost || 0).toLocaleString('en-IN')}</p>
                </div>

                <div className="flex justify-between items-center pb-2.5 border-b border-zinc-100">
                  <div>
                    <p className="text-xs font-bold text-zinc-900">Godown Stock Dispatches</p>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Central warehouse inventory (-OUT)</p>
                  </div>
                  <p className="font-bold text-zinc-900 text-xs font-mono">₹ {(activeProject.godownDispatchCost || 0).toLocaleString('en-IN')}</p>
                </div>

                <div className="flex justify-between items-center pb-2.5 border-b border-zinc-100">
                  <div>
                    <p className="text-xs font-bold text-zinc-900">Trade Contractors (Subs)</p>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Disbursed wages & milestone RA payments</p>
                  </div>
                  <p className="font-bold text-zinc-900 text-xs font-mono">₹ {(activeProject.subcontractorPaid || 0).toLocaleString('en-IN')}</p>
                </div>

                {activeProject.debitRecoveries > 0 && (
                  <div className="flex justify-between items-center pb-2.5 border-b border-zinc-100">
                    <div>
                      <p className="text-xs font-bold text-emerald-700">Less Material Debit Notes</p>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Recovered from trade settlements</p>
                    </div>
                    <p className="font-bold text-emerald-700 text-xs font-mono">- ₹ {(activeProject.debitRecoveries || 0).toLocaleString('en-IN')}</p>
                  </div>
                )}

                <div className="flex justify-between items-center pb-2.5 border-b border-zinc-100">
                  <div>
                    <p className="text-xs font-bold text-zinc-900">Site Petty Cash & Sundry</p>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Daily site food, transport, minor hardware</p>
                  </div>
                  <p className="font-bold text-zinc-900 text-xs font-mono">₹ {(activeProject.pettyCashExpenses || 0).toLocaleString('en-IN')}</p>
                </div>

                <div className="flex justify-between items-center bg-red-50 p-3.5 rounded-lg border border-red-200">
                  <div>
                    <p className="text-xs font-bold text-red-900 uppercase tracking-wider">Net Realized Outflow</p>
                  </div>
                  <p className="font-black text-red-800 text-base font-mono">₹ {(activeProject.totalCost || 0).toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>

          </div>

          {/* UNIFIED FINANCIAL TRANSACTIONS AUDIT STREAM */}
          <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden break-inside-avoid">
            <div className="p-5 border-b border-zinc-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white">
              <div>
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest">Chronological Financial Audit Stream</h3>
                <p className="text-xs text-zinc-500 font-medium mt-0.5">Every verified receipt, material delivery, Godown gate pass, and contractor payment.</p>
              </div>

              {/* Transaction Category Filter */}
              <div className="flex flex-wrap bg-zinc-100 p-1 rounded-lg border border-zinc-200">
                {['All', 'Income', 'Material', 'Inventory', 'Subcontractor', 'PettyCash', 'DebitRecovery'].map(filter => (
                  <button
                    key={filter}
                    onClick={() => setDetailFilter(filter)}
                    className={`px-3 py-1 rounded text-[9px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                      detailFilter === filter
                        ? 'bg-zinc-900 text-white shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    {filter === 'PettyCash' ? 'Petty Cash' : filter === 'DebitRecovery' ? 'Debit Recoveries' : filter}
                  </button>
                ))}
              </div>
            </div>
            
            {transactions.length === 0 ? (
              <div className="p-16 text-center text-zinc-400 text-xs font-bold uppercase tracking-widest bg-zinc-50">
                No financial transactions logged matching this filter.
              </div>
            ) : (
              <div className="overflow-x-auto bg-zinc-50/50">
                <table className="w-full text-left border-collapse whitespace-nowrap min-w-[950px]">
                  <thead>
                    <tr className="bg-zinc-50 text-zinc-500 text-[10px] uppercase tracking-widest font-bold border-b border-zinc-200 sticky top-0 z-10">
                      <th className="py-3.5 px-6 w-36">Date</th>
                      <th className="py-3.5 px-6 w-40">Classification</th>
                      <th className="py-3.5 px-6">Description / Particulars</th>
                      <th className="py-3.5 px-6 text-right w-44">Outflow (Debit)</th>
                      <th className="py-3.5 px-6 text-right w-44">Inflow (Credit)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-sm bg-white">
                    {transactions.map(txn => (
                      <tr key={txn.id} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="py-3.5 px-6 text-xs text-zinc-500 font-bold uppercase tracking-widest font-mono">{txn.date}</td>
                        <td className="py-3.5 px-6">
                          <span className={`text-[8px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded border ${
                            txn.isCredit 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                              : txn.type === 'Material'
                              ? 'bg-blue-50 text-blue-800 border-blue-300'
                              : txn.type === 'Inventory'
                              ? 'bg-zinc-100 text-zinc-800 border-zinc-300'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {txn.type}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 font-bold text-zinc-900 tracking-tight text-xs">{txn.desc}</td>
                        <td className="py-3.5 px-6 text-right font-black text-xs text-red-600 bg-red-50/20 font-mono">
                          {!txn.isCredit ? `₹ ${parseFloat(txn.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td className="py-3.5 px-6 text-right font-black text-xs text-emerald-700 bg-emerald-50/20 font-mono">
                          {txn.isCredit ? `₹ ${parseFloat(txn.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
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

  return null;
}