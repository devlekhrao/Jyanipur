import React, { useState, useEffect } from 'react';
import { 
  PieChart, Pie, Cell, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
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
      const fundsLeft = 500000 + totalIncome - totalExpense; // Simulated starting capital

      // 5. Liabilities Feed
      const liabilitiesList = [
        ...unpaidPurchases.map(p => ({ type: 'Bill', name: p.vendorName, amount: p.totalAmount, date: p.invoiceDate })),
        ...(pendingSalariesAmount > 0 ? [{ type: 'Payroll', name: 'Pending Staff Salaries', amount: pendingSalariesAmount, date: 'Current Month' }] : [])
      ].sort((a, b) => b.amount - a.amount);

      // 6. Active Projects for Graph
      const activeProjects = projects.filter(p => p.status !== 'Completed').map(p => {
        const spent = p.budget * (Math.random() * 0.4 + 0.1); 
        const billed = p.budget * (Math.random() * 0.5 + 0.3);
        return { 
          ...p, 
          spent: Math.round(spent), 
          billed: Math.round(billed),
          shortName: p.name.length > 12 ? p.name.substring(0, 12) + '...' : p.name
        };
      });

      setMetrics({
        fundsLeft, pendingReceivables, upcomingExpenses: upcomingPurchasesAmount,
        pendingSalariesAmount, totalIncome, totalExpense,
        projects: activeProjects, liabilitiesList
      });

    } catch (err) {
      console.error("Dashboard failed to load", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- Graph Data Formatting ---
  const cashflowPieData = [
    { name: 'Available Funds', value: Math.max(0, metrics.fundsLeft), color: '#10b981' }, // Emerald
    { name: 'Paid Expenses', value: metrics.totalExpense, color: '#3f3f46' }, // Zinc
    { name: 'Pending Liabilities', value: metrics.upcomingExpenses + metrics.pendingSalariesAmount, color: '#ef4444' } // Red
  ].filter(item => item.value > 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/90 backdrop-blur-md border border-zinc-200 p-3 rounded-xl shadow-xl text-xs">
          <p className="font-bold text-zinc-800 mb-1">{payload[0].name}</p>
          <p className="font-black" style={{ color: payload[0].payload.color || payload[0].fill }}>
            ₹ {payload[0].value.toLocaleString('en-IN')}
          </p>
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
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Command Center</h2>
          <p className="text-zinc-500 text-xs mt-1 font-medium">Graphical overview of active projects and cash flow.</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Available Funds</p>
          <p className="text-2xl font-black text-emerald-600 tracking-tight">₹ {metrics.fundsLeft.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-zinc-400 font-medium text-sm">Rendering graphics...</div>
      ) : (
        <div className="space-y-6">
          
          {/* STAT STRIP */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/80 backdrop-blur-xl border border-zinc-200/80 p-5 rounded-2xl shadow-sm">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Total Received</span>
              <p className="text-lg font-bold text-zinc-800">₹ {metrics.totalIncome.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white/80 backdrop-blur-xl border border-zinc-200/80 p-5 rounded-2xl shadow-sm">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Pending Invoices</span>
              <p className="text-lg font-bold text-blue-600">₹ {metrics.pendingReceivables.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white/80 backdrop-blur-xl border border-zinc-200/80 p-5 rounded-2xl shadow-sm">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Unpaid Purchases</span>
              <p className="text-lg font-bold text-orange-500">₹ {metrics.upcomingExpenses.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-zinc-900 p-5 rounded-2xl shadow-md text-white">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Pending Salaries</span>
              <p className="text-lg font-bold text-red-400">₹ {metrics.pendingSalariesAmount.toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* GRAPHICS ROW */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Cashflow Doughnut Chart */}
            <div className="bg-white/80 backdrop-blur-xl border border-zinc-200/80 p-6 rounded-3xl shadow-sm flex flex-col items-center">
              <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-widest mb-2 self-start">Cash Distribution</h3>
              <div className="w-full h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={cashflowPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {cashflowPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full flex justify-center gap-4 mt-2">
                {cashflowPieData.map(item => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                    <span className="text-[9px] font-bold text-zinc-500 uppercase">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Project Job Costing Bar Chart */}
            <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl border border-zinc-200/80 p-6 rounded-3xl shadow-sm flex flex-col">
              <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-widest mb-4">Project: Budget vs Billed vs Cost</h3>
              <div className="w-full h-[220px] flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.projects} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                    <XAxis 
                      dataKey="shortName" 
                      tick={{ fontSize: 10, fill: '#71717a', fontWeight: 600 }} 
                      axisLine={false} 
                      tickLine={false} 
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fill: '#71717a' }} 
                      axisLine={false} 
                      tickLine={false}
                      tickFormatter={(val) => `₹${val >= 100000 ? (val/100000).toFixed(1) + 'L' : val}`}
                    />
                    <Tooltip cursor={{ fill: '#f4f4f5' }} content={<CustomTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                    <Bar dataKey="budget" name="PO Budget" fill="#e4e4e7" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="billed" name="Billed to Client" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="spent" name="Actual Cost" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* BOTTOM ROW: Action Hub & Liabilities Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Liabilities Feed */}
            <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl border border-zinc-200/80 p-6 rounded-3xl shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-widest">Action Required: Unpaid Liabilities</h3>
                <span className="text-[10px] font-bold bg-red-50 text-red-600 px-2 py-1 rounded uppercase tracking-wider">{metrics.liabilitiesList.length} Items</span>
              </div>
              
              <div className="space-y-4">
                {metrics.liabilitiesList.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-4">No pending payouts. You are fully caught up!</p>
                ) : (
                  metrics.liabilitiesList.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center pb-3 border-b border-zinc-100 last:border-0 last:pb-0">
                      <div>
                        <p className="text-xs font-bold text-zinc-800">{item.name}</p>
                        <div className="flex gap-2 items-center mt-1">
                          <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${item.type === 'Payroll' ? 'bg-amber-100 text-amber-700' : 'bg-zinc-100 text-zinc-600'}`}>
                            {item.type}
                          </span>
                          <span className="text-[9px] text-zinc-400 font-mono">{item.date}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-red-500">₹{item.amount.toLocaleString('en-IN')}</p>
                        <button 
                          onClick={() => setActivePage(item.type === 'Payroll' ? 'Salaries' : 'Purchases')} 
                          className="text-[9px] font-bold text-zinc-400 hover:text-zinc-900 uppercase tracking-widest mt-1"
                        >
                          Resolve →
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-zinc-900 p-6 rounded-3xl shadow-lg flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-6">Quick Shortcuts</h3>
                <div className="space-y-3">
                  <button onClick={() => setActivePage('Tax Invoice')} className="w-full flex items-center justify-between p-3.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors group">
                    <span className="text-xs font-bold text-zinc-200 group-hover:text-white">Create Tax Invoice</span>
                    <span className="text-zinc-500 group-hover:text-white transition-colors text-xs">→</span>
                  </button>
                  <button onClick={() => setActivePage('Purchases')} className="w-full flex items-center justify-between p-3.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors group">
                    <span className="text-xs font-bold text-zinc-200 group-hover:text-white">Log Material Purchase</span>
                    <span className="text-zinc-500 group-hover:text-white transition-colors text-xs">→</span>
                  </button>
                  <button onClick={() => setActivePage('Income')} className="w-full flex items-center justify-between p-3.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors group">
                    <span className="text-xs font-bold text-zinc-200 group-hover:text-white">Record Received Payment</span>
                    <span className="text-zinc-500 group-hover:text-white transition-colors text-xs">→</span>
                  </button>
                  <button onClick={() => setActivePage('Employee Attendance')} className="w-full flex items-center justify-between p-3.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors group">
                    <span className="text-xs font-bold text-zinc-200 group-hover:text-white">Mark Labor Attendance</span>
                    <span className="text-zinc-500 group-hover:text-white transition-colors text-xs">→</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}