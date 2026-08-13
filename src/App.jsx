import React, { useState } from 'react';
import Dashboard from './Dashboard';
import CRM from './CRM';
import TaxInvoice from './TaxInvoice';
import Estimation from './Estimation';
import EmployeeAttendance from './EmployeeAttendance';
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

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState('');
  
  // NAVIGATION & STAGING STATE
  const [activePage, setActivePage] = useState('Dashboard');
  const [visitedPages, setVisitedPages] = useState(new Set(['Dashboard']));

  // --- DIRTY STATE WARNING SYSTEM ---
  const [dirtyStates, setDirtyStates] = useState({});
  const [pendingPage, setPendingPage] = useState(null);
  const [showWarningModal, setShowWarningModal] = useState(false);

  // Called by child components to let App know they have unsaved form data
  const updateDirtyState = (pageName, isDirty) => {
    setDirtyStates(prev => ({ ...prev, [pageName]: isDirty }));
  };

  // Intercept Navigation
  const handlePageSwitch = (pageName) => {
    if (activePage === pageName) return;
    
    // If the CURRENT page is marked as dirty, stop and warn
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
    // Acknowledges the local storage draft, keeps the component mounted, and navigates
    setShowWarningModal(false);
    commitPageSwitch(pendingPage);
  };

  const handleDiscard = () => {
    // 1. Wipe out local storage drafts for specific pages (e.g., TaxInvoice)
    if (activePage === 'TaxInvoice') {
      localStorage.removeItem('draft_invoiceDetails');
      localStorage.removeItem('draft_items');
      localStorage.removeItem('draft_taxMode');
      localStorage.removeItem('draft_editingId');
      localStorage.removeItem('draft_invoiceView');
    }

    // 2. Unmount the component completely so it renders fresh next time
    setVisitedPages(prev => {
      const newSet = new Set(prev);
      newSet.delete(activePage);
      return newSet;
    });

    // 3. Clear dirty state and navigate
    setDirtyStates(prev => ({ ...prev, [activePage]: false }));
    setShowWarningModal(false);
    commitPageSwitch(pendingPage);
  };

  // --- GLOBAL COMPANY & PRINT SETTINGS ---
  const [companySettings, setCompanySettings] = useState({
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
    pdfFooterDisclaimer: 'Thank you for choosing Jyanipur Interiors. For any query, contact accounts@jyanipur.in'
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

  const handleSignatureUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanySettings(prev => ({ ...prev, signatureUrl: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl border-none bg-white/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-zinc-900 text-xs font-medium transition-all shadow-sm";
  const labelClass = "block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1";

  // --- LOGICAL SIDEBAR CATEGORIZATION ---
  const navigationGroups = [
    {
      title: "Workspace",
      pages: ['Dashboard', 'CRM', 'Projects', 'Task Board', 'Document Vault']
    },
    {
      title: "Site Execution",
      pages: ['Project Control', 'Daily Report', 'Site Snags', 'Measurement Sheet']
    },
    {
      title: "Finance & Sales",
      pages: ['Estimation', 'Tax Invoice', 'Project P&L', 'Income', 'Petty Cash', 'GST Filing']
    },
    {
      title: "Supply Chain",
      pages: ['Purchases', 'Vendor Ledger', 'Inventory', 'Rate Book', 'Tools & Assets', 'Subcontractors']
    },
    {
      title: "Team & HR",
      pages: ['Employee Attendance', 'Staff Expenses', 'Salaries']
    }
  ];

  if (isLoggedIn) {
    return (
      <div className="fixed inset-0 w-screen h-[100dvh] font-['Poppins'] text-zinc-800 selection:bg-blue-100 overflow-hidden flex items-center justify-center p-4 lg:p-6 print:p-0 print:block overscroll-none bg-zinc-900">
        
        {/* --- GLOBAL WARNING MODAL --- */}
        {showWarningModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-md px-4">
            <div className="bg-slate-900 border border-white/10 p-8 rounded-[2rem] shadow-2xl max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mb-5 border border-amber-500/30">
                <span className="text-xl">⚠️</span>
              </div>
              <h3 className="text-xl font-extrabold text-white tracking-tight mb-2">Unsaved Progress</h3>
              <p className="text-slate-400 text-[11px] leading-relaxed mb-8">
                You have unsaved changes in <strong className="text-white">{activePage}</strong>. What would you like to do before navigating away?
              </p>
              
              <div className="flex flex-col gap-3">
                <button onClick={handleSaveDraft} className="w-full bg-[#1E3A8A] hover:bg-blue-900 text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-widest transition-all border border-blue-400/30 shadow-lg cursor-pointer">
                  Save Draft & Switch
                </button>
                <button onClick={handleDiscard} className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold py-3.5 rounded-xl text-xs uppercase tracking-widest transition-all border border-red-500/30 cursor-pointer">
                  Discard Changes
                </button>
                <button onClick={() => setShowWarningModal(false)} className="w-full bg-transparent hover:bg-white/5 text-slate-300 font-bold py-3.5 rounded-xl text-xs uppercase tracking-widest transition-all border border-white/10 mt-2 cursor-pointer">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="absolute inset-0 z-0 bg-[url('/background.png')] bg-cover bg-center bg-no-repeat print:hidden">
          <div className="absolute inset-0 bg-black/30"></div>
        </div>

        <div className="fixed right-3 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3 print:hidden hidden xl:flex">
          {[
            { name: 'Document Vault', icon: '📁', label: 'Vault' },
            { name: 'Project Control', icon: '⚖️', label: 'Control' },
            { name: 'Site Snags', icon: '⚠️', label: 'Snags' },
            { name: 'Measurement Sheet', icon: '📐', label: 'Calc' }
          ].map((item) => (
            <button 
              key={item.name}
              onClick={() => handlePageSwitch(item.name)}
              className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-xs shadow-2xl backdrop-blur-2xl border transition-all hover:scale-105 cursor-pointer ${
                activePage === item.name 
                  ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-blue-900/50' 
                  : 'bg-white/70 text-zinc-800 border-white/80 hover:bg-white'
              }`}
            >
              <span>{item.icon}</span>
              <span className="tracking-wider uppercase text-[10px]">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="relative z-10 flex w-full h-full max-w-[1600px] bg-white/80 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_30px_80px_rgba(0,0,0,0.3)] border border-white/60 overflow-hidden print:bg-white print:shadow-none print:border-none print:rounded-none">
          
          <aside className="w-[250px] bg-[#1E3A8A] text-white border-r border-blue-900/50 flex flex-col z-10 flex-shrink-0 print:hidden shadow-xl">
            <div className="pt-8 pb-4 flex items-center justify-center gap-3">
              <div className="bg-white p-2 rounded-xl shadow-sm">
                <img src={companySettings.logoUrl} alt="Logo" className="h-6 w-auto object-contain" onError={(e) => { e.target.style.display='none'; }} />
              </div>
              <span className="font-bold text-sm tracking-[0.2em] text-white uppercase">Jyanipur</span>
            </div>

            <div className="px-6 py-1">
              <div className="h-px w-full bg-blue-400/20"></div>
            </div>

            {/* CATEGORIZED NAVIGATION MENU */}
            <div className="flex-1 overflow-y-auto py-3 px-3 flex flex-col gap-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {navigationGroups.map((group) => (
                <div key={group.title} className="flex flex-col gap-1">
                  <span className="px-3 text-[9px] font-black text-blue-300/60 uppercase tracking-widest mb-1.5">{group.title}</span>
                  {group.pages.map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageSwitch(page)}
                      className={`text-left px-3 py-2 rounded-xl text-xs transition-all duration-300 flex items-center ${
                        activePage === page 
                          ? 'bg-white/20 text-white font-bold shadow-md shadow-blue-950/40 ring-1 ring-white/30 translate-x-1' 
                          : 'text-blue-100/70 hover:bg-white/10 hover:text-white font-medium cursor-pointer'
                      }`}
                    >
                      {page}
                      {/* Amber indicator dot if the page has unsaved changes */}
                      {dirtyStates[page] && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.8)]"></span>}
                    </button>
                  ))}
                </div>
              ))}
            </div>

            <div className="p-4 flex flex-col gap-2 border-t border-blue-400/20 bg-[#172e6e]">
              <button onClick={() => handlePageSwitch('Settings')} className={`w-full py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-bold transition-all duration-300 cursor-pointer shadow-sm border ${activePage === 'Settings' ? 'bg-white text-[#1E3A8A] border-white shadow-md' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}>
                Settings
              </button>
              <button onClick={handleLogout} className="w-full bg-white/10 border border-white/20 text-white hover:bg-red-500 hover:border-red-500 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-bold transition-all duration-300 cursor-pointer">
                Log Out
              </button>
            </div>
          </aside>

          <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10 print:overflow-visible">
            <div className="flex-1 p-8 lg:p-12 overflow-y-auto print:p-0 print:overflow-visible custom-scrollbar">
              <div className="max-w-7xl mx-auto print:max-w-none print:mx-0">
                
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
                
                {/* INJECT UPDATE DIRTY STATE INTO MODULE */}
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
                    <div className="w-full pb-20">
                      <div className="flex justify-between items-end pb-4 border-b border-zinc-300/50 mb-6">
                        <div>
                          <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Portal & Print Settings</h2>
                          <p className="text-zinc-600 text-xs mt-1 font-medium">Configure company branding, digital signature, and PDF print preferences.</p>
                        </div>
                        <button onClick={() => alert('Settings Saved!')} className="bg-[#1E3A8A] text-white px-6 py-3 rounded-xl text-xs font-semibold shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                          Save Preferences
                        </button>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Settings Profile & Bank */}
                        <div className="space-y-6">
                          <div className="bg-white/60 backdrop-blur-md p-8 rounded-3xl border border-white/60 shadow-xl space-y-4">
                            <h3 className="text-xs font-extrabold text-zinc-900 uppercase tracking-wider border-b border-zinc-200/50 pb-2">Company Profile</h3>
                            <div><label className={labelClass}>Company Name</label><input type="text" value={companySettings.companyName} onChange={e => setCompanySettings({...companySettings, companyName: e.target.value})} className={inputClass} /></div>
                            <div><label className={labelClass}>Company GSTIN</label><input type="text" value={companySettings.companyGst} onChange={e => setCompanySettings({...companySettings, companyGst: e.target.value})} className={inputClass} /></div>
                            <div className="grid grid-cols-2 gap-4">
                              <div><label className={labelClass}>Email Address</label><input type="text" value={companySettings.companyEmail} onChange={e => setCompanySettings({...companySettings, companyEmail: e.target.value})} className={inputClass} /></div>
                              <div><label className={labelClass}>Phone Number</label><input type="text" value={companySettings.companyPhone} onChange={e => setCompanySettings({...companySettings, companyPhone: e.target.value})} className={inputClass} /></div>
                            </div>
                            <div><label className={labelClass}>Company Address</label><textarea value={companySettings.companyAddress} onChange={e => setCompanySettings({...companySettings, companyAddress: e.target.value})} className={`${inputClass} h-20 resize-none`}></textarea></div>
                            <div><label className={labelClass}>Logo Path / URL</label><input type="text" value={companySettings.logoUrl} onChange={e => setCompanySettings({...companySettings, logoUrl: e.target.value})} className={inputClass} /></div>
                          </div>

                          <div className="bg-white/60 backdrop-blur-md p-8 rounded-3xl border border-white/60 shadow-xl space-y-4">
                            <h3 className="text-xs font-extrabold text-zinc-900 uppercase tracking-wider border-b border-zinc-200/50 pb-2">Authorized Digital Signature / Stamp</h3>
                            <div><label className={labelClass}>Upload Signature Image (PNG recommended)</label><input type="file" accept="image/*" onChange={handleSignatureUpload} className="w-full text-xs text-zinc-600 file:mr-4 file:py-2 px-1 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#1E3A8A] file:text-white hover:file:bg-blue-900 cursor-pointer" /></div>
                            <div><label className={labelClass}>Or Paste Signature Image URL / Base64</label><input type="text" placeholder="https://example.com/signature.png" value={companySettings.signatureUrl} onChange={e => setCompanySettings({...companySettings, signatureUrl: e.target.value})} className={inputClass} /></div>
                            {companySettings.signatureUrl && (
                              <div className="mt-3 p-4 bg-white/50 rounded-2xl border border-zinc-200/60 inline-block">
                                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Signature Preview:</p>
                                <img src={companySettings.signatureUrl} alt="Signature Preview" className="h-14 w-auto object-contain border-b border-zinc-300 pb-1" />
                                <button onClick={() => setCompanySettings({...companySettings, signatureUrl: ''})} className="text-[9px] text-red-500 font-bold hover:underline mt-2 block cursor-pointer">Remove Signature</button>
                              </div>
                            )}
                          </div>

                          <div className="bg-white/60 backdrop-blur-md p-8 rounded-3xl border border-white/60 shadow-xl space-y-4">
                            <h3 className="text-xs font-extrabold text-zinc-900 uppercase tracking-wider border-b border-zinc-200/50 pb-2">Bank Details (PDF)</h3>
                            <div><label className={labelClass}>Bank Name</label><input type="text" value={companySettings.bankName} onChange={e => setCompanySettings({...companySettings, bankName: e.target.value})} className={inputClass} /></div>
                            <div><label className={labelClass}>Account Name</label><input type="text" value={companySettings.accountName} onChange={e => setCompanySettings({...companySettings, accountName: e.target.value})} className={inputClass} /></div>
                            <div className="grid grid-cols-2 gap-4">
                              <div><label className={labelClass}>Account Number</label><input type="text" value={companySettings.accountNo} onChange={e => setCompanySettings({...companySettings, accountNo: e.target.value})} className={inputClass} /></div>
                              <div><label className={labelClass}>IFSC Code</label><input type="text" value={companySettings.ifscCode} onChange={e => setCompanySettings({...companySettings, ifscCode: e.target.value})} className={inputClass} /></div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="bg-white/60 backdrop-blur-md p-8 rounded-3xl border border-white/60 shadow-xl space-y-5">
                            <h3 className="text-xs font-extrabold text-zinc-900 uppercase tracking-wider border-b border-zinc-200/50 pb-2">Print Layout Visibility</h3>
                            {[
                              { key: 'showBankDetailsOnPdf', label: 'Show Bank Details Box', desc: 'Include bank name, account number, and IFSC on printed PDFs' },
                              { key: 'showTermsOnPdf', label: 'Show Terms & Conditions', desc: 'Display payment schedules and terms on printed PDFs' },
                              { key: 'showRemarksOnPdf', label: 'Show Remarks Section', desc: 'Include project specific notes on printed PDFs' },
                              { key: 'showSignatoryOnPdf', label: 'Show Authorized Signatory Block', desc: 'Include signature block at the bottom right of PDFs' },
                              { key: 'showSignatureImage', label: 'Render Signature Image on PDF', desc: 'Print the uploaded signature image above the Authorized Signatory text' }
                            ].map(item => (
                              <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" checked={companySettings[item.key]} onChange={e => setCompanySettings({...companySettings, [item.key]: e.target.checked})} className="w-5 h-5 rounded text-[#1E3A8A] border-zinc-300 focus:ring-[#1E3A8A]" />
                                <div><span className="text-xs font-bold text-zinc-800 block">{item.label}</span><span className="text-[10px] text-zinc-500">{item.desc}</span></div>
                              </label>
                            ))}
                          </div>

                          <div className="bg-white/60 backdrop-blur-md p-8 rounded-3xl border border-white/60 shadow-xl space-y-4">
                            <h3 className="text-xs font-extrabold text-zinc-900 uppercase tracking-wider border-b border-zinc-200/50 pb-2">PDF Footer Note</h3>
                            <div><label className={labelClass}>Disclaimer / Note</label><textarea value={companySettings.pdfFooterDisclaimer} onChange={e => setCompanySettings({...companySettings, pdfFooterDisclaimer: e.target.value})} className={`${inputClass} h-20 resize-none text-[11px]`}></textarea></div>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  /* LOGIN PAGE */
  return (
    <div className="fixed inset-0 w-screen h-[100dvh] flex items-center justify-center bg-[url('/background.png')] bg-cover bg-center bg-no-repeat px-4 font-['Poppins'] overflow-hidden overscroll-none bg-zinc-900">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>

      <div className="max-w-md w-full bg-white/85 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_40px_80px_rgba(0,0,0,0.3)] border border-white/60 p-10 relative z-10">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="bg-white p-4 rounded-3xl mb-5 shadow-sm border border-white/50">
            <img src="/jyanipur.png" alt="Jyanipur Logo" className="h-12 w-auto object-contain" onError={(e) => { e.target.style.display='none'; }} />
          </div>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Jyanipur</h1>
          <p className="text-zinc-500 text-xs uppercase tracking-widest mt-2 font-bold">Portal Access</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50/90 text-red-600 text-xs rounded-2xl border border-red-200 text-center font-bold tracking-wide">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Work Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-5 py-4 rounded-2xl border border-white/60 bg-white/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 text-sm font-medium transition-all shadow-inner" required />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Passkey</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-5 py-4 rounded-2xl border border-white/60 bg-white/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 text-sm font-medium transition-all shadow-inner" required />
          </div>
          <button type="submit" className="w-full py-4 bg-zinc-900 hover:bg-black text-white font-bold rounded-2xl transition-all mt-6 cursor-pointer text-sm shadow-[0_10px_20px_rgba(24,24,27,0.2)] hover:shadow-[0_15px_25px_rgba(24,24,27,0.3)] hover:-translate-y-1 tracking-wide">
            Enter Portal
          </button>
        </form>
      </div>
    </div>
  );
}