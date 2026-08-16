import React, { useState, useEffect } from 'react';
import { getInvoices, getPurchases, getVendorLedgers, getProjects } from '../db';

export default function MobileDashboard({ setActiveTab }) {
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

        // Helper to safely extract numbers from formatted currency strings
        const parseAmt = (val) => Number(val?.toString().replace(/[^0-9.-]+/g, "")) || 0;

        // --- 1. KPI CALCULATIONS ---
        const received = invoices.filter(i => !i.isCancelled).reduce((sum, i) => sum + parseAmt(i.advanceReceived), 0);
        
        const pendingInv = invoices.filter(i => !i.isCancelled).reduce((sum, i) => {
          const total = parseAmt(i.amount);
          const adv = parseAmt(i.advanceReceived);
          return sum + (total > adv ? total - adv : 0);
        }, 0);

        const unpaid = vendors.reduce((sum, v) => sum + (parseAmt(v.balance) > 0 ? parseAmt(v.balance) : 0), 0);

        const paidPurchases = purchases.reduce((sum, p) => sum + parseAmt(p.amountPaid || p.paidAmount || 0), 0);
        
        const funds = Math.max(received - paidPurchases, 0);

        // --- 2. BAR CHART (Last 6 Months Dynamic) ---
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const last6Months = [];
        const rawChartData = [];
        const d = new Date();
        d.setMonth(d.getMonth() - 5); 
        
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

        const maxVal = Math.max(...rawChartData.map(d => Math.max(d.rev, d.cost)), 1); 
        const chartData = rawChartData.map(d => ({
          ...d,
          revHeight: (d.rev / maxVal) * 100,
          costHeight: (d.cost / maxVal) * 100
        }));

        // --- 3. CASH DISTRIBUTION (Doughnut Chart) ---
        const totalCashFlow = (funds + paidPurchases + unpaid) || 1; 
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
        console.warn("Dashboard data loaded with fallback defaults.");
      }
      setLoading(false);
    }
    loadDashboard();
  }, []);

  if (loading) return <div className="py-20 text-center text-zinc-400 font-medium text-xs">Syncing Command Center...</div>;

  return (
    // FIXED: Added h-full, overflow-y-auto, and pb-32 for perfect mobile scrolling
    <div className="w-full h-full overflow-y-auto pb-32 flex flex-col space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      
      {/* HEADER */}
      <div className="pt-2">
        <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Command Center</h2>
        <p className="text-zinc-500 text-[10px] mt-1 font-bold uppercase tracking-widest">Real-time Financials</p>
      </div>

      {/* iOS HERO KPI CARD */}
      <div className="bg-[#1E3A8A] border border-blue-800 p-6 rounded-[2rem] shadow-lg text-white relative overflow-hidden shrink-0">
        <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        <span className="text-[10px] font-bold text-blue-200 uppercase tracking-widest block mb-1">Available Funds</span>
        <p className="text-3xl font-black tracking-tight">₹ {metrics.availableFunds.toLocaleString('en-IN')}</p>
      </div>

      {/* SWIPEABLE SECONDARY KPIs */}
      <div className="flex gap-4 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] -mx-3 px-3 pb-2 shrink-0">
        <div className="bg-white border border-zinc-200 p-5 rounded-[1.5rem] shadow-sm min-w-[150px] shrink-0">
          <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block mb-1">Received</span>
          <p className="text-xl font-black text-emerald-600">₹ {metrics.totalReceived.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white border border-zinc-200 p-5 rounded-[1.5rem] shadow-sm min-w-[150px] shrink-0">
          <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block mb-1">Pending Invoices</span>
          <p className="text-xl font-black text-[#1E3A8A]">₹ {metrics.pendingInvoices.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white border border-zinc-200 p-5 rounded-[1.5rem] shadow-sm min-w-[150px] shrink-0">
          <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block mb-1">Unpaid Purchases</span>
          <p className="text-xl font-black text-red-500">₹ {metrics.unpaidPurchases.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* CASH DISTRIBUTION (DOUGHNUT) */}
      <div className="bg-white border border-zinc-200 p-6 rounded-[2rem] shadow-sm flex flex-col items-center justify-between shrink-0">
        <div className="w-full flex justify-between items-center mb-6">
          <h3 className="text-xs font-extrabold text-zinc-900 uppercase tracking-widest">Cash Distribution</h3>
        </div>
        
        <div className="relative w-40 h-40 rounded-full flex items-center justify-center my-2 shadow-inner transition-all duration-500" 
             style={{ background: metrics.cashDistribution.gradient }}>
          <div className="w-28 h-28 bg-white rounded-full flex flex-col items-center justify-center shadow-md">
            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Health</span>
            <span className="text-sm font-black text-emerald-500">{metrics.cashDistribution.avail}%</span>
          </div>
        </div>

        <div className="w-full space-y-3 pt-6 mt-4 border-t border-zinc-100">
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-400"></span><span className="font-semibold text-zinc-600">Funds Available</span></div>
            <span className="font-extrabold text-zinc-900">{metrics.cashDistribution.avail}%</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-400"></span><span className="font-semibold text-zinc-600">Expenses Paid</span></div>
            <span className="font-extrabold text-zinc-900">{metrics.cashDistribution.exp}%</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-400"></span><span className="font-semibold text-zinc-600">Pending Dues</span></div>
            <span className="font-extrabold text-zinc-900">{metrics.cashDistribution.pend}%</span>
          </div>
        </div>
      </div>

      {/* REVENUE VS COST ANALYSIS (BAR CHART) */}
      <div className="bg-white border border-zinc-200 p-6 rounded-[2rem] shadow-sm flex flex-col shrink-0">
        <h3 className="text-xs font-extrabold text-zinc-900 uppercase tracking-widest mb-6">Revenue vs Cost</h3>
        <div className="flex-1 relative flex items-end justify-between pb-6 pt-8 border-b border-zinc-100 h-48 px-2">
          {/* Grid Lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6">
            <div className="border-b border-dashed border-zinc-200 w-full h-0"></div>
            <div className="border-b border-dashed border-zinc-200 w-full h-0"></div>
            <div className="border-b border-dashed border-zinc-200 w-full h-0"></div>
            <div className="border-b border-dashed border-zinc-200 w-full h-0"></div>
          </div>
          
          {/* Dynamic Data Bars */}
          {metrics.chartData.map((d, i) => (
            <div key={i} className="flex gap-1.5 items-end z-10 h-full relative group">
              <div className="w-3 bg-zinc-800 rounded-t-md transition-all duration-300" style={{ height: `${Math.max(d.costHeight, 2)}%` }}></div>
              <div className="w-3 bg-emerald-400 rounded-t-md transition-all duration-300" style={{ height: `${Math.max(d.revHeight, 2)}%` }}></div>
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-zinc-400 uppercase">{d.label}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-6 mt-6">
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-zinc-800"></span><span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Expense</span></div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-400"></span><span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Income</span></div>
        </div>
      </div>

      {/* ACTIVE PROJECTS (MOBILE LIST) */}
      <div className="bg-white border border-zinc-200 p-6 rounded-[2rem] shadow-sm shrink-0">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-xs font-extrabold text-zinc-900 uppercase tracking-widest">Active Projects</h3>
          <button onClick={() => setActiveTab('Projects')} className="text-[9px] font-bold text-[#1E3A8A] hover:underline uppercase tracking-wider cursor-pointer">View All &rarr;</button>
        </div>
        
        {metrics.activeProjects.length === 0 ? (
          <p className="text-xs text-zinc-500 font-medium py-2 text-center">No active projects found.</p>
        ) : (
          <div className="space-y-4">
            {metrics.activeProjects.map((p, idx) => (
              <div key={idx} className="flex flex-col border-b border-zinc-100 pb-4 last:border-0 last:pb-0">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xs font-bold text-zinc-900 truncate pr-2">{p.name}</p>
                </div>
                <div className="flex justify-between items-center text-[10px] font-medium mb-1.5">
                  <span className="text-amber-600 font-bold">₹{p.cost.toLocaleString('en-IN')}</span>
                  <span className="text-zinc-400">Budget: ₹{p.budget.toLocaleString('en-IN')}</span>
                </div>
                <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
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

      {/* URGENT PAYABLES (MOBILE LIST) */}
      <div className="bg-white border border-zinc-200 p-6 rounded-[2rem] shadow-sm shrink-0">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-xs font-extrabold text-zinc-900 uppercase tracking-widest">Urgent Payables</h3>
          <span className="bg-red-50 text-red-600 text-[10px] font-black px-2.5 py-1 rounded-lg border border-red-100">{metrics.urgentPayables.length}</span>
        </div>
        {metrics.urgentPayables.length === 0 ? (
          <p className="text-xs text-zinc-500 font-medium py-4 text-center">No urgent vendor dues.</p>
        ) : (
          <div className="space-y-3">
            {metrics.urgentPayables.map((v, idx) => (
              <div key={idx} className="flex justify-between items-center bg-zinc-50 p-4 rounded-2xl border border-zinc-100 active:scale-95 transition-transform">
                <div>
                  <p className="text-xs font-extrabold text-zinc-900 max-w-[120px] truncate">{v.vendorName || v.name}</p>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Pending Dues</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-red-500 block">₹{Number(v.balance).toLocaleString('en-IN')}</span>
                  <button 
                    onClick={() => setActiveTab('Vendors')} 
                    className="text-[9px] font-extrabold text-[#1E3A8A] uppercase tracking-wider mt-1 cursor-pointer"
                  >
                    Resolve &rarr;
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}