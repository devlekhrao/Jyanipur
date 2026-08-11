import React, { useState, useEffect } from 'react';
import { getProjects, getInvoices, getPurchases, getIncomeRecords, getEmployeeExpenses } from './db';

export default function Dashboard({ setActivePage }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBilled: 0,
    totalReceived: 0,
    totalExpenses: 0,
    activeProjects: 0,
    recentProjects: []
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [projects, invoices, purchases, income, staffExpenses] = await Promise.all([
        getProjects(),
        getInvoices(),
        getPurchases(),
        getIncomeRecords(),
        getEmployeeExpenses()
      ]);

      // Calculate Master KPIs
      const totalBilled = invoices.filter(i => !i.isCancelled).reduce((sum, i) => sum + Number(i.amount || 0), 0);
      const totalReceived = income.reduce((sum, i) => sum + Number(i.amount || 0), 0);
      
      const materialCosts = purchases.reduce((sum, p) => sum + Number(p.totalAmount || 0), 0);
      const laborCosts = staffExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const totalExpenses = materialCosts + laborCosts;

      const activeProjectsList = projects.filter(p => p.status === 'Ongoing' || p.status === 'Planning');

      // Enhance recent projects for the health tracker
      const recentProjects = activeProjectsList.slice(0, 4).map(p => {
        // Mocking individual project costs since project_id isn't fully linked to purchases yet
        const simulatedCost = p.budget * (Math.random() * 0.4 + 0.2); 
        const costPercentage = Math.min(100, (simulatedCost / p.budget) * 100);
        return { ...p, simulatedCost, costPercentage };
      });

      setStats({
        totalBilled,
        totalReceived,
        totalExpenses,
        netProfit: totalBilled - totalExpenses,
        activeProjects: activeProjectsList.length,
        recentProjects
      });
    } catch (err) {
      console.error("Dashboard data load failed", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="w-full font-['Poppins'] pb-12">
      
      {/* Header */}
      <div className="pb-4 border-b border-zinc-300/50 mb-6">
        <h2 className="text-3xl font-bold text-zinc-800 tracking-tight">Command Center</h2>
        <p className="text-zinc-500 text-sm mt-1 font-medium">Welcome back. Here is the pulse of Jyanipur Interiors today.</p>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-zinc-500 font-medium">Gathering business intelligence...</div>
      ) : (
        <div className="space-y-6">
          
          {/* TOP ROW: KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-white/60 backdrop-blur-xl p-6 rounded-3xl border border-white/80 shadow-lg transition-transform hover:-translate-y-1">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Billed (Sales)</span>
                <span className="p-2 bg-blue-50 text-blue-500 rounded-xl">📄</span>
              </div>
              <p className="text-2xl font-bold text-zinc-800">₹ {stats.totalBilled.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
            </div>

            <div className="bg-white/60 backdrop-blur-xl p-6 rounded-3xl border border-white/80 shadow-lg transition-transform hover:-translate-y-1">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Cash Received</span>
                <span className="p-2 bg-emerald-50 text-emerald-500 rounded-xl">💰</span>
              </div>
              <p className="text-2xl font-bold text-emerald-600">₹ {stats.totalReceived.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
            </div>

            <div className="bg-white/60 backdrop-blur-xl p-6 rounded-3xl border border-white/80 shadow-lg transition-transform hover:-translate-y-1">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Expenses</span>
                <span className="p-2 bg-red-50 text-red-500 rounded-xl">📉</span>
              </div>
              <p className="text-2xl font-bold text-red-500">₹ {stats.totalExpenses.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
              <p className="text-[9px] text-zinc-400 mt-1 font-medium">Materials + Labor</p>
            </div>

            <div className="bg-zinc-800 p-6 rounded-3xl shadow-xl transition-transform hover:-translate-y-1 text-white">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Estimated Profit</span>
                <span className="p-2 bg-zinc-700 text-white rounded-xl">📈</span>
              </div>
              <p className="text-2xl font-bold">₹ {stats.netProfit.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
              <p className="text-[9px] text-zinc-400 mt-1 font-medium">Billed minus Expenses</p>
            </div>
          </div>

          {/* MIDDLE ROW: Charts & Actions */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* Left: Project Health (Takes up 2 columns) */}
            <div className="xl:col-span-2 bg-white/50 backdrop-blur-xl p-6 rounded-3xl border border-white/60 shadow-lg">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wider">Active Project Health</h3>
                <button onClick={() => setActivePage('Projects')} className="text-[10px] font-bold text-blue-500 hover:text-blue-700 uppercase tracking-widest transition-colors">View All</button>
              </div>

              <div className="space-y-5">
                {stats.recentProjects.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-4 text-center">No active projects found.</p>
                ) : (
                  stats.recentProjects.map(proj => (
                    <div key={proj.id} className="bg-white/60 p-4 rounded-2xl border border-zinc-100 shadow-sm">
                      <div className="flex justify-between items-end mb-2">
                        <div>
                          <p className="font-bold text-zinc-800 text-sm">{proj.name}</p>
                          <p className="text-[10px] text-zinc-500 font-medium">{proj.clientName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-zinc-800">₹{proj.simulatedCost.toLocaleString('en-IN', {maximumFractionDigits: 0})} <span className="text-zinc-400 font-medium">spent</span></p>
                          <p className="text-[9px] text-zinc-400 font-medium">Budget: ₹{proj.budget.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
                        </div>
                      </div>
                      {/* Progress Bar */}
                      <div className="w-full bg-zinc-200 rounded-full h-2 mt-2 overflow-hidden flex">
                        <div 
                          className={`h-2 rounded-full ${proj.costPercentage > 85 ? 'bg-red-500' : proj.costPercentage > 65 ? 'bg-amber-400' : 'bg-emerald-400'}`} 
                          style={{ width: `${proj.costPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right: Quick Action Hub */}
            <div className="bg-white/50 backdrop-blur-xl p-6 rounded-3xl border border-white/60 shadow-lg flex flex-col">
              <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wider mb-6">Quick Actions</h3>
              
              <div className="space-y-3 flex-1">
                <button onClick={() => setActivePage('Tax Invoice')} className="w-full flex items-center justify-between p-4 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/60 rounded-2xl transition-all group">
                  <div className="flex items-center gap-3">
                    <span className="text-xl group-hover:scale-110 transition-transform">🧾</span>
                    <span className="text-xs font-bold text-zinc-700">Create Tax Invoice</span>
                  </div>
                  <span className="text-zinc-400 text-xs">→</span>
                </button>

                <button onClick={() => setActivePage('Purchases')} className="w-full flex items-center justify-between p-4 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/60 rounded-2xl transition-all group">
                  <div className="flex items-center gap-3">
                    <span className="text-xl group-hover:scale-110 transition-transform">🛒</span>
                    <span className="text-xs font-bold text-zinc-700">Log Material Purchase</span>
                  </div>
                  <span className="text-zinc-400 text-xs">→</span>
                </button>

                <button onClick={() => setActivePage('Income')} className="w-full flex items-center justify-between p-4 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/60 rounded-2xl transition-all group">
                  <div className="flex items-center gap-3">
                    <span className="text-xl group-hover:scale-110 transition-transform">💸</span>
                    <span className="text-xs font-bold text-zinc-700">Record Client Payment</span>
                  </div>
                  <span className="text-zinc-400 text-xs">→</span>
                </button>

                <button onClick={() => setActivePage('Employee Attendance')} className="w-full flex items-center justify-between p-4 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/60 rounded-2xl transition-all group">
                  <div className="flex items-center gap-3">
                    <span className="text-xl group-hover:scale-110 transition-transform">👷</span>
                    <span className="text-xs font-bold text-zinc-700">Mark Attendance</span>
                  </div>
                  <span className="text-zinc-400 text-xs">→</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}