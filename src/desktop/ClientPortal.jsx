import React, { useState, useEffect } from 'react';
import { getProjects, getInvoices, getIncomeRecords, getVaultDocuments } from '../db';

export default function ClientPortal() {
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [activeClient, setActiveClient] = useState('');
  const [activeTab, setActiveTab] = useState('DASHBOARD'); // DASHBOARD, MOODBOARD, GALLERY
  
  // Client Data States
  const [clientProjects, setClientProjects] = useState([]);
  const [clientFinancials, setClientFinancials] = useState({ totalBilled: 0, totalPaid: 0, balance: 0 });
  const [clientDocs, setClientDocs] = useState([]);

  // Mock Moodboard State (In production, this would be a DB table linked to the project)
  const [moodboard, setMoodboard] = useState([
    { id: 1, category: 'Living Room Flooring', name: 'Italian Statuario Marble', image: 'https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=400&q=80', status: 'Pending', notes: 'Premium finish, highly durable.' },
    { id: 2, category: 'Master Bed Wardrobe', name: 'Charcoal Matte Laminate (Merino)', image: 'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=400&q=80', status: 'Approved', notes: 'Anti-scratch, soft-touch finish.' },
    { id: 3, category: 'Kitchen Backsplash', name: 'Moroccan Blue Subway Tiles', image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80', status: 'Rejected', notes: 'Client requested a lighter color.' },
    { id: 4, category: 'Sofa Fabric', name: 'Beige Boucle Velvet', image: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=400&q=80', status: 'Pending', notes: 'Stain-resistant fabric.' }
  ]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const projs = await getProjects() || [];
        const uniqueClients = [...new Set(projs.filter(p => p.clientName).map(p => p.clientName))];
        setClients(uniqueClients);
        if (uniqueClients.length > 0 && !activeClient) {
          setActiveClient(uniqueClients[0]);
        }
      } catch (err) {
        console.error("Failed to load clients", err);
      }
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (activeClient) loadClientData(activeClient);
  }, [activeClient]);

  const loadClientData = async (clientName) => {
    setLoading(true);
    try {
      const [allProjs, allInvs, allIncomes, allDocs] = await Promise.all([
        getProjects(),
        getInvoices ? getInvoices() : Promise.resolve([]),
        getIncomeRecords ? getIncomeRecords() : Promise.resolve([]),
        getVaultDocuments()
      ]);

      const myProjects = (allProjs || []).filter(p => p.clientName === clientName);
      setClientProjects(myProjects);

      const myInvoices = (allInvs || []).filter(i => i.client === clientName && !i.isCancelled);
      const totalBilled = myInvoices.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

      const myIncomes = (allIncomes || []).filter(i => myProjects.some(p => String(p.id) === String(i.projectId)));
      const totalPaid = myIncomes.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

      setClientFinancials({
        totalBilled,
        totalPaid,
        balance: Math.max(0, totalBilled - totalPaid)
      });

      const myDocs = (allDocs || []).filter(d => {
        if (d.linkedType === 'Client' && d.linkedName === clientName) return true;
        if (d.linkedType === 'Project' && myProjects.some(p => String(p.id) === String(d.linkedId))) return true;
        return false;
      });
      setClientDocs(myDocs);

    } catch (err) {
      console.error("Failed to load client data", err);
    }
    setLoading(false);
  };

  const handleApproval = (id, newStatus) => {
    setMoodboard(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
    if (newStatus === 'Approved') alert("Material Approved! The execution team has been notified.");
    if (newStatus === 'Rejected') alert("Material Rejected. The design team will propose alternatives.");
  };

  const inputClass = "w-full px-4 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent text-zinc-900 text-sm font-medium transition-all shadow-sm";

  if (!activeClient) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-[#F4F4F5]" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="bg-white p-10 rounded-2xl border border-zinc-200 shadow-sm max-w-md w-full text-center">
          <div className="w-16 h-16 bg-zinc-100 text-zinc-600 rounded-2xl flex items-center justify-center mx-auto mb-5 text-3xl shadow-sm border border-zinc-200">🤝</div>
          <h2 className="text-xl font-bold text-zinc-900 mb-2 tracking-tight">Client Experience Portal</h2>
          <p className="text-zinc-500 text-xs font-medium mb-8 leading-relaxed px-4">A read-only, premium dashboard for your clients to approve materials, track progress, and view dues.</p>
          {clients.length === 0 ? (
            <p className="text-sm text-red-500 font-bold">No active clients found. Add a project first.</p>
          ) : (
            <div className="text-left">
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Simulate Login As:</label>
              <select value={activeClient} onChange={e => setActiveClient(e.target.value)} className={`${inputClass} cursor-pointer`}>
                <option value="" disabled>Select Client...</option>
                {clients.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-[#F4F4F5]" style={{ fontFamily: 'Inter, sans-serif' }}>
      
      {/* BRANDING & SIMULATOR HEADER */}
      <div className="bg-zinc-900 text-white px-8 py-5 flex justify-between items-center shrink-0 shadow-md z-20 rounded-xl mb-6 mx-2 mt-2">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center font-bold text-zinc-900 shadow-sm text-xl">J</div>
          <div>
            <h1 className="font-bold text-sm tracking-[0.15em] uppercase">Jyanipur Client Portal</h1>
            <p className="text-xs text-zinc-400 mt-0.5">Welcome back, <span className="text-white font-semibold">{activeClient}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden md:inline-block text-[10px] font-bold bg-white/10 px-2.5 py-1.5 rounded-md text-zinc-300 uppercase tracking-widest border border-white/10">Viewing As:</span>
          <select value={activeClient} onChange={e => setActiveClient(e.target.value)} className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer border-b border-white/20 pb-0.5 hover:border-white transition-all">
            {clients.map(c => <option key={c} value={c} className="text-zinc-900">{c}</option>)}
          </select>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="px-6 flex gap-6 shrink-0 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] border-b border-zinc-200 mb-6 mx-2">
        {[
          { id: 'DASHBOARD', label: 'Project Dashboard' },
          { id: 'MOODBOARD', label: 'Material Approvals' },
          { id: 'GALLERY', label: 'Site Gallery & Docs' }
        ].map(tab => (
          <button 
            key={tab.id} onClick={() => setActiveTab(tab.id)} 
            className={`text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap pb-3 border-b-2 ${
              activeTab === tab.id ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-2 pb-8">
        {loading ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-sm flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin"></div>
            <p>Loading your secure portal...</p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* ========================================== */}
            {/* TAB 1: DASHBOARD */}
            {/* ========================================== */}
            {activeTab === 'DASHBOARD' && (
              <>
                <div className="px-2">
                  <h2 className="text-xl font-bold text-zinc-900 tracking-tight mb-1">Project Overview</h2>
                  <p className="text-sm text-zinc-500 font-medium">Track your financial summary and site status.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-sm flex flex-col justify-center">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">Total Billed to Date</span>
                    <p className="text-3xl font-black text-zinc-900">₹{clientFinancials.totalBilled.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl shadow-sm flex flex-col justify-center">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block mb-1.5">Payments Received</span>
                    <p className="text-3xl font-black text-emerald-700">₹{clientFinancials.totalPaid.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-red-50 border border-red-100 p-6 rounded-2xl shadow-sm flex flex-col justify-center">
                    <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest block mb-1.5">Outstanding Balance</span>
                    <p className="text-3xl font-black text-red-600">₹{clientFinancials.balance.toLocaleString('en-IN')}</p>
                  </div>
                </div>

                <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-zinc-100 bg-zinc-50/50">
                    <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-widest">Active Sites</h3>
                  </div>
                  <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {clientProjects.map(p => (
                      <div key={p.id} className="border border-zinc-200 rounded-xl p-5 flex items-center justify-between hover:border-zinc-300 transition-colors bg-zinc-50/50">
                        <div>
                          <h4 className="font-bold text-zinc-900 text-sm tracking-tight">{p.name || p.projectName}</h4>
                          <p className="text-[11px] text-zinc-500 font-medium mt-1 uppercase tracking-wider">Started: {p.poDate || 'TBD'}</p>
                        </div>
                        <span className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${
                          p.status === 'Ongoing' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          p.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          'bg-zinc-100 text-zinc-600 border-zinc-200'
                        }`}>
                          {p.status || 'Planning'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ========================================== */}
            {/* TAB 2: MOODBOARD & APPROVALS */}
            {/* ========================================== */}
            {activeTab === 'MOODBOARD' && (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
                  <div>
                    <h2 className="text-xl font-bold text-zinc-900 tracking-tight mb-1">Material Selections</h2>
                    <p className="text-sm text-zinc-500 font-medium">Review and approve proposed materials to avoid delays.</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-3 py-1.5 bg-white text-zinc-600 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-zinc-200 shadow-sm">{moodboard.filter(m=>m.status==='Pending').length} Pending</span>
                    <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-emerald-200 shadow-sm">{moodboard.filter(m=>m.status==='Approved').length} Approved</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {moodboard.map(item => (
                    <div key={item.id} className={`bg-white rounded-2xl overflow-hidden shadow-sm border transition-all ${
                      item.status === 'Approved' ? 'border-emerald-500 ring-1 ring-emerald-500' :
                      item.status === 'Rejected' ? 'border-red-300 opacity-75' : 'border-zinc-200 hover:shadow-md hover:border-zinc-300'
                    }`}>
                      <div className="h-48 overflow-hidden relative bg-zinc-100">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        <div className="absolute top-3 left-3">
                          <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm ${
                            item.status === 'Approved' ? 'bg-emerald-500 text-white' :
                            item.status === 'Rejected' ? 'bg-red-500 text-white' : 'bg-white text-zinc-900 border border-zinc-200'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                      </div>
                      <div className="p-5">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">{item.category}</span>
                        <h4 className="font-bold text-zinc-900 text-sm mb-2 leading-tight">{item.name}</h4>
                        <p className="text-[11px] text-zinc-500 font-medium mb-6 line-clamp-2 leading-relaxed">{item.notes}</p>
                        
                        {item.status === 'Pending' ? (
                          <div className="flex gap-2">
                            <button onClick={() => handleApproval(item.id, 'Approved')} className="flex-1 py-2.5 bg-zinc-900 hover:bg-black text-white text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all shadow-sm">
                              Approve
                            </button>
                            <button onClick={() => handleApproval(item.id, 'Rejected')} className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all shadow-sm">
                              Reject
                            </button>
                          </div>
                        ) : item.status === 'Approved' ? (
                          <div className="w-full py-2.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-widest rounded-lg text-center border border-emerald-200 flex items-center justify-center gap-1.5 shadow-sm">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> Digitally Approved
                          </div>
                        ) : (
                          <div className="w-full py-2.5 bg-zinc-50 text-zinc-500 text-[10px] font-bold uppercase tracking-widest rounded-lg text-center border border-zinc-200">
                            Rejected by Client
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ========================================== */}
            {/* TAB 3: SITE GALLERY & DOCS */}
            {/* ========================================== */}
            {activeTab === 'GALLERY' && (
              <>
                <div className="px-2">
                  <h2 className="text-xl font-bold text-zinc-900 tracking-tight mb-1">Site Gallery & Vault</h2>
                  <p className="text-sm text-zinc-500 font-medium">Access your approved 3D renders, site photos, and contracts securely.</p>
                </div>

                {clientDocs.length === 0 ? (
                  <div className="bg-white border border-dashed border-zinc-300 rounded-2xl p-16 text-center">
                    <p className="text-sm text-zinc-500 font-medium">No files have been shared with you yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {clientDocs.map(doc => (
                      <div key={doc.id} className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all group flex flex-col justify-between">
                        <div>
                          <div className="w-full h-32 rounded-xl bg-zinc-50 border border-zinc-100 mb-4 flex items-center justify-center overflow-hidden">
                            {doc.fileType === 'IMAGE' && doc.fileUrl ? (
                              <img src={doc.fileUrl} alt={doc.documentName} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-4xl opacity-50">{doc.fileType === 'PDF' ? '📄' : '📁'}</span>
                            )}
                          </div>
                          <span className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-600 border border-zinc-200 mb-2.5 inline-block">
                            {doc.category || doc.docType || 'Document'}
                          </span>
                          <h4 className="font-bold text-zinc-900 text-sm mb-1 truncate tracking-tight" title={doc.documentName}>{doc.documentName}</h4>
                          <p className="text-[10px] text-zinc-400 font-semibold mb-4 uppercase tracking-widest">{doc.uploadedAt || 'Recently'}</p>
                        </div>
                        <a href={doc.fileUrl} download={doc.documentName} target="_blank" rel="noreferrer" className="w-full py-2.5 bg-zinc-900 hover:bg-black text-white text-[10px] font-bold uppercase tracking-widest rounded-lg text-center transition-all shadow-sm block">
                          Download File
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

          </div>
        )}
      </div>
    </div>
  );
}