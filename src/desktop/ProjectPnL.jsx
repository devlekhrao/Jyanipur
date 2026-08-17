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

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-inset focus:ring-[#B45309] text-zinc-900 text-sm font-medium transition-all shadow-sm cursor-pointer";

  if (!activeProject) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6" style={{ fontFamily: 'Poppins, sans-serif' }}>
        <div className="bg-white p-10 rounded-2xl border border-zinc-200 shadow-sm max-w-md w-full text-center">
          <div className="w-16 h-16 bg-amber-50 text-[#B45309] rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">
            📈
          </div>
          <h2 className="text-xl font-bold text-zinc-900 mb-1">Project P&L Reports</h2>
          <p className="text-zinc-500 text-sm font-medium mb-6">Select a project to generate a real-time Profit & Loss statement based on logged income and expenses.</p>
          
          <div className="relative">
            <select 
              value={activeProject} 
              onChange={e => setActiveProject(e.target.value)} 
              className={`${inputClass} appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10 font-semibold`}
            >
              <option value="" disabled>Select Project Site...</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col" style={{ fontFamily: 'Poppins, sans-serif' }}>
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 mb-6 border-b border-zinc-200 shrink-0 gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Project P&L Overview</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Active Site:</span>
            <select 
              value={activeProject} 
              onChange={e => setActiveProject(e.target.value)} 
              className="bg-amber-50 text-[#B45309] font-bold border border-amber-200/80 rounded-lg px-2.5 py-0.5 text-xs outline-none cursor-pointer"
            >
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <button 
          onClick={() => window.print()} 
          className="bg-[#B45309] hover:bg-[#92400E] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer flex items-center gap-1.5 h-10 print:hidden"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0v-2.25a2.25 2.25 0 012.25-2.25h6a2.25 2.25 0 012.25 2.25v2.25z" /></svg>
          Print P&L Report
        </button>
      </div>

      {loading || !pnlData ? (
        <div className="py-20 text-center text-zinc-400 font-medium text-sm flex flex-col items-center justify-center space-y-3 flex-1">
          <div className="w-10 h-10 border-4 border-zinc-200 border-t-[#B45309] rounded-full animate-spin"></div>
          <p>Crunching financial numbers...</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          
          {/* TOP SUMMARY CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white border border-zinc-200 p-5 rounded-2xl shadow-sm flex flex-col justify-center">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Contract Budget</span>
              <p className="text-xl font-bold text-zinc-900">₹ {(pnlData.budget || 0).toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl shadow-sm flex flex-col justify-center">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block mb-1">Income Received</span>
              <p className="text-xl font-bold text-emerald-700">₹ {(pnlData.incomeReceived || 0).toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white border border-red-200/80 p-5 rounded-2xl shadow-sm flex flex-col justify-center">
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest block mb-1">Total Project Cost</span>
              <p className="text-xl font-bold text-red-500">₹ {(pnlData.totalCost || 0).toLocaleString('en-IN')}</p>
            </div>
            <div className={`p-5 rounded-2xl shadow-sm border flex flex-col justify-center ${
              (pnlData.netProfit || 0) >= 0 ? 'bg-[#B45309] border-[#B45309] text-white' : 'bg-red-600 border-red-600 text-white'
            }`}>
              <span className="text-[10px] font-bold uppercase tracking-widest block mb-1 opacity-80">Current Net Profit</span>
              <p className="text-xl font-bold">₹ {(pnlData.netProfit || 0).toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* VISUAL MARGIN BAR */}
          <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Profit Margin Health</h3>
              <span className={`text-lg font-bold ${
                (pnlData.profitMargin || 0) >= 15 ? 'text-emerald-600' : (pnlData.profitMargin || 0) > 0 ? 'text-amber-600' : 'text-red-500'
              }`}>
                {pnlData.profitMargin || 0}%
              </span>
            </div>
            
            <div className="w-full h-3.5 bg-zinc-100 rounded-full overflow-hidden flex shadow-inner">
              <div 
                className="h-full bg-emerald-500 transition-all duration-500" 
                style={{ width: `${Math.min(((pnlData.incomeReceived || 0) / ((pnlData.incomeReceived || 0) + (pnlData.totalCost || 0) || 1)) * 100, 100)}%` }}
                title="Income"
              ></div>
              <div 
                className="h-full bg-red-500 transition-all duration-500" 
                style={{ width: `${Math.min(((pnlData.totalCost || 0) / ((pnlData.incomeReceived || 0) + (pnlData.totalCost || 0) || 1)) * 100, 100)}%` }}
                title="Costs"
              ></div>
            </div>

            <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider pt-1">
              <span>Gross Income</span>
              <span>Total Expenses</span>
            </div>
          </div>

          {/* DETAILED BREAKDOWN TABLE */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-sm overflow-hidden mb-6">
            <div className="p-4 border-b border-zinc-200 bg-zinc-50/80">
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Cost Breakdown Analysis</h3>
            </div>
            <table className="w-full text-left text-sm border-collapse">
              <tbody className="divide-y divide-zinc-100 text-zinc-800">
                <tr className="hover:bg-zinc-50 transition-colors">
                  <td className="py-4 px-6 font-medium text-zinc-700">Subcontractor Payouts (Advances + Bills)</td>
                  <td className="py-4 px-6 text-right font-bold text-zinc-900">₹ {(pnlData.subCost || 0).toLocaleString('en-IN')}</td>
                </tr>
                <tr className="hover:bg-zinc-50 transition-colors">
                  <td className="py-4 px-6 font-medium text-zinc-700">Site Petty Cash Expenses</td>
                  <td className="py-4 px-6 text-right font-bold text-zinc-900">₹ {(pnlData.pettyCost || 0).toLocaleString('en-IN')}</td>
                </tr>
                <tr className="bg-zinc-50/80 border-t-2 border-zinc-200 font-bold">
                  <td className="py-4 px-6 text-zinc-900 text-right uppercase tracking-wider text-xs">Total Direct Cost :</td>
                  <td className="py-4 px-6 text-right font-bold text-red-500 text-base">₹ {(pnlData.totalCost || 0).toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      )}
    </div>
  );
}