import React, { useState, useEffect } from 'react';
import { 
  getProjects, 
  getInvoices, 
  getPurchases, 
  getIncomeRecords, 
  getEmployeeExpenses,
  getEmployees,
  getMonthlyAttendance,
  getMonthlyPayouts
} from './db';

export default function Dashboard({ setActivePage }) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    fundsLeft: 0,
    pendingReceivables: 0,
    upcomingExpenses: 0,
    pendingSalariesAmount: 0,
    totalIncome: 0,
    totalExpense: 0,
    projects: [],
    liabilitiesList: []
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      const [
        projects, invoices, purchases, income, staffExpenses, 
        employees, attendance, payouts
      ] = await Promise.all([
        getProjects(), getInvoices(), getPurchases(), getIncomeRecords(), 
        getEmployeeExpenses(), getEmployees(), 
        getMonthlyAttendance(currentYear, currentMonth), 
        getMonthlyPayouts(currentYear, currentMonth)
      ]);

      // 1. Income & Receivables
      const totalBilled = invoices.filter(i => !i.isCancelled).reduce((sum, i) => sum + Number(i.amount || 0), 0);
      const totalIncome = income.reduce((sum, i) => sum + Number(i.amount || 0), 0);
      const pendingReceivables = Math.max(0, totalBilled - totalIncome);

      // 2. Purchases (Upcoming vs Paid)
      const unpaidPurchases = purchases.filter(p => p.returnStatus === 'Pending');
      const upcomingPurchasesAmount = unpaidPurchases.reduce((sum, p) => sum + Number(p.totalAmount || 0), 0);
      const paidPurchasesAmount = purchases.filter(p => p.returnStatus !== 'Pending').reduce((sum, p) => sum + Number(p.totalAmount || 0), 0);

      // 3. Salaries & Staff Expenses
      const totalStaffExpenses = staffExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      
      let pendingSalariesAmount = 0;
      let paidSalariesAmount = 0;
      
      employees.filter(e => e.status === 'Active').forEach(emp => {
        const empAtt = attendance[emp.id] || {};
        const days = Object.values(empAtt).filter(s => s === 'Present').length + (Object.values(empAtt).filter(s => s === 'Half Day').length * 0.5);
        
        let calculatedPay = 0;
        if (emp.payType === 'Daily') calculatedPay = days * (emp.payRate || 0);
        else calculatedPay = ((emp.payRate || 0) / new Date(currentYear, currentMonth, 0).getDate()) * days;

        const payoutStatus = payouts[emp.id];
        if (payoutStatus) {
          paidSalariesAmount += payoutStatus.amount;
        } else if (calculatedPay > 0) {
          pendingSalariesAmount += Math.round(calculatedPay);
        }
      });

      // 4. Master Cashflow
      const totalExpense = paidPurchasesAmount + totalStaffExpenses + paidSalariesAmount;
      // Simulated starting capital of 5L + Income - Expenses
      const fundsLeft = 500000 + totalIncome - totalExpense; 

      // 5. Liabilities List (For the UI Feed)
      const liabilitiesList = [
        ...unpaidPurchases.slice(0, 4).map(p => ({ type: 'Bill', name: p.vendorName, amount: p.totalAmount, date: p.invoiceDate })),
        ...(pendingSalariesAmount > 0 ? [{ type: 'Payroll', name: 'Pending Staff Salaries', amount: pendingSalariesAmount, date: 'Current Month' }] : [])
      ].sort((a, b) => b.amount - a.amount);

      // 6. Project Formatting
      const activeProjects = projects.filter(p => p.status !== 'Completed').map(p => {
        // Mock linking for UI logic (until DB fully linked)
        const spent = p.budget * (Math.random() * 0.4 + 0.1); 
        const billed = p.budget * (Math.random() * 0.5 + 0.3);
        const progress = Math.min(100, (spent / p.budget) * 100);
        return { ...p, spent, billed, progress };
      });

      setMetrics({
        fundsLeft,
        pendingReceivables,
        upcomingExpenses: upcomingPurchasesAmount,
        pendingSalariesAmount,
        totalIncome,
        totalExpense,
        projects: activeProjects,
        liabilitiesList
      });

    } catch (err) {
      console.error("Dashboard failed to load", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="w-full font-['Poppins'] pb-12">
      
      {/* Sleek Header */}
      <div className="flex justify-between items-end pb-4 border-b border-zinc-300/60 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Overview</h2>
          <p className="text-zinc-500 text-xs mt-1 font-medium">Real-time financial status and active job costing.</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Available Funds</p>
          <p className="text-2xl font-black text-zinc-900 tracking-tight">₹ {metrics.fundsLeft.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-zinc-400 font-medium text-sm">Aggregating financial data...</div>
      ) : (
        <div className="space-y-6">
          
          {/* TOP KPI GRID - STRICT MINIMALISM */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-zinc-200/80 p-5 rounded-2xl shadow-sm">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Total Income Flow</span>
              <p className="text-xl font-bold text-emerald-600">₹ {metrics.totalIncome.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white border border-zinc-200/80 p-5 rounded-2xl shadow-sm">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Total Paid Expenses</span>
              <p className="text-xl font-bold text-zinc-800">₹ {metrics.totalExpense.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white border border-zinc-200/80 p-5 rounded-2xl shadow-sm">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Pending Receivables</span>
              <p className="text-xl font-bold text-blue-600">₹ {metrics.pendingReceivables.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-zinc-900 p-5 rounded-2xl shadow-md text-white">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Upcoming Liabilities</span>
              <p className="text-xl font-bold text-red-400">₹ {(metrics.upcomingExpenses + metrics.pendingSalariesAmount).toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* MIDDLE SECTION: Charts & Liabilities */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* Cashflow Graph (CSS Based) */}
            <div className="xl:col-span-2 bg-white border border-zinc-200/80 p-6 rounded-3xl shadow-sm flex flex-col">
              <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-widest mb-6">Income vs Expense Ratio</h3>
              
              <div className="flex-1 flex flex-col justify-center gap-6">
                {/* Income Bar */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-2">
                    <span className="text-zinc-600">Total Income</span>
                    <span className="text-zinc-900">₹ {metrics.totalIncome.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="w-full bg-zinc-100 rounded-full h-4 overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min(100, (metrics.totalIncome / (metrics.totalIncome + metrics.totalExpense || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Expense Bar */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-2">
                    <span className="text-zinc-600">Total Expenses</span>
                    <span className="text-zinc-900">₹ {metrics.totalExpense.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="w-full bg-zinc-100 rounded-full h-4 overflow-hidden">
                    <div 
                      className="bg-zinc-800 h-full rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min(100, (metrics.totalExpense / (metrics.totalIncome + metrics.totalExpense || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Upcoming Liabilities Feed */}
            <div className="bg-white border border-zinc-200/80 p-6 rounded-3xl shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-widest">Pending Payouts</h3>
                <span className="text-[10px] font-bold bg-red-50 text-red-600 px-2 py-1 rounded uppercase">{metrics.liabilitiesList.length} Items</span>
              </div>
              
              <div className="space-y-4 flex-1">
                {metrics.liabilitiesList.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-4">No pending payouts.</p>
                ) : (
                  metrics.liabilitiesList.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center pb-3 border-b border-zinc-100 last:border-0 last:pb-0">
                      <div>
                        <p className="text-xs font-bold text-zinc-800">{item.name}</p>
                        <div className="flex gap-2 items-center mt-1">
                          <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${item.type === 'Payroll' ? 'bg-amber-100 text-amber-700' : 'bg-zinc-100 text-zinc-600'}`}>
                            {item.type}
                          </span>
                          <span className="text-[9px] text-zinc-400">{item.date}</span>
                        </div>
                      </div>
                      <p className="text-xs font-bold text-zinc-900">₹{item.amount.toLocaleString('en-IN')}</p>
                    </div>
                  ))
                )}
              </div>
              
              <button onClick={() => setActivePage('Purchases')} className="w-full mt-4 py-2 border border-zinc-200 rounded-xl text-[10px] font-bold text-zinc-600 hover:bg-zinc-50 transition-colors uppercase tracking-widest">
                Review Payables
              </button>
            </div>

          </div>

          {/* BOTTOM SECTION: Project-wise Cards */}
          <div>
            <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-widest mb-4 mt-2">Active Projects Overview</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {metrics.projects.length === 0 ? (
                <div className="col-span-full py-8 text-center text-zinc-400 font-medium text-xs border border-dashed border-zinc-300 rounded-2xl">No active projects found.</div>
              ) : (
                metrics.projects.map(proj => (
                  <div key={proj.id} className="bg-white border border-zinc-200/80 p-5 rounded-2xl shadow-sm hover:border-zinc-300 transition-colors cursor-pointer" onClick={() => setActivePage('Projects')}>
                    
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-sm font-bold text-zinc-900">{proj.name}</h4>
                        <p className="text-[10px] text-zinc-500 font-medium">{proj.clientName}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-[8px] font-bold uppercase tracking-widest ${proj.status === 'Planning' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                        {proj.status}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Budget</span>
                        <span className="font-bold text-zinc-800">₹{proj.budget.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Billed to Client</span>
                        <span className="font-bold text-emerald-600">₹{proj.billed.toLocaleString('en-IN', {maximumFractionDigits: 0})}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Cost (Mat + Labor)</span>
                        <span className="font-bold text-red-500">₹{proj.spent.toLocaleString('en-IN', {maximumFractionDigits: 0})}</span>
                      </div>

                      {/* Micro Progress Bar */}
                      <div className="pt-3 border-t border-zinc-100">
                        <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">
                          <span>Budget Utilized</span>
                          <span>{proj.progress.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${proj.progress > 85 ? 'bg-red-500' : proj.progress > 65 ? 'bg-amber-400' : 'bg-zinc-800'}`} 
                            style={{ width: `${proj.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}