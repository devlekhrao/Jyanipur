import React, { useState, useEffect } from 'react';
import { getProjects, getProjectPnL } from '../db';

export default function ProjectPnL() {
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState('');
  const [pnlData, setPnLData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getProjects().then(p => setProjects(p || []));
  }, []);

  useEffect(() => {
    if (activeProject) {
      setLoading(true);
      getProjectPnL(activeProject).then(data => {
        setPnLData(data);
        setLoading(false);
      }).catch(err => {
        console.warn("Ensure getProjectPnL is implemented in db.js");
        setPnLData(null);
        setLoading(false);
      });
    }
  }, [activeProject]);

  const inputClass = "w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-zinc-900 text-xs font-medium transition-all shadow-sm cursor-pointer";

  if (!activeProject) {
    return (
      <div className="w-full h-full font-sans flex flex-col items-center justify-center">
        <div className="bg-white p-10 rounded-[2.5rem] border border-zinc-200 shadow-xl max-w-md w-full text-center">
          <div className="text-4xl mb-4">📈</div>
          <h2 className="text-xl font-bold text-zinc-900 mb-2">Project P&L Reports</h2>
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
    <div className="w-full h-full font-sans flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-4 border-b border-zinc-200 mb-6 gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Financial Overview</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Active Site:</span>
            <select value={activeProject} onChange={e => setActiveProject(e.target.value)} className="bg-transparent border-none text-[#1E3A8A] font-bold outline-none cursor-pointer p-0 text-sm">
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <button onClick={() => window.print()} className="bg-[#1E3A8A] hover:bg-blue-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer print:hidden">
          🖨️ Print P&L Report
        </button>
      </div>

      {loading || !pnlData ? (
        <div className="py-20 text-center text-zinc-400 font-medium text-xs flex-1">Crunching numbers...</div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          
          {/* TOP SUMMARY CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white border border-zinc-200 p-6 rounded-[2rem] shadow-sm">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Contract Budget</span>
              <p className="text-2xl font-semibold text-[11px] text-zinc-900">₹ {pnlData.budget.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-emerald-50/70 border border-emerald-100 p-6 rounded-[2rem] shadow-sm">
              <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest block mb-1">Income Received</span>
              <p className="text-2xl font-semibold text-[11px] text-emerald-700">₹ {pnlData.incomeReceived.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-red-50/70 border border-red-100 p-6 rounded-[2rem] shadow-sm">
              <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest block mb-1">Total Project Cost</span>
              <p className="text-2xl font-semibold text-[11px] text-red-600">₹ {pnlData.totalCost.toLocaleString('en-IN')}</p>
            </div>
            <div className={`p-6 rounded-[2rem] shadow-lg border ${pnlData.netProfit >= 0 ? 'bg-zinc-900 border-zinc-900 text-white' : 'bg-red-600 border-red-600 text-white'}`}>
              <span className="text-[9px] font-bold uppercase tracking-widest block mb-1 opacity-80">Current Net Profit</span>
              <p className="text-2xl font-semibold text-[11px]">₹ {pnlData.netProfit.toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* VISUAL MARGIN BAR */}
          <div className="bg-white border border-zinc-200 p-6 rounded-[2rem] shadow-sm">
            <div className="flex justify-between items-end mb-4">
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest">Profit Margin Health</h3>
              <span className={`text-xl font-semibold text-[11px] ${pnlData.profitMargin >= 15 ? 'text-emerald-600' : pnlData.profitMargin > 0 ? 'text-amber-500' : 'text-red-500'}`}>
                {pnlData.profitMargin}%
              </span>
            </div>
            
            <div className="w-full h-4 bg-zinc-100 rounded-full overflow-hidden flex shadow-inner">
              <div 
                className="h-full bg-emerald-500 transition-all duration-500" 
                style={{ width: `${Math.min((pnlData.incomeReceived / (pnlData.incomeReceived + pnlData.totalCost || 1)) * 100, 100)}%` }}
                title="Income"
              ></div>
              <div 
                className="h-full bg-red-500 transition-all duration-500" 
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
          <div className="bg-white border border-zinc-200 rounded-[2rem] shadow-sm overflow-hidden mb-6">
            <div className="p-5 border-b border-zinc-100 bg-zinc-50/50">
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest">Cost Breakdown Analysis</h3>
            </div>
            <table className="w-full text-left text-xs">
              <tbody className="divide-y divide-zinc-100 text-zinc-800">
                <tr className="hover:bg-zinc-50 transition-colors">
                  <td className="py-4 px-6 font-semibold text-zinc-700">Subcontractor Payouts (Advances + Bills)</td>
                  <td className="py-4 px-6 text-right font-bold text-zinc-900">₹ {pnlData.subCost.toLocaleString('en-IN')}</td>
                </tr>
                <tr className="hover:bg-zinc-50 transition-colors">
                  <td className="py-4 px-6 font-semibold text-zinc-700">Site Petty Cash Expenses</td>
                  <td className="py-4 px-6 text-right font-bold text-zinc-900">₹ {pnlData.pettyCost.toLocaleString('en-IN')}</td>
                </tr>
                <tr className="bg-zinc-50 border-t-2 border-zinc-200">
                  <td className="py-4 px-6 font-semibold text-[11px] text-zinc-900 text-right uppercase tracking-widest text-xs">Total Direct Cost :</td>
                  <td className="py-4 px-6 text-right font-semibold text-[11px] text-red-600 text-base">₹ {pnlData.totalCost.toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      )}
    </div>
  );
}