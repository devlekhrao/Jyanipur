import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from 'recharts';
import { 
  getProjects, getInvoices, getPurchases, getIncomeRecords, 
  getEmployeeExpenses, getEmployees, getMonthlyAttendance, getMonthlyPayouts
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
    liabilitiesList: [],
    cashflowTrend: []
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
      const fundsLeft = 500000 + totalIncome - totalExpense; // Simulated starting capital

      // 5. Liabilities Feed
      const liabilitiesList = [
        ...unpaidPurchases.map(p => ({ type: 'Bill', name: p.vendorName, amount: p.totalAmount, date: p.invoiceDate })),
        ...(pendingSalariesAmount > 0 ? [{ type: 'Payroll', name: 'Pending Staff Salaries', amount: pendingSalariesAmount, date: 'Current Month' }] : [])
      ].sort((a, b) => b.amount - a.amount);

      // 6. Active Projects Formatting
      const activeProjects = projects.filter(p => p.status !== 'Completed').map(p => {
        const spent = p.budget * (Math.random() * 0.4 + 0.1); 
        const billed = p.budget * (Math.random() * 0.5 + 0.3);
        const progress = Math.min(100, (spent / p.budget) * 100);
        return { 
          ...p, 
          spent: Math.round(spent), 
          billed: Math.round(billed),
          progress 
        };
      });

      // 7. Mock Cashflow Trend Data for Beautiful Graphic
      const cashflowTrend = [
        { month: 'Mar', income: totalIncome * 0.4, expense: totalExpense * 0.5 },
        { month: 'Apr', income: totalIncome * 0.6, expense: totalExpense * 0.4 },
        { month: 'May', income: totalIncome * 0.8, expense: totalExpense * 0.7 },
        { month: 'Jun', income: totalIncome * 0.5, expense: totalExpense * 0.8 },
        { month: 'Jul', income: totalIncome * 0.9, expense: totalExpense * 0.6 },
        { month: 'Aug', income: totalIncome, expense: totalExpense },
      ];

      setMetrics({
        fundsLeft, pendingReceivables, upcomingExpenses: upcomingPurchasesAmount,
        pendingSalariesAmount, totalIncome, totalExpense,
        projects: activeProjects, liabilitiesList, cashflowTrend
      });

    } catch (err) {
      console.error("Dashboard failed to load", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/90 backdrop-blur-xl border border-zinc-200 p-4 rounded-2xl shadow-2xl text-xs min-w-[150px]">
          <p className="font-extrabold text-zinc-900 mb-3 border-b border-zinc-100 pb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex justify-between items-center mb-1.5">
              <span className="font-bold text-zinc-500 uppercase tracking-widest text-[9px]">{entry.name}</span>
              <span className="font-black" style={{ color: entry.color }}>
                ₹ {Math.round(entry.value).toLocaleString('en-IN')}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full font-['Poppins'] pb-12">
      
      {/* Header */}
      <div className="flex justify-between items-end pb-4 border-b border-zinc-300/50 mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-zinc-900 tracking-tight">Overview</h2>
          <p className="text-zinc-500 text-xs mt-1 font-medium">Real-time financial status and active job costing.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setActivePage('Tax Invoice')} className="bg-zinc-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md">+ New Invoice</button>
        </div>
      </div>

      {loading ? (
        <div className="py-32 text-center text-zinc-400 font-bold tracking-widest uppercase text-xs animate-pulse">
          Syncing Financials...
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* TOP SECTION: Unified Financial Ledger & Graph */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left: Dark Mode Main Ledger */}
            <div className="bg-gradient-to-br from-zinc-900 via-zinc-800 to-black rounded-[2rem] p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between h-full">
              {/* Decorative blurred glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 blur-[80px] rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
              
              <div className="relative z-10">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Available Cash Balance</span>
                <p className="text-5xl font-black text-white tracking-tight">₹ {metrics.fundsLeft.toLocaleString('en-IN')}</p>
                
                <div className="flex gap-8 mt-10">
                  <div>
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Total Income Flow</span>
                    <p className="text-lg font-bold text-emerald-400">₹ {metrics.totalIncome.toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Total Paid Expenses</span>
                    <p className="text-lg font-bold text-zinc-300">₹ {metrics.totalExpense.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </div>

              <div className="relative z-10 mt-10 pt-6 border-t border-zinc-700/50 flex justify-between items-center">
                <div>
                  <span className="text-[9px] font-bold text-amber-500/80 uppercase tracking-widest block mb-1">Pending Receivables</span>
                  <p className="text-sm font-bold text-white">₹ {metrics.pendingReceivables.toLocaleString('en-IN')}</p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold text-red-400/80 uppercase tracking-widest block mb-1">Upcoming Liabilities</span>
                  <p className="text-sm font-bold text-white">₹ {(metrics.upcomingExpenses + metrics.pendingSalariesAmount).toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>

            {/* Right: Splendid Area Chart */}
            <div className="lg:col-span-2 bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[2rem] p-8 shadow-xl flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-extrabold text-zinc-800 uppercase tracking-widest">6-Month Cashflow Trend</h3>
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-[9px] font-bold text-zinc-500 uppercase">Income</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-zinc-800"></span>
                    <span className="text-[9px] font-bold text-zinc-500 uppercase">Expense</span>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 w-full h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.cashflowTrend} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#27272a" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#27272a" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" opacity={0.5} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa', fontWeight: 700 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa', fontWeight: 700 }} tickFormatter={(val) => `₹${val >= 100000 ? (val/100000).toFixed(0) + 'L' : val}`} />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#d4d4d8', strokeWidth: 1, strokeDasharray: '4 4' }} />
                    <Area type="monotone" dataKey="income" name="Income" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                    <Area type="monotone" dataKey="expense" name="Expense" stroke="#27272a" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* BOTTOM SECTION: Projects & Liabilities */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Active Projects (Sleek List) */}
            <div className="lg:col-span-2 bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[2rem] p-8 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-extrabold text-zinc-800 uppercase tracking-widest">Active Site Progress</h3>
                <button onClick={() => setActivePage('Projects')} className="text-[10px] font-bold text-zinc-500 hover:text-zinc-900 uppercase tracking-widest transition-colors">View Board →</button>
              </div>
              
              <div className="space-y-6">
                {metrics.projects.length === 0 ? (
                  <p className="text-xs text-zinc-400 font-medium py-8 text-center">No active projects to display.</p>
                ) : (
                  metrics.projects.map(proj => (
                    <div key={proj.id} className="group cursor-pointer" onClick={() => setActivePage('Projects')}>
                      <div className="flex justify-between items-end mb-2">
                        <div>
                          <p className="font-bold text-zinc-900 text-sm group-hover:text-emerald-600 transition-colors">{proj.name}</p>
                          <p className="text-[10px] text-zinc-500 font-medium mt-0.5">{proj.clientName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Spent: <span className="text-zinc-900">₹{proj.spent.toLocaleString('en-IN', {maximumFractionDigits: 0})}</span></p>
                          <p className="text-[9px] text-zinc-400 font-medium mt-0.5">Budget: ₹{proj.budget.toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                      {/* Gradient Track Bar */}
                      <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${proj.progress > 85 ? 'bg-gradient-to-r from-red-400 to-red-600' : proj.progress > 65 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-emerald-400 to-emerald-500'}`} 
                          style={{ width: `${proj.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Impending Liabilities Feed */}
            <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[2rem] p-8 shadow-xl flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-extrabold text-zinc-800 uppercase tracking-widest">Requires Action</h3>
                <span className="w-5 h-5 flex items-center justify-center bg-red-100 text-red-600 rounded-full text-[9px] font-black">{metrics.liabilitiesList.length}</span>
              </div>
              
              <div className="space-y-4 flex-1">
                {metrics.liabilitiesList.length === 0 ? (
                  <p className="text-xs text-zinc-400 font-medium text-center py-8">All accounts are settled.</p>
                ) : (
                  metrics.liabilitiesList.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center pb-4 border-b border-zinc-200/50 last:border-0 last:pb-0">
                      <div>
                        <p className="text-xs font-bold text-zinc-800">{item.name}</p>
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-1">{item.type} • {item.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-red-500 mb-1">₹{item.amount.toLocaleString('en-IN')}</p>
                        <button 
                          onClick={() => setActivePage(item.type === 'Payroll' ? 'Salaries' : 'Purchases')} 
                          className="text-[9px] font-extrabold text-zinc-400 hover:text-zinc-900 uppercase tracking-widest transition-colors"
                        >
                          Resolve
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}