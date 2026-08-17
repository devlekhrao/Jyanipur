import React, { useState, useEffect } from 'react';
import Dashboard from './Dashboard';
import CRM from './CRM';
import TaxInvoice from './TaxInvoice';
import Estimation from './Estimation';
import EmployeeAttendance from './EmployeeAttendance';
import PurchaseOrders from './PurchaseOrders';
import Purchases from './Purchases';
import Vendors from './Vendors';
import VendorLedger from './VendorLedger';
import Inventory from './Inventory';
import Tools from './Tools';
import RateBook from './RateBook';
import Subcontractors from './Subcontractors';
import EmployeeExpenses from './EmployeeExpenses';
import Salaries from './Salaries';
import Income from './Income';
import GST from './GST';
import Projects from './Projects';
import TaskBoard from './TaskBoard';
import DocumentVault from './DocumentVault';
import SiteSnag from './SiteSnag';
import ProjectControl from './ProjectControl';
import ProjectPnL from './ProjectPnL';
import MeasurementSheet from './MeasurementSheet';
import SiteManager from './SiteManager'; 
import PettyCash from './PettyCash';
import Settings from './Settings';

export default function DesktopLayout() {
  // --- AUTHENTICATION STATE ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  
  // Check local storage on initial load to keep user signed in
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('jyanipur_auth') === 'true';
  });
  
  // --- NAVIGATION STATE ---
  const [activePage, setActivePage] = useState('Dashboard');
  const [visitedPages, setVisitedPages] = useState(new Set(['Dashboard']));
  const [dirtyStates, setDirtyStates] = useState({});
  const [pendingPage, setPendingPage] = useState(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({
    "Workspace": true,
    "Site Execution": false,
    "Finance & Sales": false,
    "Supply Chain": false,
    "Team & HR": false
  });

  const teakTintFilter = 'brightness(0) saturate(100%) invert(36%) sepia(61%) saturate(2251%) hue-rotate(5deg) brightness(95%) contrast(92%)';

  const updateDirtyState = (pageName, isDirty) => {
    setDirtyStates(prev => ({ ...prev, [pageName]: isDirty }));
  };

  const handlePageSwitch = (pageName) => {
    if (activePage === pageName) return;
    if (dirtyStates[activePage]) {
      setPendingPage(pageName);
      setShowWarningModal(true);
    } else {
      commitPageSwitch(pageName);
    }
  };

  const commitPageSwitch = (pageName) => {
    setActivePage(pageName);
    setVisitedPages(prev => new Set(prev).add(pageName));
  };

  const handleSaveDraft = () => {
    setShowWarningModal(false);
    commitPageSwitch(pendingPage);
  };

  const handleDiscard = () => {
    if (activePage === 'TaxInvoice') {
      localStorage.removeItem('draft_invoiceDetails');
      localStorage.removeItem('draft_items');
      localStorage.removeItem('draft_taxMode');
      localStorage.removeItem('draft_editingId');
      localStorage.removeItem('draft_invoiceView');
    }
    if (activePage === 'Purchase Orders') {
      localStorage.removeItem('draft_poDetails');
      localStorage.removeItem('draft_poItems');
      localStorage.removeItem('draft_poEditingId');
      localStorage.removeItem('draft_poView');
    }
    
    setVisitedPages(prev => {
      const newSet = new Set(prev);
      newSet.delete(activePage);
      return newSet;
    });
    setDirtyStates(prev => ({ ...prev, [activePage]: false }));
    setShowWarningModal(false);
    commitPageSwitch(pendingPage);
  };

  const navigationGroups = [
    { title: "Workspace", pages: ['Dashboard', 'CRM', 'Projects', 'Task Board', 'Document Vault'] },
    { title: "Site Execution", pages: ['Project Control', 'Daily Report', 'Site Snags', 'Measurement Sheet'] },
    { title: "Finance & Sales", pages: ['Estimation', 'Tax Invoice', 'Project P&L', 'Income', 'Petty Cash', 'GST Filing'] },
    { title: "Supply Chain", pages: ['Purchase Orders', 'Purchases', 'Vendors', 'Vendor Ledger', 'Inventory', 'Rate Book', 'Tools & Assets', 'Subcontractors'] },
    { title: "Team & HR", pages: ['Employee Attendance', 'Staff Expenses', 'Salaries'] }
  ];

  useEffect(() => {
    const activeGroup = navigationGroups.find(g => g.pages.includes(activePage));
    if (activeGroup && !expandedGroups[activeGroup.title]) {
      setExpandedGroups(prev => ({ ...prev, [activeGroup.title]: true }));
    }
  }, [activePage]);

  const toggleGroup = (title) => {
    setExpandedGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const defaultSettings = {
    companyName: 'Jyanipur Interiors & Construction',
    companyAddress: '302 Amrutha lakshmi residency, Raja rajeshwari nagar, Kondapur, Hyderabad, Telangana, 500084',
    companyGst: '36OEYPS9800J1Z9',
    companyEmail: 'accounts@jyanipur.in',
    companyPhone: '+91 9246546742',
    logoUrl: '/jyanipur.png',
  };

  const [companySettings, setCompanySettings] = useState(() => {
    const saved = localStorage.getItem('jyanipur_companySettings');
    if (saved && saved !== 'undefined') {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return defaultSettings;
  });

  const handleLogin = (e) => {
    e.preventDefault();
    
    const enteredEmail = e.target.email.value;
    const enteredPassword = e.target.password.value;

    if (enteredEmail === 'accounts@jyanipur.in' && enteredPassword === '@llIneedis1.978') {
      setError('');
      setIsLoggedIn(true);
      
      if (rememberMe) {
        localStorage.setItem('jyanipur_auth', 'true');
      }
    } else {
      setError('Invalid credentials. Please try again.');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setEmail('');
    setPassword('');
    localStorage.removeItem('jyanipur_auth');
    setActivePage('Dashboard');
    setVisitedPages(new Set(['Dashboard']));
    setDirtyStates({});
  };

  if (isLoggedIn) {
    return (
      <div className="flex w-screen h-screen overflow-hidden bg-zinc-50 font-['Poppins'] text-zinc-900 selection:bg-amber-100">
        
        {/* WARNING MODAL */}
        {showWarningModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm px-4">
            <div className="bg-slate-900 border border-white/10 p-8 rounded-2xl shadow-2xl max-w-sm w-full">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mb-5 border border-amber-500/30">
                <span className="text-xl">⚠️</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Unsaved Progress</h3>
              <p className="text-slate-400 text-xs mb-8">
                You have unsaved changes in <strong className="text-white">{activePage}</strong>.
              </p>
              <div className="flex flex-col gap-3">
                <button onClick={handleSaveDraft} className="w-full bg-[#B45309] text-white font-bold py-3 rounded-xl text-xs uppercase cursor-pointer">Save Draft & Switch</button>
                <button onClick={handleDiscard} className="w-full bg-red-500/10 text-red-400 font-bold py-3 rounded-xl text-xs uppercase border border-red-500/30 cursor-pointer">Discard Changes</button>
                <button onClick={() => setShowWarningModal(false)} className="w-full text-slate-300 font-bold py-3 rounded-xl text-xs uppercase cursor-pointer">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* LIGHT SIDEBAR WITH TEAK ACCENTS */}
        <aside className="print:hidden w-[260px] h-full bg-white text-zinc-800 flex flex-col flex-shrink-0 z-20 shadow-sm border-r border-[#B45309]/20">            
          <div className="p-6 flex items-center justify-center gap-3 border-b border-zinc-100">
            <img 
              src={companySettings.logoUrl} 
              alt="Logo" 
              className="h-12 w-auto object-contain drop-shadow-sm" 
              style={{ filter: teakTintFilter }} 
              onError={(e) => { e.target.style.display='none'; }} 
            />
            <span className="font-bold text-xl tracking-[0.2em] uppercase text-[#B45309] leading-none flex items-center">
              Jyanipur
            </span>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2 [&::-webkit-scrollbar]:hidden">
            {navigationGroups.map((group) => (
              <div key={group.title} className="flex flex-col mb-2">
                <button onClick={() => toggleGroup(group.title)} className="flex items-center justify-between px-3 py-2 w-full text-left cursor-pointer group/nav rounded-lg hover:bg-zinc-100 transition-colors">
                  <span className="text-[10px] font-semibold text-[11px] text-[#B45309] uppercase tracking-widest">{group.title}</span>
                  <svg className={`w-3.5 h-3.5 text-[#B45309]/70 transition-transform ${expandedGroups[group.title] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </button>
                {expandedGroups[group.title] && (
                  <div className="flex flex-col gap-1 mt-1">
                    {group.pages.map((page) => (
                      <button key={page} onClick={() => handlePageSwitch(page)} className={`text-left px-3 py-2.5 rounded-xl text-xs transition-all duration-200 flex items-center ${activePage === page ? 'bg-[#B45309] text-white font-bold shadow-md shadow-[#B45309]/20 translate-x-1' : 'text-[#B45309]/80 hover:bg-[#B45309]/10 hover:text-[#B45309] cursor-pointer'}`}>
                        {page}
                        {dirtyStates[page] && <span className={`ml-auto w-1.5 h-1.5 rounded-full ${activePage === page ? 'bg-white' : 'bg-[#B45309]'}`}></span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex flex-col gap-2">
            <button onClick={() => handlePageSwitch('Settings')} className={`w-full py-3 rounded-xl text-[10px] uppercase font-bold cursor-pointer transition-all ${activePage === 'Settings' ? 'bg-[#B45309] text-white shadow-md' : 'bg-white text-[#B45309] border border-[#B45309]/20 hover:bg-[#B45309]/10'}`}>Settings</button>
            <button onClick={handleLogout} className="w-full bg-white text-red-600 border border-red-200 hover:bg-red-500 hover:text-white py-3 rounded-xl text-[10px] uppercase font-bold cursor-pointer transition-colors">Log Out</button>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="print:w-full print:ml-0 print:block flex-1 h-full overflow-hidden flex flex-col relative bg-zinc-50">
          
          {/* TOP BAR */}
          <header className="print:hidden w-full h-16 bg-white border-b border-zinc-200/80 px-8 flex items-center justify-between z-10 flex-shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Quick Shortcuts</span>
              <div className="h-4 w-[1px] bg-zinc-200 mx-1"></div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handlePageSwitch('Tax Invoice')}
                  className="px-3.5 py-2 bg-[#B45309]/10 hover:bg-[#B45309] text-[#B45309] hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="text-sm leading-none">+</span> Add Tax Invoice
                </button>

                <button 
                  onClick={() => handlePageSwitch('Purchases')}
                  className="px-3.5 py-2 bg-[#B45309]/10 hover:bg-[#B45309] text-[#B45309] hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="text-sm leading-none">+</span> Add Purchase
                </button>

                <button 
                  onClick={() => handlePageSwitch('Estimation')}
                  className="px-3.5 py-2 bg-[#B45309]/10 hover:bg-[#B45309] text-[#B45309] hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="text-sm leading-none">+</span> Add Estimation
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-bold text-zinc-800">Accounts Portal</p>
                <p className="text-[10px] font-semibold text-zinc-400">accounts@jyanipur.in</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-[#B45309] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                JIC
              </div>
            </div>
          </header>

          {/* PAGE CONTENT */}
          <div className="print:p-0 print:overflow-visible flex-1 overflow-y-auto p-6 lg:p-8 custom-scrollbar">
            <div className="w-full h-full">
              {visitedPages.has('Dashboard') && <div className={activePage === 'Dashboard' ? 'block' : 'hidden'}><Dashboard setActivePage={handlePageSwitch} /></div>}
              {visitedPages.has('CRM') && <div className={activePage === 'CRM' ? 'block' : 'hidden'}><CRM /></div>}
              {visitedPages.has('Projects') && <div className={activePage === 'Projects' ? 'block' : 'hidden'}><Projects /></div>}
              {visitedPages.has('Task Board') && <div className={activePage === 'Task Board' ? 'block' : 'hidden'}><TaskBoard /></div>}
              {visitedPages.has('Project Control') && <div className={activePage === 'Project Control' ? 'block' : 'hidden'}><ProjectControl /></div>}
              {visitedPages.has('Site Snags') && <div className={activePage === 'Site Snags' ? 'block' : 'hidden'}><SiteSnag companySettings={companySettings} /></div>}
              {visitedPages.has('Document Vault') && <div className={activePage === 'Document Vault' ? 'block' : 'hidden'}><DocumentVault /></div>}
              {visitedPages.has('Project P&L') && <div className={activePage === 'Project P&L' ? 'block' : 'hidden'}><ProjectPnL /></div>}
              {visitedPages.has('Daily Report') && <div className={activePage === 'Daily Report' ? 'block' : 'hidden'}><SiteManager /></div>}
              {visitedPages.has('Petty Cash') && <div className={activePage === 'Petty Cash' ? 'block' : 'hidden'}><PettyCash /></div>}
              {visitedPages.has('Measurement Sheet') && <div className={activePage === 'Measurement Sheet' ? 'block' : 'hidden'}><MeasurementSheet /></div>}
              {visitedPages.has('Purchase Orders') && <div className={activePage === 'Purchase Orders' ? 'block' : 'hidden'}><PurchaseOrders companySettings={companySettings} updateDirtyState={updateDirtyState} /></div>}
              {visitedPages.has('Tax Invoice') && <div className={activePage === 'Tax Invoice' ? 'block' : 'hidden'}><TaxInvoice companySettings={companySettings} updateDirtyState={updateDirtyState} /></div>}
              {visitedPages.has('Estimation') && <div className={activePage === 'Estimation' ? 'block' : 'hidden'}><Estimation companySettings={companySettings} /></div>}
              {visitedPages.has('Purchases') && <div className={activePage === 'Purchases' ? 'block' : 'hidden'}><Purchases /></div>}
              {visitedPages.has('Vendors') && <div className={activePage === 'Vendors' ? 'block' : 'hidden'}><Vendors /></div>}
              {visitedPages.has('Vendor Ledger') && <div className={activePage === 'Vendor Ledger' ? 'block' : 'hidden'}><VendorLedger /></div>}
              {visitedPages.has('Inventory') && <div className={activePage === 'Inventory' ? 'block' : 'hidden'}><Inventory /></div>}
              {visitedPages.has('Tools & Assets') && <div className={activePage === 'Tools & Assets' ? 'block' : 'hidden'}><Tools /></div>}
              {visitedPages.has('Rate Book') && <div className={activePage === 'Rate Book' ? 'block' : 'hidden'}><RateBook /></div>}
              {visitedPages.has('Subcontractors') && <div className={activePage === 'Subcontractors' ? 'block' : 'hidden'}><Subcontractors /></div>}
              {visitedPages.has('Employee Attendance') && <div className={activePage === 'Employee Attendance' ? 'block' : 'hidden'}><EmployeeAttendance companySettings={companySettings} /></div>}
              {visitedPages.has('Staff Expenses') && <div className={activePage === 'Staff Expenses' ? 'block' : 'hidden'}><EmployeeExpenses /></div>}
              {visitedPages.has('Salaries') && <div className={activePage === 'Salaries' ? 'block' : 'hidden'}><Salaries /></div>}
              {visitedPages.has('Income') && <div className={activePage === 'Income' ? 'block' : 'hidden'}><Income /></div>}
              {visitedPages.has('GST Filing') && <div className={activePage === 'GST Filing' ? 'block' : 'hidden'}><GST /></div>}
              {visitedPages.has('Settings') && (
                <div className={activePage === 'Settings' ? 'block' : 'hidden'}>
                  <Settings companySettings={companySettings} setCompanySettings={setCompanySettings} />
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-screen h-[100dvh] flex items-center justify-center bg-[url('/background.png')] bg-cover bg-center bg-no-repeat px-4 font-['Poppins'] overflow-hidden overscroll-none bg-zinc-900">
      
      <div className="absolute inset-0 bg-[#B45309]/30 mix-blend-multiply"></div>
      <div className="absolute inset-0 bg-black/40"></div>

      <div className="max-w-md w-full bg-white/95 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_40px_80px_rgba(0,0,0,0.5)] border border-white/40 p-10 relative z-10">
        
        <div className="mb-12 flex flex-col items-center text-center">
          <img 
            src="/jyanipur.png" 
            alt="Jyanipur Symbol" 
            className="h-28 w-auto object-contain drop-shadow-sm" 
            style={{ filter: teakTintFilter }} 
            onError={(e) => { e.target.style.display='none'; }} 
          />
          <p className="text-zinc-500 text-xs uppercase tracking-widest mt-6 font-bold">Portal Access</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50/90 text-red-600 text-xs rounded-2xl border border-red-200 text-center font-bold tracking-wide">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Work Email</label>
            <input 
              type="email" 
              name="email"
              autoComplete="email"
              placeholder="Enter your registered email"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full px-5 py-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B45309] text-zinc-900 text-sm font-medium transition-all shadow-inner" 
              required 
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Passkey</label>
            <input 
              type="password" 
              name="password"
              autoComplete="current-password"
              placeholder="Enter your secure passkey"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full px-5 py-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B45309] text-zinc-900 text-sm font-medium transition-all shadow-inner" 
              required 
            />
          </div>

          <div className="flex items-center pt-2 pb-2 ml-1">
            <input 
              type="checkbox" 
              id="rememberMe" 
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 text-[#B45309] bg-zinc-100 border-zinc-300 rounded focus:ring-[#B45309] cursor-pointer"
            />
            <label htmlFor="rememberMe" className="ml-3 text-xs font-bold text-zinc-500 cursor-pointer select-none">
              Keep me signed in
            </label>
          </div>

          <button type="submit" className="w-full py-4 bg-[#B45309] hover:bg-[#92400E] text-white font-bold rounded-2xl transition-all mt-6 cursor-pointer text-sm shadow-[0_10px_20px_rgba(180,83,9,0.2)] hover:shadow-[0_15px_25px_rgba(180,83,9,0.3)] hover:-translate-y-1 tracking-wide">
            Enter Portal
          </button>
        </form>
      </div>
    </div>
  );
}