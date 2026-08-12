import React, { useState, useEffect } from 'react';
import { getProjects, getProjectPnL } from './db';

export default function ProjectPnL() {
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState('');
  const [pnlData, setPnLData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getProjects().then(p => setProjects(p));
  }, []);

  useEffect(() => {
    if (activeProject) {
      setLoading(true);
      getProjectPnL(activeProject).then(data => {
        setPnLData(data);
        setLoading(false);
      });
    }
  }, [activeProject]);

  const inputClass = "w-full px-4 py-3 rounded-xl border-none bg-zinc-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 text-sm font-medium transition-all shadow-inner cursor-pointer";

  if (!activeProject) {
    return (
      <div className="w-full font-['Poppins'] pb-12 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] border border-white/60 shadow-lg max-w-md w-full text-center">
          <div className="text-4xl mb-4">📈</div>
          <h2 className="text-xl font-bold text-zinc-800 mb-2">Project P&L Reports</h2>
          <p className="text-zinc-500 text-xs font-medium mb-6">Select a project to generate a real-time Profit & Loss statement based on logged income and expenses.</p>
          <select value={activeProject} onChange={e => setActiveProject(e.target.value)} className={inputClass}>
            <option value="" disabled>Select Project Site...</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full font-['Poppins'] pb-12 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-4 border-b border-zinc-300/50 mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-800 tracking-tight">Financial Overview</h2>
          <select value={activeProject} onChange={e => setActiveProject(e.target.value)} className="bg-transparent border-none text-emerald-600 font-bold outline-none cursor-pointer p-0 text-sm mt-1">
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <button onClick={() => window.print()} className="bg-zinc-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md print:hidden">
          🖨️ Print P&L Report
        </button>
      </div>

      {loading || !pnlData ? (
        <div className="py-20 text-center text-zinc-500 text-xs">Crunching numbers...</div>
      ) : (
        <div className="space-y-8 max-w-5xl mx-auto">
          
          {/* TOP SUMMARY CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-zinc-200 p-5 rounded-2xl shadow-sm">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Contract Budget</span>
              <p className="text-xl font-bold text-zinc-800">₹ {pnlData.budget.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl shadow-sm">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block mb-1">Income Received</span>
              <p className="text-xl font-bold text-emerald-700">₹ {pnlData.incomeReceived.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-red-50 border border-red-200 p-5 rounded-2xl shadow-sm">
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest block mb-1">Total Project Cost</span>
              <p className="text-xl font-bold text-red-600">₹ {pnlData.totalCost.toLocaleString('en-IN')}</p>
            </div>
            <div className={`p-5 rounded-2xl shadow-sm border ${pnlData.netProfit >= 0 ? 'bg-zinc-900 border-zinc-900 text-white' : 'bg-red-600 border-red-600 text-white'}`}>
              <span className="text-[10px] font-bold uppercase tracking-widest block mb-1 opacity-70">Current Net Profit</span>
              <p className="text-xl font-black">₹ {pnlData.netProfit.toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* VISUAL MARGIN BAR */}
          <div className="bg-white border border-zinc-200 p-6 rounded-3xl shadow-sm">
            <div className="flex justify-between items-end mb-4">
              <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-widest">Profit Margin Health</h3>
              <span className={`text-lg font-black ${pnlData.profitMargin >= 15 ? 'text-emerald-500' : pnlData.profitMargin > 0 ? 'text-amber-500' : 'text-red-500'}`}>
                {pnlData.profitMargin}%
              </span>
            </div>
            
            <div className="w-full h-4 bg-zinc-100 rounded-full overflow-hidden flex">
              <div 
                className="h-full bg-emerald-400" 
                style={{ width: `${Math.min((pnlData.incomeReceived / (pnlData.incomeReceived + pnlData.totalCost || 1)) * 100, 100)}%` }}
                title="Income"
              ></div>
              <div 
                className="h-full bg-red-400" 
                style={{ width: `${Math.min((pnlData.totalCost / (pnlData.incomeReceived + pnlData.totalCost || 1)) * 100, 100)}%` }}
                title="Costs"
              ></div>
            </div>
            <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-3">
              <span>Gross Income</span>
              <span>Total Expenses</span>
            </div>
          </div>

          {/* DETAILED BREAKDOWN TABLE */}
          <div className="bg-white border border-zinc-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-zinc-100 bg-zinc-50/50">
              <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-widest">Cost Breakdown Analysis</h3>
            </div>
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-zinc-100">
                <tr className="hover:bg-zinc-50 transition-colors">
                  <td className="py-4 px-6 font-medium text-zinc-600">Subcontractor Payouts (Advances + Bills)</td>
                  <td className="py-4 px-6 text-right font-bold text-zinc-900">₹ {pnlData.subCost.toLocaleString('en-IN')}</td>
                </tr>
                <tr className="hover:bg-zinc-50 transition-colors">
                  <td className="py-4 px-6 font-medium text-zinc-600">Site Petty Cash Expenses</td>
                  <td className="py-4 px-6 text-right font-bold text-zinc-900">₹ {pnlData.pettyCost.toLocaleString('en-IN')}</td>
                </tr>
                {/* Note: If you add material purchases or in-house labor later, they will slot in perfectly right here */}
                <tr className="bg-zinc-50 border-t-2 border-zinc-200">
                  <td className="py-4 px-6 font-bold text-zinc-800 text-right uppercase tracking-widest text-xs">Total Direct Cost :</td>
                  <td className="py-4 px-6 text-right font-black text-red-600 text-lg">₹ {pnlData.totalCost.toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      )}
    </div>
  );
}