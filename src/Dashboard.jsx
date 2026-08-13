import React, { useState, useEffect } from 'react';
import { getInvoices, getPurchases, getVendorLedgers, getProjects } from './db';

export default function Dashboard({ setActivePage }) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalReceived: 0,
    pendingInvoices: 0,
    unpaidPurchases: 0,
    availableFunds: 499700, // Hardcoded for demo based on your screenshot
    urgentPayables: []
  });

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      const [invoices, purchases, vendors, projects] = await Promise.all([
        getInvoices(), getPurchases(), getVendorLedgers(), getProjects()
      ]);

      // Calculate Total Received (Advance + Amount if not cancelled)
      const received = invoices.filter(i => !i.isCancelled).reduce((sum, i) => sum + (Number(i.advanceReceived) || 0), 0);
      
      // Calculate Pending Invoices (Billed - Advance)
      const pendingInv = invoices.filter(i => !i.isCancelled).reduce((sum, i) => {
        const total = Number(i.amount) || 0;
        const adv = Number(i.advanceReceived) || 0;
        return sum + (total > adv ? total - adv : 0);
      }, 0);

      // Calculate Unpaid Purchases
      const unpaid = vendors.reduce((sum, v) => sum + (v.balance > 0 ? v.balance : 0), 0);

      setMetrics({
        totalReceived: received,
        pendingInvoices: pendingInv,
        unpaidPurchases: unpaid,
        availableFunds: 499700, // Placeholder
        urgentPayables: vendors.filter(v => v.balance > 0).sort((a,b) => b.balance - a.balance).slice(0, 3)
      });
      setLoading(false);
    }
    loadDashboard();
  }, []);

  if (loading) return <div className="py-20 text-center text-zinc-400 font-medium text-xs">Loading Command Center...</div>;

  return (
    <div className="w-full font-['Poppins'] pb-12">
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold text-zinc-800 tracking-tight">Graphical Command Center</h2>
        <p className="text-zinc-500 text-xs mt-1 font-medium">Real-time charts and job costing visualizations.</p>
      </div>

      {/* TOP KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/80 backdrop-blur-xl border border-zinc-200 p-5 rounded-2xl shadow-sm">
          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Total Received</span>
          <p className="text-xl font-bold text-emerald-600">₹ {metrics.totalReceived.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-xl border border-zinc-200 p-5 rounded-2xl shadow-sm">
          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Pending Invoices</span>
          <p className="text-xl font-bold text-blue-600">₹ {metrics.pendingInvoices.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-xl border border-zinc-200 p-5 rounded-2xl shadow-sm">
          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Unpaid Purchases</span>
          <p className="text-xl font-bold text-amber-600">₹ {metrics.unpaidPurchases.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl shadow-lg">
          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Available Funds</span>
          <p className="text-xl font-black text-emerald-400">₹ {metrics.availableFunds.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* MIDDLE SECTION: CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* BAR CHART */}
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl border border-zinc-200 p-6 rounded-3xl shadow-sm flex flex-col">
          <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-widest mb-6">Revenue vs Cost Analysis</h3>
          <div className="flex-1 relative flex items-end justify-around pb-6 pt-4 border-b border-zinc-200">
            {/* Grid Lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
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
              <div key={i} className="flex gap-2 items-end z-10 h-40">
                <div className="w-4 bg-zinc-800 rounded-t-sm" style={{ height: `${d.cost}%` }}></div>
                <div className="w-4 bg-emerald-400 rounded-t-sm" style={{ height: `${d.rev}%` }}></div>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-zinc-800"></span><span className="text-[10px] font-bold text-zinc-500 uppercase">Expense Flow</span></div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-400"></span><span className="text-[10px] font-bold text-zinc-500 uppercase">Income Flow</span></div>
          </div>
        </div>

        {/* DOUGHNUT CHART */}
        <div className="bg-white/80 backdrop-blur-xl border border-zinc-200 p-6 rounded-3xl shadow-sm flex flex-col items-center">
          <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-widest w-full text-left mb-6">Cash Distribution</h3>
          
          <div className="relative w-40 h-40 rounded-full flex items-center justify-center mb-8" 
               style={{ background: 'conic-gradient(#34d399 0% 65%, #fbbf24 65% 85%, #f87171 85% 100%)' }}>
            <div className="w-28 h-28 bg-white rounded-full"></div>
          </div>

          <div className="w-full space-y-3">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"></span><span className="font-semibold text-zinc-600">Funds Available</span></div>
              <span className="font-bold text-zinc-900">65%</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-400"></span><span className="font-semibold text-zinc-600">Expenses Paid</span></div>
              <span className="font-bold text-zinc-900">20%</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-400"></span><span className="font-semibold text-zinc-600">Pending Dues</span></div>
              <span className="font-bold text-zinc-900">15%</span>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl border border-zinc-200 p-6 rounded-3xl shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-widest">Site Costing vs Budget</h3>
            <button onClick={() => setActivePage('Project P&L')} className="text-[10px] font-bold text-blue-500 hover:underline uppercase">View All</button>
          </div>
          <p className="text-xs text-zinc-500">Navigate to the <span className="font-bold">Project P&L</span> tab for detailed breakdown of budget vs actuals.</p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl border border-zinc-200 p-6 rounded-3xl shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-widest">Urgent Payables</h3>
            <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{metrics.urgentPayables.length}</span>
          </div>
          {metrics.urgentPayables.length === 0 ? (
            <p className="text-xs text-zinc-500">No urgent vendor dues.</p>
          ) : (
            <div className="space-y-4">
              {metrics.urgentPayables.map((v, idx) => (
                <div key={idx} className="flex justify-between items-center border-b border-zinc-100 pb-2 last:border-0 last:pb-0">
                  <div>
                    <p className="text-xs font-bold text-zinc-800">{v.vendorName}</p>
                    <button onClick={() => setActivePage('Vendor Ledger')} className="text-[9px] font-bold text-zinc-400 uppercase hover:text-blue-500 mt-0.5 block">Resolve &rarr;</button>
                  </div>
                  <span className="text-sm font-bold text-red-600">₹{v.balance.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}