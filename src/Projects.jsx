import React, { useState, useEffect } from 'react';
import { getProjects } from './db';

export default function Projects() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    setLoading(true);
    const data = await getProjects();
    
    // Simulating aggregated data from other modules for the UI picture.
    // Once we add project_id to Purchases/Invoices, this will be live data.
    const enhancedProjects = data.map(p => ({
      ...p,
      invoicesCount: Math.floor(Math.random() * 5) + 1,
      totalBilled: p.budget * (Math.random() * 0.5 + 0.4), // 40-90% billed
      totalReceived: p.budget * (Math.random() * 0.4 + 0.3), // 30-70% received
      materialCost: p.budget * (Math.random() * 0.3 + 0.2), // 20-50% material cost
      laborCost: p.budget * (Math.random() * 0.15 + 0.1), // 10-25% labor cost
    }));

    setProjects(enhancedProjects);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Group projects by Client Name
  const clients = {};
  projects.forEach(p => {
    if (!clients[p.clientName]) {
      clients[p.clientName] = {
        name: p.clientName,
        totalBudget: 0,
        totalBilled: 0,
        totalCost: 0,
        projects: []
      };
    }
    clients[p.clientName].projects.push(p);
    clients[p.clientName].totalBudget += p.budget;
    clients[p.clientName].totalBilled += p.totalBilled;
    clients[p.clientName].totalCost += (p.materialCost + p.laborCost);
  });

  const filteredClients = Object.values(clients).filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.projects.some(p => p.name.toLowerCase().includes(q));
  });

  const globalBudget = projects.reduce((sum, p) => sum + p.budget, 0);
  const globalBilled = projects.reduce((sum, p) => sum + p.totalBilled, 0);
  const globalCost = projects.reduce((sum, p) => sum + p.materialCost + p.laborCost, 0);

  return (
    <div className="w-full font-['Poppins'] pb-12">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-4 border-b border-zinc-300/50 mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-800 tracking-tight">Project Board & Job Costing</h2>
          <p className="text-zinc-500 text-xs mt-1 font-medium">Manage client sites, view true profitability, and track sub-projects.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center h-9 bg-white/60 border border-zinc-200/60 rounded-xl px-3 shadow-sm">
            <span className="text-[10px] text-zinc-400">🔍</span>
            <input 
              type="text" 
              placeholder="Search client or project..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-xs font-semibold text-zinc-700 outline-none px-2 w-48 placeholder:text-zinc-400"
            />
          </div>
          <button className="h-9 bg-zinc-900 hover:bg-black text-white px-5 rounded-xl text-xs font-bold transition-all shadow-md">
            + New Project
          </button>
        </div>
      </div>

      {/* Global Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/50 backdrop-blur-xl p-5 rounded-3xl border border-white/60 shadow-sm">
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest block mb-1">Total Active PO Budgets</span>
          <p className="text-xl font-bold text-zinc-800">₹ {globalBudget.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
        </div>
        <div className="bg-white/50 backdrop-blur-xl p-5 rounded-3xl border border-white/60 shadow-sm">
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest block mb-1">Total Billed (Invoices)</span>
          <p className="text-xl font-bold text-zinc-600">₹ {globalBilled.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
        </div>
        <div className="bg-white/50 backdrop-blur-xl p-5 rounded-3xl border border-white/60 shadow-sm">
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest block mb-1">Total Cost (Mat + Labor)</span>
          <p className="text-xl font-bold text-red-500">₹ {globalCost.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
        </div>
        <div className="bg-emerald-50/50 backdrop-blur-xl p-5 rounded-3xl border border-emerald-100 shadow-sm">
          <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-widest block mb-1">Estimated Net Margin</span>
          <p className="text-xl font-bold text-emerald-700">₹ {(globalBilled - globalCost).toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
        </div>
      </div>

      {/* Client & Project Hierarchy */}
      <div className="space-y-8">
        {loading ? (
          <div className="py-12 text-center text-zinc-500 font-medium">Loading project board...</div>
        ) : filteredClients.length === 0 ? (
          <div className="py-12 text-center text-zinc-400 font-medium">No clients or projects found.</div>
        ) : (
          filteredClients.map(client => (
            <div key={client.name} className="bg-white/50 backdrop-blur-xl rounded-3xl border border-white/60 shadow-xl overflow-hidden">
              
              {/* Client Header */}
              <div className="bg-zinc-100/50 px-6 py-4 border-b border-zinc-200/50 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-zinc-800 text-white flex items-center justify-center text-[10px]">{client.name.charAt(0)}</span>
                    {client.name}
                  </h3>
                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mt-1 ml-8">
                    {client.projects.length} Sub-Project{client.projects.length > 1 ? 's' : ''} Active
                  </p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-zinc-800">Client Budget: ₹{client.totalBudget.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
                  <p className="text-[10px] font-semibold text-emerald-600 mt-0.5">Est. Margin: ₹{(client.totalBilled - client.totalCost).toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
                </div>
              </div>

              {/* Projects Table */}
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1000px]">
                  <thead>
                    <tr className="text-zinc-400 text-[9px] uppercase tracking-widest border-b border-zinc-200/50 bg-white/30">
                      <th className="py-3 px-6 font-semibold w-64">Project / Site Name</th>
                      <th className="py-3 px-4 font-semibold text-center w-24">Status</th>
                      <th className="py-3 px-4 font-semibold text-right w-32">PO Budget</th>
                      <th className="py-3 px-4 font-semibold text-right w-32">Billed (Sales)</th>
                      <th className="py-3 px-4 font-semibold text-right w-32">Costs (Mat + Labor)</th>
                      <th className="py-3 px-4 font-semibold text-right w-32">Site Margin</th>
                      <th className="py-3 px-6 font-semibold text-center w-20">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm text-zinc-700 divide-y divide-zinc-200/30">
                    {client.projects.map(proj => {
                      const totalCost = proj.materialCost + proj.laborCost;
                      const margin = proj.totalBilled - totalCost;
                      
                      return (
                        <tr key={proj.id} className="hover:bg-white/60 transition-colors">
                          <td className="py-4 px-6">
                            <p className="font-bold text-zinc-800">{proj.name}</p>
                            <p className="text-[10px] text-zinc-500 font-medium mt-0.5">
                              {proj.invoicesCount} Invoices Linked
                            </p>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className={`inline-block px-2.5 py-1 rounded-md text-[9px] font-semibold uppercase tracking-wider ${
                              proj.status === 'Ongoing' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                              proj.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                              'bg-amber-50 text-amber-600 border border-amber-100'
                            }`}>
                              {proj.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right font-semibold text-zinc-800">
                            ₹{proj.budget.toLocaleString('en-IN', {maximumFractionDigits: 0})}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <p className="font-semibold text-zinc-700">₹{proj.totalBilled.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
                            <p className="text-[9px] text-zinc-400 mt-0.5">₹{proj.totalReceived.toLocaleString('en-IN', {maximumFractionDigits: 0})} Recv</p>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <p className="font-semibold text-red-500">₹{totalCost.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
                            <p className="text-[9px] text-zinc-400 mt-0.5">Mat: ₹{proj.materialCost.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <span className={`font-bold ${margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              ₹{margin.toLocaleString('en-IN', {maximumFractionDigits: 0})}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center space-x-2">
                            <button className="text-[10px] font-bold text-zinc-400 hover:text-zinc-900 uppercase tracking-widest transition-colors">Edit</button>
                            <button className="text-[10px] font-bold text-zinc-400 hover:text-zinc-900 uppercase tracking-widest transition-colors">View</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}