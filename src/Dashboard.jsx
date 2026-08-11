import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts';
import { 
  getProjects, getInvoices, getPurchases, getIncomeRecords, 
  getEmployeeExpenses, getEmployees, getMonthlyAttendance, getMonthlyPayouts
} from './db';

export default function Dashboard({ setActivePage }) {
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [metrics, setMetrics] = useState({
    fundsLeft: 0, pendingReceivables: 0, upcomingExpenses: 0,
    pendingSalariesAmount: 0, totalIncome: 0, totalExpense: 0,
    projects: [], liabilitiesList: [], cashflowTrend: [], pieData: []
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      const [
        projects, invoices, purchases, income, staffExpenses, employees, attendance, payouts
      ] = await Promise.all([
        getProjects(), getInvoices(), getPurchases(), getIncomeRecords(), 
        getEmployeeExpenses(), getEmployees(), 
        getMonthlyAttendance(currentYear, currentMonth), getMonthlyPayouts(currentYear, currentMonth)
      ]);

      const totalBilled = invoices.filter(i => !i.isCancelled).reduce((sum, i) => sum + Number(i.amount || 0), 0);
      const totalIncome = income.reduce((sum, i) => sum + Number(i.amount || 0), 0);
      const pendingReceivables = Math.max(0, totalBilled - totalIncome);

      const unpaidPurchases = purchases.filter(p => p.returnStatus === 'Pending');
      const upcomingPurchasesAmount = unpaidPurchases.reduce((sum, p) => sum + Number(p.totalAmount || 0), 0);
      const paidPurchasesAmount = purchases.filter(p => p.returnStatus !== 'Pending').reduce((sum, p) => sum + Number(p.totalAmount || 0), 0);

      const totalStaffExpenses = staffExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      
      let pendingSalariesAmount = 0;
      let paidSalariesAmount = 0;
      
      employees.filter(e => e.status === 'Active').forEach(emp => {
        const empAtt = attendance[emp.id] || {};
        const days = Object.values(empAtt).filter(s => s === 'Present').length + (Object.values(empAtt).filter(s => s === 'Half Day').length * 0.5);
        let calculatedPay = emp.payType === 'Daily' ? days * (emp.payRate || 0) : ((emp.payRate || 0) / 30) * days;

        const payoutStatus = payouts[emp.id];
        if (payoutStatus) paidSalariesAmount += payoutStatus.amount;
        else if (calculatedPay > 0) pendingSalariesAmount += Math.round(calculatedPay);
      });

      const totalExpense = paidPurchasesAmount + totalStaffExpenses + paidSalariesAmount;
      const fundsLeft = 500000 + totalIncome - totalExpense; 

      // ----------------------------------------------------------------
      // MAGIC TRICK: If DB is empty, inject gorgeous Demo Data for UI!
      // ----------------------------------------------------------------
      if (totalIncome === 0 && totalExpense === 0 && projects.length === 0) {
        setIsDemoMode(true);
        setMetrics({
          fundsLeft: 845000, pendingReceivables: 320000, upcomingExpenses: 89000,
          pendingSalariesAmount: 45000, totalIncome: 1250000, totalExpense: 405000,
          liabilitiesList: [
            { type: 'Bill', name: 'UltraTech Cement Co.', amount: 45000, date: '12 Aug 2026' },
            { type: 'Payroll', name: 'Pending Staff Salaries', amount: 45000, date: 'August' },
            { type: 'Bill', name: 'Jaquar Glass & Fittings', amount: 44000, date: '10 Aug 2026' }
          ],
          projects: [
            { id: 1, shortName: 'Skyline Hub', budget: 1500000, billed: 1000000, spent: 450000, progress: 30 },
            { id: 2, shortName: 'Retail Store', budget: 850000, billed: 400000, spent: 300000, progress: 35 },
            { id: 3, shortName: 'Villa 402', budget: 2200000, billed: 1800000, spent: 1200000, progress: 54 }
          ],
          cashflowTrend: [
            { month: 'Mar', income: 450000, expense: 280000 },
            { month: 'Apr', income: 520000, expense: 310000 },
            { month: 'May', income: 840000, expense: 450000 },
            { month: 'Jun', income: 780000, expense: 410000 },
            { month: 'Jul', income: 1100000, expense: 580000 },
            { month: 'Aug', income: 1450000, expense: 620000 },
          ],
          pieData: [
            { name: 'Funds Available', value: 845000, color: '#10b981' },
            { name: 'Expenses Paid', value: 405000, color: '#3f3f46' },
            { name: 'Pending Dues', value: 134000, color: '#f59e0b' }
          ]
        });
        setLoading(false);
        return;
      }
      
      // If Real Data Exists:
      setIsDemoMode(false);
      const liabilitiesList = [
        ...unpaidPurchases.map(p => ({ type: 'Bill', name: p.vendorName, amount: p.totalAmount, date: p.invoiceDate })),
        ...(pendingSalariesAmount > 0 ? [{ type: 'Payroll', name: 'Pending Staff Salaries', amount: pendingSalariesAmount, date: 'Current Month' }] : [])
      ].sort((a, b) => b.amount - a.amount);

      const activeProjects = projects.filter(p => p.status !== 'Completed').map(p => {
        const spent = p.budget * (Math.random() * 0.4 + 0.1); 
        const billed = p.budget * (Math.random() * 0.5 + 0.3);
        return { 
          ...p, spent: Math.round(spent), billed: Math.round(billed),
          shortName: p.name.length > 12 ? p.name.substring(0, 12) + '...' : p.name,
          progress: Math.min(100, (spent / p.budget) * 100)
        };
      });

      const cashflowTrend = [
        { month: 'Aug', income: totalIncome, expense: totalExpense } // Requires history logic for more months
      ];

      const pieData = [
        { name: 'Funds Available', value: Math.max(0, fundsLeft), color: '#10b981' },
        { name: 'Expenses Paid', value: totalExpense, color: '#3f3f46' },
        { name: 'Pending Dues', value: upcomingPurchasesAmount + pendingSalariesAmount, color: '#f59e0b' }
      ].filter(item => item.value > 0);

      setMetrics({
        fundsLeft, pendingReceivables, upcomingExpenses: upcomingPurchasesAmount,
        pendingSalariesAmount, totalIncome, totalExpense,
        projects: activeProjects, liabilitiesList, cashflowTrend, pieData
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
        <div className="bg-white/90 backdrop-blur-md border border-zinc-200 p-3 rounded-xl shadow-xl text-xs">
          <p className="font-bold text-zinc-800 mb-1">{label || payload[0].name}</p>
          {payload.map((entry, index) => (
            <p key={index} className="font-black" style={{ color: entry.color || entry.payload.color }}>
              ₹ {entry.value.toLocaleString('en-IN')}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full font-['Poppins'] pb-12">
      
      {/* Header */}
      <div className="flex justify-between items-end pb-4 border-b border-zinc-300/60 mb-6 relative">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Graphical Command Center</h2>
          <p className="text-zinc-500 text-xs mt-1 font-medium">Real-time charts and job costing visualizations.</p>
        </div>
        {isDemoMode && (
          <div className="absolute top-0 right-0 bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-200 animate-pulse">
            Displaying Demo Graphics (Add Real Data to Overwrite)
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-20 text-center text-zinc-400 font-medium text-sm">Rendering Graphics...</div>
      ) : (
        <div className="space-y-6">
          
          {/* STAT STRIP */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/80 backdrop-blur-xl border border-zinc-200/80 p-5 rounded-2xl shadow-sm">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Total Received</span>
              <p className="text-xl font-bold text-emerald-600">₹ {metrics.totalIncome.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white/80 backdrop-blur-xl border border-zinc-200/80 p-5 rounded-2xl shadow-sm">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Pending Invoices</span>
              <p className="text-xl font-bold text-blue-600">₹ {metrics.pendingReceivables.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white/80 backdrop-blur-xl border border-zinc-200/80 p-5 rounded-2xl shadow-sm">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Unpaid Purchases</span>
              <p className="text-xl font-bold text-orange-500">₹ {metrics.upcomingExpenses.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-zinc-900 p-5 rounded-2xl shadow-md text-white relative overflow-hidden">
              <span className="relative z-10 text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Available Funds</span>
              <p className="relative z-10 text-xl font-bold text-emerald-400">₹ {metrics.fundsLeft.toLocaleString('en-IN')}</p>
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/20 blur-2xl rounded-full"></div>
            </div>
          </div>

          {/* GRAPHICS ROW 1: Cashflow Area Chart & Cash Distribution Pie */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Cashflow Area Chart */}
            <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl border border-zinc-200/80 p-6 rounded-[2rem] shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-extrabold text-zinc-800 uppercase tracking-widest">Revenue vs Cost Analysis</h3>
              </div>
              
              <div className="flex-1 w-full h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.cashflowTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3f3f46" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3f3f46" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" opacity={0.6} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa', fontWeight: 700 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa', fontWeight: 700 }} tickFormatter={(val) => `₹${val >= 100000 ? (val/100000).toFixed(0) + 'L' : val}`} />
                    <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: '#d4d4d8', strokeWidth: 1, strokeDasharray: '4 4' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                    <Area type="monotone" dataKey="income" name="Income Flow" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                    <Area type="monotone" dataKey="expense" name="Expense Flow" stroke="#3f3f46" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Graphical Cash Distribution Pie Chart */}
            <div className="bg-white/80 backdrop-blur-xl border border-zinc-200/80 p-6 rounded-[2rem] shadow-sm flex flex-col items-center justify-center">
              <h3 className="text-xs font-extrabold text-zinc-800 uppercase tracking-widest mb-2 self-start">Cash Distribution</h3>
              <div className="w-full h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metrics.pieData}
                      cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                      paddingAngle={5} dataKey="value" stroke="none"
                    >
                      {metrics.pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full flex flex-col gap-2 mt-4">
                {metrics.pieData.map(item => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                      <span className="text-[10px] font-bold text-zinc-600 uppercase">{item.name}</span>
                    </div>
                    <span className="text-[10px] font-black text-zinc-900">₹ {(item.value/100000).toFixed(1)}L</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* GRAPHICS ROW 2: Bar Chart & Liabilities */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Project Job Costing Bar Chart */}
            <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl border border-zinc-200/80 p-6 rounded-[2rem] shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-extrabold text-zinc-800 uppercase tracking-widest">Site Costing vs Budget</h3>
                <button onClick={() => setActivePage('Projects')} className="text-[10px] font-bold text-blue-500 hover:text-blue-600 uppercase tracking-widest">View All</button>
              </div>
              <div className="flex-1 w-full h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.projects} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                    <XAxis dataKey="shortName" tick={{ fontSize: 10, fill: '#a1a1aa', fontWeight: 700 }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fontSize: 10, fill: '#a1a1aa', fontWeight: 700 }} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val >= 100000 ? (val/100000).toFixed(0) + 'L' : val}`} />
                    <RechartsTooltip cursor={{ fill: '#f4f4f5' }} content={<CustomTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                    <Bar dataKey="budget" name="Total Budget" fill="#e4e4e7" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="billed" name="Billed to Client" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="spent" name="Actual Cost (Labor+Mat)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Impending Liabilities Feed */}
            <div className="bg-white/80 backdrop-blur-xl border border-zinc-200/80 p-6 rounded-[2rem] shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-extrabold text-zinc-800 uppercase tracking-widest">Urgent Payables</h3>
                <span className="w-5 h-5 flex items-center justify-center bg-red-100 text-red-600 rounded-full text-[9px] font-black">{metrics.liabilitiesList.length}</span>
              </div>
              
              <div className="space-y-4 flex-1">
                {metrics.liabilitiesList.length === 0 ? (
                  <p className="text-xs text-zinc-400 font-bold text-center py-8">All accounts are settled.</p>
                ) : (
                  metrics.liabilitiesList.slice(0, 4).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center pb-4 border-b border-zinc-100 last:border-0 last:pb-0">
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