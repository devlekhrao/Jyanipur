import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from 'recharts';
import { 
  getProjects, getInvoices, getPurchases, getIncomeRecords, 
  getEmployeeExpenses, getEmployees, getTodayAttendance, getMonthlyPayouts, getMonthlyAttendance
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
    cashflowTrend: [],
    staffPresent: 0,
    totalStaff: 0,
    gstLiability: 0,
    invoicesThisMonth: 0
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();
      const todayStr = currentDate.toISOString().split('T')[0];

      const [
        projects, invoices, purchases, income, staffExpenses, 
        employees, todayAtt, monthlyAtt, payouts
      ] = await Promise.all([
        getProjects(), getInvoices(), getPurchases(), getIncomeRecords(), 
        getEmployeeExpenses(), getEmployees(), getTodayAttendance(todayStr),
        getMonthlyAttendance(currentYear, currentMonth), getMonthlyPayouts(currentYear, currentMonth)
      ]);

      // 1. Income & Receivables
      const totalBilled = invoices.filter(i => !i.isCancelled).reduce((sum, i) => sum + Number(i.amount || 0), 0);
      const totalIncome = income.reduce((sum, i) => sum + Number(i.amount || 0), 0);
      const pendingReceivables = Math.max(0, totalBilled - totalIncome);

      // Operational: Invoices this month
      const invoicesThisMonth = invoices.filter(i => {
        if (!i.date) return false;
        const d = new Date(i.date);
        return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear && !i.isCancelled;
      }).length;

      // 2. Purchases & GST
      const unpaidPurchases = purchases.filter(p => p.returnStatus === 'Pending');
      const upcomingPurchasesAmount = unpaidPurchases.reduce((sum, p) => sum + Number(p.totalAmount || 0), 0);
      const paidPurchasesAmount = purchases.filter(p => p.returnStatus !== 'Pending').reduce((sum, p) => sum + Number(p.totalAmount || 0), 0);
      
      const totalInputGST = purchases.reduce((sum, p) => sum + Number(p.gstAmount || 0), 0);
      // Rough outward GST estimate (assuming ~18% blended on billed)
      const totalOutputGST = totalBilled - (totalBilled / 1.18); 
      const gstLiability = Math.max(0, totalOutputGST - totalInputGST);

      // 3. Salaries & Attendance
      const totalStaffExpenses = staffExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const activeEmployees = employees.filter(e => e.status === 'Active');
      
      let pendingSalariesAmount = 0;
      let paidSalariesAmount = 0;
      let staffPresent = 0;
      
      activeEmployees.forEach(emp => {
        // Today's attendance
        if (todayAtt[emp.id] === 'Present' || todayAtt[emp.id] === 'Half Day') staffPresent++;

        // Monthly salary calculation
        const empAtt = monthlyAtt[emp.id] || {};
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
        ...(pendingSalariesAmount > 0 ? [{ type: 'Payroll', name: 'Pending Staff Salaries', amount: pendingSalariesAmount, date: 'This Month' }] : [])
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

      // 7. Mock Cashflow Trend Data
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
        projects: activeProjects, liabilitiesList, cashflowTrend,
        staffPresent, totalStaff: activeEmployees.length, gstLiability, invoicesThisMonth
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
        <div className="bg-white/95 backdrop-blur-md border border-zinc-200 p-3 rounded-xl shadow-lg text-xs min-w-[140px]">
          <p className="font-semibold text-zinc-700 mb-2 border-b border-zinc-100 pb-1.5">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex justify-between items-center mb-1">
              <span className="font-medium text-zinc-500 text-[10px]">{entry.name}</span>
              <span className="font-semibold" style={{ color: entry.color }}>
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
      <div className="flex justify-between items-end pb-4 border-b border-zinc-300/60 mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-800 tracking-tight">Overview</h2>
          <p className="text-zinc-500 text-xs mt-1 font-medium">Financials, operations, and compliance at a glance.</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest mb-0.5">Available Funds</p>
          <p className="text-3xl font-semibold text-emerald-600 tracking-tight">₹ {metrics.fundsLeft.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {loading ? (
        <div className="py-32 text-center text-zinc-400 font-medium tracking-widest uppercase text-[10px] animate-pulse">
          Syncing ERP Data...
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* FINANCIAL STRIP */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/80 backdrop-blur-xl border border-zinc-200/80 p-5 rounded-2xl shadow-sm">
              <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest block mb-1.5">Total Income</span>
              <p className="text-xl font-semibold text-zinc-800">₹ {metrics.totalIncome.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white/80 backdrop-blur-xl border border-zinc-200/80 p-5 rounded-2xl shadow-sm">
              <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest block mb-1.5">Paid Expenses</span>
              <p className="text-xl font-semibold text-zinc-800">₹ {metrics.totalExpense.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white/80 backdrop-blur-xl border border-zinc-200/80 p-5 rounded-2xl shadow-sm">
              <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest block mb-1.5">Pending Receivables</span>
              <p className="text-xl font-semibold text-blue-600">₹ {metrics.pendingReceivables.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white/80 backdrop-blur-xl border border-red-200/60 p-5 rounded-2xl shadow-sm">
              <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest block mb-1.5">Upcoming Liabilities</span>
              <p className="text-xl font-semibold text-red-500">₹ {(metrics.upcomingExpenses + metrics.pendingSalariesAmount).toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* OPERATIONAL STRIP (New Additions) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-zinc-50/80 border border-zinc-200/50 p-4 rounded-2xl">
              <span className="text-[9px] font-medium text-zinc-500 uppercase tracking-widest block mb-1">Active Projects</span>
              <p className="text-lg font-medium text-zinc-700">{metrics.projects.length} <span className="text-[10px] text-zinc-400">Sites</span></p>
            </div>
            <div className="bg-zinc-50/80 border border-zinc-200/50 p-4 rounded-2xl cursor-pointer hover:bg-zinc-100 transition-colors" onClick={() => setActivePage('Employee Attendance')}>
              <span className="text-[9px] font-medium text-zinc-500 uppercase tracking-widest block mb-1">Staff On Site Today</span>
              <p className="text-lg font-medium text-zinc-700">{metrics.staffPresent} <span className="text-[10px] text-zinc-400">/ {metrics.totalStaff}</span></p>
            </div>
            <div className="bg-zinc-50/80 border border-zinc-200/50 p-4 rounded-2xl cursor-pointer hover:bg-zinc-100 transition-colors" onClick={() => setActivePage('GST Filing')}>
              <span className="text-[9px] font-medium text-zinc-500 uppercase tracking-widest block mb-1">Est. Net GST Payable</span>
              <p className="text-lg font-medium text-zinc-700">₹ {metrics.gstLiability.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
            </div>
            <div className="bg-zinc-50/80 border border-zinc-200/50 p-4 rounded-2xl">
              <span className="text-[9px] font-medium text-zinc-500 uppercase tracking-widest block mb-1">Invoices This Month</span>
              <p className="text-lg font-medium text-zinc-700">{metrics.invoicesThisMonth} <span className="text-[10px] text-zinc-400">Issued</span></p>
            </div>
          </div>

          {/* MIDDLE SECTION: Graph & Payables */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Smooth Area Chart */}
            <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl border border-zinc-200/80 p-6 rounded-[2rem] shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-semibold text-zinc-700 uppercase tracking-widest">Cashflow Trend</h3>
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span className="text-[10px] font-medium text-zinc-500">Income</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
                    <span className="text-[10px] font-medium text-zinc-500">Expense</span>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 w-full h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.cashflowTrend} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#71717a" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#71717a" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" opacity={0.6} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa', fontWeight: 500 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa', fontWeight: 500 }} tickFormatter={(val) => `₹${val >= 100000 ? (val/100000).toFixed(0) + 'L' : val}`} />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#d4d4d8', strokeWidth: 1, strokeDasharray: '3 3' }} />
                    <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                    <Area type="monotone" dataKey="expense" stroke="#71717a" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Impending Liabilities Feed */}
            <div className="bg-white/80 backdrop-blur-xl border border-zinc-200/80 p-6 rounded-[2rem] shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-semibold text-zinc-700 uppercase tracking-widest">Payables Feed</h3>
                <span className="text-[10px] font-medium bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded">{metrics.liabilitiesList.length} Action{metrics.liabilitiesList.length !== 1 ? 's' : ''}</span>
              </div>
              
              <div className="space-y-3 flex-1 overflow-y-auto pr-1 hide-scrollbar max-h-[220px]">
                {metrics.liabilitiesList.length === 0 ? (
                  <p className="text-xs text-zinc-400 font-medium text-center py-8">All accounts settled.</p>
                ) : (
                  metrics.liabilitiesList.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2.5 border-b border-zinc-100/80 last:border-0">
                      <div>
                        <p className="text-xs font-medium text-zinc-700">{item.name}</p>
                        <p className="text-[9px] text-zinc-400 mt-0.5">{item.type} • {item.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-zinc-800">₹{item.amount.toLocaleString('en-IN')}</p>
                        <button 
                          onClick={() => setActivePage(item.type === 'Payroll' ? 'Salaries' : 'Purchases')} 
                          className="text-[9px] text-blue-500 hover:text-blue-600 font-medium mt-0.5"
                        >
                          Resolve →
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* BOTTOM SECTION: Project-wise Cards */}
          <div>
            <div className="flex justify-between items-center mb-4 mt-2">
              <h3 className="text-xs font-semibold text-zinc-700 uppercase tracking-widest">Project Job Costing</h3>
              <button onClick={() => setActivePage('Projects')} className="text-[10px] text-zinc-500 hover:text-zinc-800 font-medium">View All →</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {metrics.projects.length === 0 ? (
                <div className="col-span-full py-8 text-center text-zinc-400 font-medium text-xs border border-dashed border-zinc-300 rounded-2xl">No active projects found.</div>
              ) : (
                metrics.projects.slice(0, 3).map(proj => (
                  <div key={proj.id} className="bg-white border border-zinc-200/80 p-5 rounded-2xl shadow-sm hover:border-zinc-300 transition-colors cursor-pointer" onClick={() => setActivePage('Projects')}>
                    
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-sm font-semibold text-zinc-800">{proj.name}</h4>
                        <p className="text-[10px] text-zinc-500">{proj.clientName}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">PO Budget</span>
                        <span className="font-medium text-zinc-700">₹{proj.budget.toLocaleString('en-IN', {maximumFractionDigits: 0})}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Billed</span>
                        <span className="font-medium text-emerald-600">₹{proj.billed.toLocaleString('en-IN', {maximumFractionDigits: 0})}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Cost (Mat+Lab)</span>
                        <span className="font-medium text-zinc-700">₹{proj.spent.toLocaleString('en-IN', {maximumFractionDigits: 0})}</span>
                      </div>

                      {/* Micro Progress Bar */}
                      <div className="pt-3 mt-1 border-t border-zinc-100">
                        <div className="w-full bg-zinc-100 rounded-full h-1 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ${proj.progress > 85 ? 'bg-red-400' : proj.progress > 65 ? 'bg-amber-400' : 'bg-emerald-400'}`} 
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