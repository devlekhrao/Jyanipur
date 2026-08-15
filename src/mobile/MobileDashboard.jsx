import React, { useState, useEffect } from 'react';
import { getInvoices, getPurchases, getVendorLedgers, getProjects } from '../db';

export default function MobileDashboard({ setActiveTab }) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalReceived: 0,
    pendingInvoices: 0,
    unpaidPurchases: 0,
    availableFunds: 499700,
    urgentPayables: []
  });

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      try {
        const [invoices, purchases, vendors, projects] = await Promise.all([
          getInvoices(), getPurchases(), getVendorLedgers(), getProjects()
        ]);

        const received = invoices.filter(i => !i.isCancelled).reduce((sum, i) => sum + (Number(i.advanceReceived) || 0), 0);
        
        const pendingInv = invoices.filter(i => !i.isCancelled).reduce((sum, i) => {
          const total = Number(i.amount) || 0;
          const adv = Number(i.advanceReceived) || 0;
          return sum + (total > adv ? total - adv : 0);
        }, 0);

        const unpaid = vendors.reduce((sum, v) => sum + (v.balance > 0 ? v.balance : 0), 0);

        setMetrics({
          totalReceived: received,
          pendingInvoices: pendingInv,
          unpaidPurchases: unpaid,
          availableFunds: 499700,
          urgentPayables: vendors.filter(v => v.balance > 0).sort((a,b) => b.balance - a.balance).slice(0, 3)
        });
      } catch (e) {
        console.warn("Dashboard data loaded with fallback defaults.");
      }
      setLoading(false);
    }
    loadDashboard();
  }, []);

  if (loading) return <div className="py-20 text-center text-zinc-400 font-medium text-xs">Loading Command Center...</div>;

  return (
    <div className="w-full flex flex-col space-y-6 pb-6">
      
      {/* HEADER */}
      <div>
        <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Command Center</h2>
        <p className="text-zinc-500 text-[10px] mt-1 font-bold uppercase tracking-widest">Real-time Financials</p>
      </div>

      {/* iOS HERO KPI CARD */}
      <div className="bg-[#1E3A8A] border border-blue-800 p-6 rounded-[2rem] shadow-lg text-white relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        <span className="text-[10px] font-bold text-blue-200 uppercase tracking-widest block mb-1">Available Funds</span>
        <p className="text-3xl font-black tracking-tight">₹ {metrics.availableFunds.toLocaleString('en-IN')}</p>
      </div>

      {/* SWIPEABLE SECONDARY KPIs */}
      <div className="flex gap-4 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] -mx-4 px-4 pb-2">
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
      <div className="bg-white border border-zinc-200 p-6 rounded-[2rem] shadow-sm flex flex-col items-center justify-between">
        <div className="w-full flex justify-between items-center mb-6">
          <h3 className="text-xs font-extrabold text-zinc-900 uppercase tracking-widest">Cash Distribution</h3>
        </div>
        
        {/* Adjusted size for iPhone screens */}
        <div className="relative w-40 h-40 rounded-full flex items-center justify-center my-2 shadow-inner" 
             style={{ background: 'conic-gradient(#34d399 0% 65%, #fbbf24 65% 85%, #f87171 85% 100%)' }}>
          <div className="w-28 h-28 bg-white rounded-full flex flex-col items-center justify-center shadow-md">
            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Ratio</span>
            <span className="text-sm font-black text-zinc-900">100%</span>
          </div>
        </div>

        <div className="w-full space-y-3 pt-6 mt-4 border-t border-zinc-100">
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-400"></span><span className="font-semibold text-zinc-600">Funds Available</span></div>
            <span className="font-extrabold text-zinc-900">65%</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-400"></span><span className="font-semibold text-zinc-600">Expenses Paid</span></div>
            <span className="font-extrabold text-zinc-900">20%</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-400"></span><span className="font-semibold text-zinc-600">Pending Dues</span></div>
            <span className="font-extrabold text-zinc-900">15%</span>
          </div>
        </div>
      </div>

      {/* REVENUE VS COST ANALYSIS (BAR CHART) */}
      <div className="bg-white border border-zinc-200 p-6 rounded-[2rem] shadow-sm flex flex-col">
        <h3 className="text-xs font-extrabold text-zinc-900 uppercase tracking-widest mb-6">Revenue vs Cost</h3>
        <div className="flex-1 relative flex items-end justify-between pb-6 pt-8 border-b border-zinc-100 h-48 px-2">
          {/* Grid Lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6">
            <div className="border-b border-dashed border-zinc-200 w-full h-0"></div>
            <div className="border-b border-dashed border-zinc-200 w-full h-0"></div>
            <div className="border-b border-dashed border-zinc-200 w-full h-0"></div>
            <div className="border-b border-dashed border-zinc-200 w-full h-0"></div>
          </div>
          
          {/* Mock Data Bars */}
          {[
            { month: 'Apr', rev: 40, cost: 20 },
            { month: 'May', rev: 60, cost: 35 },
            { month: 'Jun', rev: 30, cost: 50 },
            { month: 'Jul', rev: 80, cost: 45 },
            { month: 'Aug', rev: 95, cost: 60 },
          ].map((d, i) => (
            <div key={i} className="flex gap-1.5 items-end z-10 h-full relative">
              <div className="w-3 bg-zinc-800 rounded-t-md" style={{ height: `${d.cost}%` }}></div>
              <div className="w-3 bg-emerald-400 rounded-t-md" style={{ height: `${d.rev}%` }}></div>
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-zinc-400 uppercase">{d.month}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-6 mt-6">
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-zinc-800"></span><span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Expense</span></div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-400"></span><span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Income</span></div>
        </div>
      </div>

      {/* URGENT PAYABLES (MOBILE LIST) */}
      <div className="bg-white border border-zinc-200 p-6 rounded-[2rem] shadow-sm">
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
                  <p className="text-xs font-extrabold text-zinc-900">{v.vendorName}</p>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Pending Dues</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-red-500 block">₹{v.balance.toLocaleString('en-IN')}</span>
                  <button 
                    onClick={() => setActiveTab('Vendor Ledger')} 
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