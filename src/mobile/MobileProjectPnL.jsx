import React, { useState, useEffect } from 'react';
import { getProjects, getProjectPnL } from '../db';

export default function MobileProjectPnL() {
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState('');
  const [pnlData, setPnLData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getProjects().then(p => {
      const activeProjs = p || [];
      setProjects(activeProjs);
      if (activeProjs.length > 0 && !activeProject) {
        setActiveProject(activeProjs[0].id);
      }
    });
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

  // EMPTY SELECTION STATE
  if (!activeProject) {
    return (
      <div className="w-full h-full flex flex-col font-sans items-center justify-center p-4">
        <div className="bg-white p-6 rounded-[2rem] border border-zinc-200 shadow-lg w-full text-center space-y-4">
          <span className="text-4xl block">📈</span>
          <h2 className="text-xl font-bold text-zinc-900">Project P&L Reports</h2>
          <p className="text-zinc-500 text-xs font-medium">Select an active project site to view real-time revenue, costs, and profit margins.</p>
          
          <div className="relative">
            <select 
              value={activeProject} 
              onChange={e => setActiveProject(e.target.value)} 
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3.5 text-xs font-bold text-zinc-900 outline-none appearance-none pr-8"
            >
              <option value="" disabled>Select Project Site...</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400 text-xs">▼</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col font-sans">
      
      {/* HEADER SECTION */}
      <div className="mb-3 shrink-0">
        <div className="flex justify-between items-center mb-1">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Project P&L</h2>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Financial Margins & Profitability</p>
          </div>
        </div>

        {/* SITE SELECTOR DROPDOWN */}
        <div className="relative mt-2">
          <select 
            value={activeProject} 
            onChange={e => setActiveProject(e.target.value)} 
            className="w-full bg-white border border-zinc-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-[#1E3A8A] outline-none shadow-sm appearance-none pr-8"
          >
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400 text-xs">▼</div>
        </div>
      </div>

      {loading || !pnlData ? (
        <div className="py-20 text-center text-zinc-400 font-medium text-xs flex-1">Calculating P&L statement...</div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          
          {/* 2x2 SUMMARY KPI CARDS */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white p-3.5 rounded-2xl border border-zinc-200 shadow-sm">
              <span className="text-[8px] font-semibold text-[11px] text-zinc-400 uppercase tracking-widest block">Contract Budget</span>
              <p className="text-base font-semibold text-[11px] text-zinc-900 mt-0.5">₹ {pnlData.budget?.toLocaleString('en-IN')}</p>
            </div>

            <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-100 shadow-sm">
              <span className="text-[8px] font-semibold text-[11px] text-emerald-600 uppercase tracking-widest block">Income Received</span>
              <p className="text-base font-semibold text-[11px] text-emerald-700 mt-0.5">₹ {pnlData.incomeReceived?.toLocaleString('en-IN')}</p>
            </div>

            <div className="bg-red-50 p-3.5 rounded-2xl border border-red-100 shadow-sm">
              <span className="text-[8px] font-semibold text-[11px] text-red-500 uppercase tracking-widest block">Total Direct Cost</span>
              <p className="text-base font-semibold text-[11px] text-red-600 mt-0.5">₹ {pnlData.totalCost?.toLocaleString('en-IN')}</p>
            </div>

            <div className={`p-3.5 rounded-2xl shadow-md ${pnlData.netProfit >= 0 ? 'bg-zinc-900 text-white' : 'bg-red-600 text-white'}`}>
              <span className="text-[8px] font-semibold text-[11px] uppercase tracking-widest block opacity-80">Net Profit</span>
              <p className="text-base font-semibold text-[11px] mt-0.5">₹ {pnlData.netProfit?.toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* PROFIT MARGIN HEALTH BAR */}
          <div className="bg-white border border-zinc-200 p-4 rounded-[1.5rem] shadow-sm space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-[10px] font-semibold text-[11px] text-zinc-400 uppercase tracking-widest">Margin Health</h3>
              <span className={`text-base font-semibold text-[11px] ${
                pnlData.profitMargin >= 15 ? 'text-emerald-600' : pnlData.profitMargin > 0 ? 'text-amber-500' : 'text-red-500'
              }`}>
                {pnlData.profitMargin}%
              </span>
            </div>

            <div className="w-full h-3.5 bg-zinc-100 rounded-full overflow-hidden flex shadow-inner">
              <div 
                className="h-full bg-emerald-500 transition-all duration-500" 
                style={{ width: `${Math.min((pnlData.incomeReceived / (pnlData.incomeReceived + pnlData.totalCost || 1)) * 100, 100)}%` }}
              ></div>
              <div 
                className="h-full bg-red-500 transition-all duration-500" 
                style={{ width: `${Math.min((pnlData.totalCost / (pnlData.incomeReceived + pnlData.totalCost || 1)) * 100, 100)}%` }}
              ></div>
            </div>

            <div className="flex justify-between text-[8px] font-semibold text-[11px] text-zinc-400 uppercase tracking-wider pt-0.5">
              <span>Gross Collections</span>
              <span>Direct Outflows</span>
            </div>
          </div>

          {/* COST BREAKDOWN ANALYSIS CARD */}
          <div className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-3">
            <h3 className="text-[10px] font-semibold text-[11px] text-zinc-400 uppercase tracking-widest border-b border-zinc-100 pb-2">
              Cost Breakdown Analysis
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1">
                <span className="font-bold text-zinc-700">Subcontractor Payouts & Bills</span>
                <span className="font-bold text-zinc-900">₹ {pnlData.subCost?.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="font-bold text-zinc-700">Site Petty Cash Expenses</span>
                <span className="font-bold text-zinc-900">₹ {pnlData.pettyCost?.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-zinc-100 font-semibold text-[11px]">
                <span className="text-zinc-900 uppercase text-[9px] tracking-wider">Total Direct Outflow</span>
                <span className="text-red-600 text-sm">₹ {pnlData.totalCost?.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}