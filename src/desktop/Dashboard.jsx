import React, { useState, useEffect } from 'react';
import { getInvoices, getPurchases, getVendorLedgers, getProjects } from '../db';

export default function Dashboard({ setActivePage }) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalReceived: 0,
    pendingInvoices: 0,
    unpaidPurchases: 0,
    availableFunds: 0,
    urgentPayables: [],
    chartData: [],
    cashDistribution: { avail: 100, exp: 0, pend: 0, gradient: '' },
    activeProjects: []
  });

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      try {
        const [invoices, purchases, vendors, projects] = await Promise.all([
          getInvoices(), getPurchases(), getVendorLedgers(), getProjects()
        ]);

        // Helper to safely extract numbers from formatted currency strings (e.g., "₹ 24,190.00" -> 24190)
        const parseAmt = (val) => Number(val?.toString().replace(/[^0-9.-]+/g, "")) || 0;

        // --- 1. KPI CALCULATIONS ---
        const received = invoices.filter(i => !i.isCancelled).reduce((sum, i) => sum + parseAmt(i.advanceReceived), 0);
        
        const pendingInv = invoices.filter(i => !i.isCancelled).reduce((sum, i) => {
          const total = parseAmt(i.amount);
          const adv = parseAmt(i.advanceReceived);
          return sum + (total > adv ? total - adv : 0);
        }, 0);

        const unpaid = vendors.reduce((sum, v) => sum + (parseAmt(v.balance) > 0 ? parseAmt(v.balance) : 0), 0);

        // Assume paid purchases (either from amountPaid field, or totalAmount if no balance)
        const paidPurchases = purchases.reduce((sum, p) => sum + parseAmt(p.amountPaid || p.paidAmount || 0), 0);
        
        const funds = Math.max(received - paidPurchases, 0); // Basic cash-on-hand formula

        // --- 2. BAR CHART (Last 6 Months Dynamic) ---
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const last6Months = [];
        const rawChartData = [];
        const d = new Date();
        d.setMonth(d.getMonth() - 5); // Go back 5 months + current month = 6
        
        for(let i = 0; i < 6; i++) {
          last6Months.push({ month: d.getMonth(), year: d.getFullYear(), label: monthNames[d.getMonth()] });
          d.setMonth(d.getMonth() + 1);
        }

        last6Months.forEach(m => {
          const mInvs = invoices.filter(inv => {
            if (!inv.date || inv.isCancelled) return false;
            const idate = new Date(inv.date);
            return idate.getMonth() === m.month && idate.getFullYear() === m.year;
          });
          const mPur = purchases.filter(p => {
            if (!p.date) return false;
            const pdate = new Date(p.date);
            return pdate.getMonth() === m.month && pdate.getFullYear() === m.year;
          });

          const rev = mInvs.reduce((sum, inv) => sum + parseAmt(inv.amount), 0);
          const cost = mPur.reduce((sum, p) => sum + parseAmt(p.totalAmount || p.amount), 0);
          rawChartData.push({ label: m.label, rev, cost });
        });

        // Normalize bar heights relative to the highest value in the 6-month period
        const maxVal = Math.max(...rawChartData.map(d => Math.max(d.rev, d.cost)), 1); 
        const chartData = rawChartData.map(d => ({
          ...d,
          revHeight: (d.rev / maxVal) * 100,
          costHeight: (d.cost / maxVal) * 100
        }));

        // --- 3. CASH DISTRIBUTION (Doughnut Chart) ---
        const totalCashFlow = (funds + paidPurchases + unpaid) || 1; // Prevent div by 0
        const pctAvail = Math.round((funds / totalCashFlow) * 100);
        const pctExp = Math.round((paidPurchases / totalCashFlow) * 100);
        const pctPend = 100 - pctAvail - pctExp; 
        
        const gradient = `conic-gradient(#34d399 0% ${pctAvail}%, #fbbf24 ${pctAvail}% ${pctAvail + pctExp}%, #f87171 ${pctAvail + pctExp}% 100%)`;

        // --- 4. TOP ACTIVE PROJECTS ---
        const activeProjects = projects.slice(0, 3).map(p => ({
          name: p.projectName || 'Unnamed Project',
          budget: parseAmt(p.budget),
          cost: parseAmt(p.actualCost || 0)
        }));

        setMetrics({
          totalReceived: received,
          pendingInvoices: pendingInv,
          unpaidPurchases: unpaid,
          availableFunds: funds,
          urgentPayables: vendors.filter(v => parseAmt(v.balance) > 0).sort((a,b) => parseAmt(b.balance) - parseAmt(a.balance)).slice(0, 3),
          chartData,
          cashDistribution: { avail: pctAvail, exp: pctExp, pend: pctPend, gradient },
          activeProjects
        });
      } catch (e) {
        console.warn("Dashboard data loaded with fallback defaults.", e);
      }
      setLoading(false);
    }
    loadDashboard();
  }, []);

  if (loading) return <div className="py-20 text-center text-zinc-400 font-medium text-xs">Syncing real-time financials...</div>;

  const cardClass = "bg-white border border-zinc-200 p-6 rounded-[2rem] shadow-sm";

  return (
    <div className="w-full font-sans flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Graphical Command Center</h2>
        <p className="text-zinc-500 text-xs mt-1 font-medium">Real-time charts and job costing visualizations.</p>
      </div>

      {/* TOP KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className={cardClass}>
          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Total Received</span>
          <p className="text-2xl font-semibold text-[11px] text-emerald-600">₹ {metrics.totalReceived.toLocaleString('en-IN')}</p>
        </div>
        <div className={cardClass}>
          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Pending Invoices</span>
          <p className="text-2xl font-semibold text-[11px] text-blue-600">₹ {metrics.pendingInvoices.toLocaleString('en-IN')}</p>
        </div>
        <div className={cardClass}>
          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Unpaid Purchases</span>
          <p className="text-2xl font-semibold text-[11px] text-amber-600">₹ {metrics.unpaidPurchases.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem] shadow-lg">
          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Available Funds</span>
          <p className="text-2xl font-semibold text-[11px] text-emerald-400">₹ {metrics.availableFunds.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* MIDDLE SECTION: CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* BAR CHART */}
        <div className={`lg:col-span-2 ${cardClass} flex flex-col`}>
          <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest mb-6">Revenue vs Cost (Last 6 Months)</h3>
          <div className="flex-1 relative flex items-end justify-around pb-6 pt-8 border-b border-zinc-100">
            {/* Grid Lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              <div className="border-b border-dashed border-zinc-200 w-full h-0"></div>
              <div className="border-b border-dashed border-zinc-200 w-full h-0"></div>
              <div className="border-b border-dashed border-zinc-200 w-full h-0"></div>
              <div className="border-b border-dashed border-zinc-200 w-full h-0"></div>
            </div>
            
            {/* Dynamic Data Bars */}
            {metrics.chartData.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-2 z-10 h-48 justify-end group">
                <div className="flex gap-2 items-end h-full">
                  <div 
                    title={`Cost: ₹${d.cost.toLocaleString('en-IN')}`}
                    className="w-4 sm:w-6 bg-zinc-800 rounded-t-md transition-all duration-300 hover:opacity-80" 
                    style={{ height: `${Math.max(d.costHeight, 2)}%` }}
                  ></div>
                  <div 
                    title={`Revenue: ₹${d.rev.toLocaleString('en-IN')}`}
                    className="w-4 sm:w-6 bg-emerald-400 rounded-t-md transition-all duration-300 hover:opacity-80" 
                    style={{ height: `${Math.max(d.revHeight, 2)}%` }}
                  ></div>
                </div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase">{d.label}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-8 mt-4">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-zinc-800"></span><span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Expense Flow</span></div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-400"></span><span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Income Flow</span></div>
          </div>
        </div>

        {/* DOUGHNUT CHART */}
        <div className={`${cardClass} flex flex-col items-center justify-between`}>
          <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest w-full text-left mb-6">Cash Distribution</h3>
          
          <div className="relative w-48 h-48 rounded-full flex items-center justify-center my-4 shadow-inner transition-all duration-500" 
               style={{ background: metrics.cashDistribution.gradient }}>
            <div className="w-32 h-32 bg-white rounded-full flex flex-col items-center justify-center shadow-md">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Health</span>
              <span className="text-sm font-semibold text-[11px] text-emerald-500">{metrics.cashDistribution.avail}%</span>
            </div>
          </div>

          <div className="w-full space-y-3 pt-4 border-t border-zinc-100">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span><span className="font-semibold text-zinc-600">Funds Available</span></div>
              <span className="font-bold text-zinc-900">{metrics.cashDistribution.avail}%</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span><span className="font-semibold text-zinc-600">Expenses Paid</span></div>
              <span className="font-bold text-zinc-900">{metrics.cashDistribution.exp}%</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-400"></span><span className="font-semibold text-zinc-600">Pending Dues</span></div>
              <span className="font-bold text-zinc-900">{metrics.cashDistribution.pend}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className={`lg:col-span-2 ${cardClass}`}>
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest">Active Projects Snapshot</h3>
            <button onClick={() => setActivePage('Projects')} className="text-[10px] font-bold text-[#1E3A8A] hover:underline uppercase tracking-wider cursor-pointer">All Projects &rarr;</button>
          </div>
          
          {metrics.activeProjects.length === 0 ? (
            <p className="text-xs text-zinc-500 font-medium">No active projects found. Start creating projects to track costs.</p>
          ) : (
            <div className="space-y-4">
              {metrics.activeProjects.map((p, idx) => (
                <div key={idx} className="flex justify-between items-center border-b border-zinc-100 pb-3 last:border-0 last:pb-0">
                  <div className="flex-1">
                    <p className="text-xs font-bold text-zinc-900 truncate pr-4">{p.name}</p>
                    <p className="text-[10px] text-zinc-500 font-medium mt-0.5">
                      Cost: <span className="text-amber-600 font-bold">₹{p.cost.toLocaleString('en-IN')}</span> / Budget: ₹{p.budget.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="w-24 bg-zinc-100 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${p.cost > p.budget ? 'bg-red-500' : 'bg-emerald-400'}`} 
                      style={{ width: `${Math.min((p.cost / (p.budget || 1)) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={cardClass}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest">Urgent Payables</h3>
            <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2.5 py-0.5 rounded-full">{metrics.urgentPayables.length}</span>
          </div>
          {metrics.urgentPayables.length === 0 ? (
            <p className="text-xs text-zinc-500 font-medium pt-2">No urgent vendor dues. You're all clear!</p>
          ) : (
            <div className="space-y-3">
              {metrics.urgentPayables.map((v, idx) => (
                <div key={idx} className="flex justify-between items-center border-b border-zinc-100 pb-2.5 last:border-0 last:pb-0">
                  <div>
                    <p className="text-xs font-bold text-zinc-900 max-w-[140px] truncate">{v.vendorName || v.name}</p>
                    <button onClick={() => setActivePage('Vendor Ledger')} className="text-[9px] font-bold text-[#1E3A8A] uppercase hover:underline mt-0.5 block cursor-pointer">Resolve &rarr;</button>
                  </div>
                  <span className="text-xs font-semibold text-[11px] text-red-500">₹{Number(v.balance).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}