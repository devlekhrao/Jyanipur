import React, { useState, useEffect } from 'react';
import Dashboard from './Dashboard';
import CRM from './CRM';
import TaxInvoice from './TaxInvoice';
import Estimation from './Estimation';
import EmployeeAttendance from './EmployeeAttendance';
import PurchaseOrders from './PurchaseOrders';
import Purchases from './Purchases';
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

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState('');
  
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
    { title: "Supply Chain", pages: ['Purchase Orders', 'Purchases', 'Vendor Ledger', 'Inventory', 'Rate Book', 'Tools & Assets', 'Subcontractors'] },
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
    bankName: 'ICICI BANK',
    accountName: 'Jyanipur Interiors',
    accountNo: '437405000324',
    ifscCode: 'ICIC0004374',
    logoUrl: '/jyanipur.png',
    signatureUrl: '',
    showSignatureImage: true,
    showBankDetailsOnPdf: true,
    showTermsOnPdf: true,
    showRemarksOnPdf: true,
    showSignatoryOnPdf: true,
    showGstBreakdownOnPdf: true,
    pdfFooterDisclaimer: 'Thank you for choosing Jyanipur Interiors. For any query, contact accounts@jyanipur.in',
    invoicePrefix: 'JIC/FY26-27/',
    poPrefix: 'PO/',
    woPrefix: 'WO/',
    defaultGstRate: '18',
    defaultTdsRate: '2',
    defaultHsnSac: '9954',
    defaultInvoiceTerms: '1. Payment due within 15 days of invoice date.\n2. Goods/Services once rendered cannot be returned.',
    defaultEstimateTerms: '1. Validity of this estimate is 30 days.\n2. 50% advance required to commence work.',
    defaultPOTerms: '1. Material must match approved specifications.\n2. Delivery delayed beyond 7 days will attract a 5% penalty.',
    waInvoiceTemplate: 'Hello! Attached is your latest invoice from Jyanipur Interiors. Please let us know if you have any questions.',
    waPoTemplate: 'Hello, please find our official Purchase Order attached. Kindly confirm receipt and delivery schedule.',
    defaultWorkStartTime: '09:30',
    defaultWorkEndTime: '18:30',
    overtimeMultiplier: '1.5',
    skilledLaborRate: '1200',
    unskilledLaborRate: '800',
    crmStages: 'New Inquiry, Site Visit, Design Proposed, Negotiation, Contract Signed, Closed Won, Closed Lost',
    projectStatuses: 'Planning, Civil Work, False Ceiling, Flooring, Painting, Carpentry, Handover'
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
    if (email === 'accounts@jyanipur.in' && password === '@llIneedis1.978') {
      setError('');
      setIsLoggedIn(true);
    } else {
      setError('Invalid credentials. Please try again.');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setEmail('');
    setPassword('');
    setActivePage('Dashboard');
    setVisitedPages(new Set(['Dashboard']));
    setDirtyStates({});
  };

  // ==========================================
  // LOGGED IN: STRICT FULL SCREEN LAYOUT
  // ==========================================
  if (isLoggedIn) {
    return (
      <div className="flex w-screen h-screen overflow-hidden bg-zinc-50 font-['Poppins'] text-zinc-900 selection:bg-blue-100">
        
        {/* WARNING MODAL */}
        {showWarningModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm px-4">
            <div className="bg-slate-900 border border-white/10 p-8 rounded-2xl shadow-2xl max-w-sm w-full">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mb-5 border border-amber-500/30">
                <span className="text-xl">⚠️</span>
              </div>
              <h3 className="text-xl font-extrabold text-white mb-2">Unsaved Progress</h3>
              <p className="text-slate-400 text-xs mb-8">
                You have unsaved changes in <strong className="text-white">{activePage}</strong>.
              </p>
              <div className="flex flex-col gap-3">
                <button onClick={handleSaveDraft} className="w-full bg-[#1E3A8A] text-white font-bold py-3 rounded-xl text-xs uppercase cursor-pointer">Save Draft & Switch</button>
                <button onClick={handleDiscard} className="w-full bg-red-500/10 text-red-400 font-bold py-3 rounded-xl text-xs uppercase border border-red-500/30 cursor-pointer">Discard Changes</button>
                <button onClick={() => setShowWarningModal(false)} className="w-full text-slate-300 font-bold py-3 rounded-xl text-xs uppercase cursor-pointer">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* EDGE-TO-EDGE SIDEBAR */}
        <aside className="w-[260px] h-full bg-[#1E3A8A] text-white flex flex-col flex-shrink-0 z-20 shadow-2xl">
          <div className="p-6 flex items-center justify-center gap-3">
            <div className="bg-white p-2 rounded-xl shadow-sm">
              <img src={companySettings.logoUrl} alt="Logo" className="h-6 w-auto object-contain" onError={(e) => { e.target.style.display='none'; }} />
            </div>
            <span className="font-bold text-sm tracking-[0.2em] uppercase">Jyanipur</span>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-2 [&::-webkit-scrollbar]:hidden">
            {navigationGroups.map((group) => (
              <div key={group.title} className="flex flex-col mb-2">
                <button onClick={() => toggleGroup(group.title)} className="flex items-center justify-between px-3 py-2 w-full text-left cursor-pointer group/nav rounded-lg hover:bg-white/10 transition-colors">
                  <span className="text-[10px] font-black text-blue-300/70 uppercase tracking-widest">{group.title}</span>
                  <svg className={`w-3.5 h-3.5 text-blue-300/50 transition-transform ${expandedGroups[group.title] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </button>
                {expandedGroups[group.title] && (
                  <div className="flex flex-col gap-1 mt-1">
                    {group.pages.map((page) => (
                      <button key={page} onClick={() => handlePageSwitch(page)} className={`text-left px-3 py-2.5 rounded-xl text-xs transition-all duration-200 flex items-center ${activePage === page ? 'bg-white/20 text-white font-bold translate-x-1' : 'text-blue-100/70 hover:bg-white/10 hover:text-white cursor-pointer'}`}>
                        {page}
                        {dirtyStates[page] && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400"></span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="p-4 bg-[#172e6e] flex flex-col gap-2">
            <button onClick={() => handlePageSwitch('Settings')} className={`w-full py-3 rounded-xl text-[10px] uppercase font-bold cursor-pointer ${activePage === 'Settings' ? 'bg-white text-[#1E3A8A]' : 'bg-white/10 text-white hover:bg-white/20'}`}>Settings</button>
            <button onClick={handleLogout} className="w-full bg-white/10 text-white hover:bg-red-500 py-3 rounded-xl text-[10px] uppercase font-bold cursor-pointer">Log Out</button>
          </div>
        </aside>

        {/* EDGE-TO-EDGE MAIN CONTENT AREA */}
        <main className="flex-1 h-full overflow-hidden flex flex-col relative bg-zinc-50">
          <div className="flex-1 overflow-y-auto p-8 lg:p-12 custom-scrollbar">
            <div className="max-w-7xl mx-auto w-full">
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

  // ==========================================
  // LOGGED OUT: CLEAN FULL SCREEN LOGIN
  // ==========================================
  return (
    <div className="flex w-screen h-screen bg-zinc-50 items-center justify-center font-['Poppins']">
      <div className="w-full max-w-md bg-white p-10 rounded-2xl shadow-xl border border-zinc-200">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <img src="/jyanipur.png" alt="Jyanipur" className="h-12 w-auto" onError={(e) => { e.target.style.display='none'; }} />
          </div>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Jyanipur</h1>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">Portal Access</p>
        </div>

        {error && <div className="mb-6 p-3 bg-red-50 text-red-600 text-xs rounded-xl font-bold text-center">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]" required />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]" required />
          </div>
          <button type="submit" className="w-full py-3.5 bg-[#1E3A8A] hover:bg-blue-900 text-white font-bold rounded-xl text-sm mt-4 transition-colors cursor-pointer">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}