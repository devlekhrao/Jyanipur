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
  
  // DEFAULT ACTIVE PAGE IS DASHBOARD
  const [activePage, setActivePage] = useState('Dashboard');

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
    
    // Signature Settings
    signatureUrl: '',
    showSignatureImage: true,

    // PDF Print Options
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
  };

  // Handle signature file upload
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

  const inputClass = "w-full px-4 py-3 rounded-xl border border-white/10 bg-slate-800/60 focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-slate-100 text-xs font-medium transition-all shadow-inner placeholder-slate-500";
  const labelClass = "block text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1";

  if (isLoggedIn) {
    return (
      <div className="fixed inset-0 w-screen h-[100dvh] font-['Poppins'] text-slate-100 selection:bg-[#1E3A8A] selection:text-white overflow-hidden flex items-center justify-center p-4 lg:p-6 print:p-0 print:block overscroll-none bg-slate-950">
        
        {/* Background Image Overlay with Dark Slate Tint */}
        <div className="absolute inset-0 z-0 bg-[url('/background.png')] bg-cover bg-center bg-no-repeat print:hidden opacity-30">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"></div>
        </div>

        {/* FLOATING QUICK DOCK BUTTONS IN INDIGO GLASS */}
        <div className="fixed right-3 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3 print:hidden hidden xl:flex">
          {[
            { name: 'Document Vault', icon: '📁', label: 'Vault' },
            { name: 'Project Control', icon: '⚖️', label: 'Control' },
            { name: 'Site Snags', icon: '⚠️', label: 'Snags' },
            { name: 'Measurement Sheet', icon: '📐', label: 'Calc' }
          ].map((item) => (
            <button 
              key={item.name}
              onClick={() => setActivePage(item.name)}
              className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-xs shadow-2xl backdrop-blur-2xl border transition-all hover:scale-105 cursor-pointer ${
                activePage === item.name 
                  ? 'bg-[#1E3A8A] text-white border-blue-400/40 shadow-[#1E3A8A]/50' 
                  : 'bg-slate-900/60 text-slate-300 border-white/10 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              <span className="tracking-wider uppercase text-[10px] font-mono">{item.label}</span>
            </button>
          ))}
        </div>

        {/* MAIN INDIGO-GREY GLASS CANVAS */}
        <div className="relative z-10 flex w-full h-full max-w-[1600px] bg-slate-900/70 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_30px_90px_rgba(0,0,0,0.6)] border border-white/10 overflow-hidden print:bg-white print:shadow-none print:border-none print:rounded-none">
          
          {/* SIDEBAR NAVIGATION */}
          <aside className="w-[250px] bg-slate-950/60 backdrop-blur-xl border-r border-white/10 flex flex-col z-10 flex-shrink-0 print:hidden">
            
            <div className="pt-8 pb-4 flex items-center justify-center gap-3">
              <div className="bg-white/90 p-2 rounded-xl shadow-sm">
                <img src={companySettings.logoUrl} alt="Logo" className="h-6 w-auto object-contain" onError={(e) => { e.target.style.display='none'; }} />
              </div>
              <div>
                <span className="font-extrabold text-sm tracking-[0.2em] text-white block uppercase">Jyanipur</span>
                <span className="text-[8px] font-mono tracking-widest text-[#1E3A8A] uppercase block -mt-1 font-bold">ERP Portal</span>
              </div>
            </div>

            <div className="px-6 py-1">
              <div className="h-px w-full bg-white/10"></div>
            </div>

            <div className="flex-1 overflow-y-auto py-3 px-4 flex flex-col gap-1.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {[
                'Dashboard',
                'CRM',
                'Projects',
                'Task Board',
                'Project Control',
                'Site Snags',
                'Document Vault',    
                'Project P&L',      
                'Daily Report',     
                'Petty Cash',       
                'Measurement Sheet',
                'Estimation',
                'Tax Invoice',
                'Purchases',
                'Vendor Ledger',
                'Inventory',
                'Tools & Assets',
                'Rate Book', 
                'Subcontractors',
                'Employee Attendance',
                'Staff Expenses',     
                'Salaries',
                'Income',
                'GST Filing'
              ].map((page) => (
                <button
                  key={page}
                  onClick={() => setActivePage(page)}
                  className={`text-left px-4 py-2.5 rounded-xl text-xs transition-all duration-300 flex items-center ${
                    activePage === page 
                      ? 'bg-[#1E3A8A] text-white font-semibold shadow-lg shadow-[#1E3A8A]/30 border border-blue-400/30 translate-x-1' 
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100 font-medium'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <div className="p-4 flex flex-col gap-2 border-t border-white/10 bg-slate-950/80">
              <button
                onClick={() => setActivePage('Settings')}
                className={`w-full py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-mono font-bold transition-all duration-300 cursor-pointer border ${
                  activePage === 'Settings' 
                    ? 'bg-[#1E3A8A] text-white border-blue-400/40 shadow-md' 
                    : 'bg-slate-900/60 border-white/10 text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                Settings
              </button>
              <button 
                onClick={handleLogout}
                className="w-full bg-slate-900/60 border border-white/10 text-slate-400 hover:bg-red-600 hover:text-white hover:border-red-500 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-mono font-bold transition-all duration-300 cursor-pointer"
              >
                Log Out
              </button>
            </div>
          </aside>

          {/* MAIN CONTENT AREA */}
          <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10 print:overflow-visible">
            <div className="flex-1 p-8 lg:p-12 overflow-y-auto print:p-0 print:overflow-visible custom-scrollbar">
              <div className="max-w-7xl mx-auto print:max-w-none print:mx-0">
                
                {/* RENDER MODULES */}
                {activePage === 'Dashboard' ? (
                  <Dashboard setActivePage={setActivePage} />
                ) : activePage === 'CRM' ? (
                  <CRM />
                ) : activePage === 'Projects' ? (
                  <Projects />
                ) : activePage === 'Task Board' ? ( 
                  <TaskBoard />
                ) : activePage === 'Project Control' ? (
                  <ProjectControl />
                ) : activePage === 'Site Snags' ? (
                  <SiteSnag companySettings={companySettings} />
                ) : activePage === 'Document Vault' ? ( 
                  <DocumentVault />
                ) : activePage === 'Project P&L' ? ( 
                  <ProjectPnL />
                ) : activePage === 'Daily Report' ? (  
                  <SiteManager />
                ) : activePage === 'Petty Cash' ? ( 
                  <PettyCash />
                ) : activePage === 'Measurement Sheet' ? (
                  <MeasurementSheet />
                ) : activePage === 'Tax Invoice' ? (
                  <TaxInvoice companySettings={companySettings} />
                ) : activePage === 'Estimation' ? (
                  <Estimation companySettings={companySettings} />
                ) : activePage === 'Purchases' ? (
                  <Purchases />
                ) : activePage === 'Vendor Ledger' ? (
                  <VendorLedger />
                ) : activePage === 'Inventory' ? (
                  <Inventory /> 
                ) : activePage === 'Tools & Assets' ? (
                  <Tools />
                ) : activePage === 'Rate Book' ? (
                  <RateBook />
                ) : activePage === 'Subcontractors' ? (
                  <Subcontractors />
                ) : activePage === 'Employee Attendance' ? (
                  <EmployeeAttendance companySettings={companySettings} />
                ) : activePage === 'Staff Expenses' ? (
                  <EmployeeExpenses />
                ) : activePage === 'Salaries' ? (
                  <Salaries />
                ) : activePage === 'Income' ? (
                  <Income />
                ) : activePage === 'GST Filing' ? ( 
                  <GST />
                ) : activePage === 'Settings' ? (
                  <div className="w-full pb-20">
                    <div className="flex justify-between items-end pb-4 border-b border-white/10 mb-6">
                      <div>
                        <h2 className="text-2xl font-extrabold text-white tracking-tight">Portal & Print Settings</h2>
                        <p className="text-slate-400 text-xs mt-1 font-medium">Configure company branding, digital signature, and PDF print preferences.</p>
                      </div>
                      <button onClick={() => alert('Settings Saved!')} className="bg-[#1E3A8A] hover:bg-blue-900 text-white px-6 py-3 rounded-xl text-xs font-semibold shadow-lg shadow-[#1E3A8A]/30 border border-blue-400/30 hover:-translate-y-0.5 transition-all cursor-pointer">
                        Save Preferences
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      
                      {/* Left Side: Profile & Banking */}
                      <div className="space-y-6">
                        <div className="bg-slate-900/60 backdrop-blur-md p-8 rounded-3xl border border-white/10 shadow-xl space-y-4">
                          <h3 className="text-xs font-mono font-extrabold text-white uppercase tracking-wider border-b border-white/10 pb-2">Company Profile</h3>
                          <div>
                            <label className={labelClass}>Company Name</label>
                            <input type="text" value={companySettings.companyName} onChange={e => setCompanySettings({...companySettings, companyName: e.target.value})} className={inputClass} />
                          </div>
                          <div>
                            <label className={labelClass}>Company GSTIN</label>
                            <input type="text" value={companySettings.companyGst} onChange={e => setCompanySettings({...companySettings, companyGst: e.target.value})} className={inputClass} />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className={labelClass}>Email Address</label>
                              <input type="text" value={companySettings.companyEmail} onChange={e => setCompanySettings({...companySettings, companyEmail: e.target.value})} className={inputClass} />
                            </div>
                            <div>
                              <label className={labelClass}>Phone Number</label>
                              <input type="text" value={companySettings.companyPhone} onChange={e => setCompanySettings({...companySettings, companyPhone: e.target.value})} className={inputClass} />
                            </div>
                          </div>
                          <div>
                            <label className={labelClass}>Company Address</label>
                            <textarea value={companySettings.companyAddress} onChange={e => setCompanySettings({...companySettings, companyAddress: e.target.value})} className={`${inputClass} h-20 resize-none`}></textarea>
                          </div>
                          <div>
                            <label className={labelClass}>Logo Path / URL</label>
                            <input type="text" value={companySettings.logoUrl} onChange={e => setCompanySettings({...companySettings, logoUrl: e.target.value})} className={inputClass} />
                          </div>
                        </div>

                        {/* DIGITAL SIGNATURE UPLOAD BLOCK */}
                        <div className="bg-slate-900/60 backdrop-blur-md p-8 rounded-3xl border border-white/10 shadow-xl space-y-4">
                          <h3 className="text-xs font-mono font-extrabold text-white uppercase tracking-wider border-b border-white/10 pb-2">Authorized Digital Signature / Stamp</h3>
                          
                          <div>
                            <label className={labelClass}>Upload Signature Image (PNG recommended)</label>
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={handleSignatureUpload} 
                              className="w-full text-xs text-slate-300 file:mr-4 file:py-2 px-1 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#1E3A8A] file:text-white hover:file:bg-blue-900 cursor-pointer" 
                            />
                          </div>

                          <div>
                            <label className={labelClass}>Or Paste Signature Image URL / Base64</label>
                            <input 
                              type="text" 
                              placeholder="https://example.com/signature.png" 
                              value={companySettings.signatureUrl} 
                              onChange={e => setCompanySettings({...companySettings, signatureUrl: e.target.value})} 
                              className={inputClass} 
                            />
                          </div>

                          {companySettings.signatureUrl && (
                            <div className="mt-3 p-4 bg-slate-800/80 rounded-2xl border border-white/10 inline-block">
                              <p className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">Signature Preview:</p>
                              <img src={companySettings.signatureUrl} alt="Signature Preview" className="h-14 w-auto object-contain border-b border-slate-700 pb-1 bg-white/10 p-1 rounded" />
                              <button 
                                onClick={() => setCompanySettings({...companySettings, signatureUrl: ''})}
                                className="text-[9px] text-red-400 font-bold hover:underline mt-2 block cursor-pointer"
                              >
                                Remove Signature
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="bg-slate-900/60 backdrop-blur-md p-8 rounded-3xl border border-white/10 shadow-xl space-y-4">
                          <h3 className="text-xs font-mono font-extrabold text-white uppercase tracking-wider border-b border-white/10 pb-2">Bank Details (PDF)</h3>
                          <div>
                            <label className={labelClass}>Bank Name</label>
                            <input type="text" value={companySettings.bankName} onChange={e => setCompanySettings({...companySettings, bankName: e.target.value})} className={inputClass} />
                          </div>
                          <div>
                            <label className={labelClass}>Account Name</label>
                            <input type="text" value={companySettings.accountName} onChange={e => setCompanySettings({...companySettings, accountName: e.target.value})} className={inputClass} />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className={labelClass}>Account Number</label>
                              <input type="text" value={companySettings.accountNo} onChange={e => setCompanySettings({...companySettings, accountNo: e.target.value})} className={inputClass} />
                            </div>
                            <div>
                              <label className={labelClass}>IFSC Code</label>
                              <input type="text" value={companySettings.ifscCode} onChange={e => setCompanySettings({...companySettings, ifscCode: e.target.value})} className={inputClass} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Side: PDF Structure Controls */}
                      <div className="space-y-6">
                        <div className="bg-slate-900/60 backdrop-blur-md p-8 rounded-3xl border border-white/10 shadow-xl space-y-5">
                          <h3 className="text-xs font-mono font-extrabold text-white uppercase tracking-wider border-b border-white/10 pb-2">Print Layout Visibility</h3>
                          
                          {[
                            { key: 'showBankDetailsOnPdf', label: 'Show Bank Details Box', desc: 'Include bank name, account number, and IFSC on printed PDFs' },
                            { key: 'showTermsOnPdf', label: 'Show Terms & Conditions', desc: 'Display payment schedules and terms on printed PDFs' },
                            { key: 'showRemarksOnPdf', label: 'Show Remarks Section', desc: 'Include project specific notes on printed PDFs' },
                            { key: 'showSignatoryOnPdf', label: 'Show Authorized Signatory Block', desc: 'Include signature block at the bottom right of PDFs' },
                            { key: 'showSignatureImage', label: 'Render Signature Image on PDF', desc: 'Print the uploaded signature image above the Authorized Signatory text' }
                          ].map(item => (
                            <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={companySettings[item.key]} 
                                onChange={e => setCompanySettings({...companySettings, [item.key]: e.target.checked})} 
                                className="w-5 h-5 rounded text-[#1E3A8A] bg-slate-800 border-slate-700 focus:ring-[#1E3A8A]" 
                              />
                              <div>
                                <span className="text-xs font-bold text-slate-200 block">{item.label}</span>
                                <span className="text-[10px] text-slate-400">{item.desc}</span>
                              </div>
                            </label>
                          ))}
                        </div>

                        <div className="bg-slate-900/60 backdrop-blur-md p-8 rounded-3xl border border-white/10 shadow-xl space-y-4">
                          <h3 className="text-xs font-mono font-extrabold text-white uppercase tracking-wider border-b border-white/10 pb-2">PDF Footer Note</h3>
                          <div>
                            <label className={labelClass}>Disclaimer / Note</label>
                            <textarea value={companySettings.pdfFooterDisclaimer} onChange={e => setCompanySettings({...companySettings, pdfFooterDisclaimer: e.target.value})} className={`${inputClass} h-20 resize-none text-[11px]`}></textarea>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                ) : (
                  <div className="h-[60vh] flex flex-col items-center justify-center text-center print:hidden">
                    <div className="bg-slate-900/60 backdrop-blur-xl p-10 rounded-[2rem] border border-white/10 shadow-lg max-w-sm w-full">
                      <h2 className="text-xl font-extrabold text-white mb-2">{activePage}</h2>
                      <p className="text-slate-400 text-xs font-medium">This module is currently being constructed.</p>
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

  /* LOGIN PAGE - INDIGO & GREY GLASS */
  return (
    <div className="fixed inset-0 w-screen h-[100dvh] flex items-center justify-center bg-[url('/background.png')] bg-cover bg-center bg-no-repeat px-4 font-['Poppins'] overflow-hidden overscroll-none bg-slate-950">
      <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md"></div>

      <div className="max-w-md w-full bg-slate-900/80 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.8)] border border-white/10 p-10 relative z-10">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="bg-white/90 p-4 rounded-3xl mb-5 shadow-lg border border-white/20">
            <img src="/jyanipur.png" alt="Jyanipur Logo" className="h-12 w-auto object-contain" onError={(e) => { e.target.style.display='none'; }} />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Jyanipur</h1>
          <p className="text-slate-400 text-xs uppercase font-mono tracking-widest mt-2 font-bold">ERP Portal Access</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/40 text-red-300 text-xs rounded-2xl border border-red-500/40 text-center font-bold tracking-wide">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Work Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-5 py-4 rounded-2xl border border-white/10 bg-slate-800/80 focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-white text-sm font-medium transition-all shadow-inner" required />
          </div>
          <div>
            <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Passkey</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-5 py-4 rounded-2xl border border-white/10 bg-slate-800/80 focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-white text-sm font-medium transition-all shadow-inner" required />
          </div>
          <button type="submit" className="w-full py-4 bg-[#1E3A8A] hover:bg-blue-900 text-white font-bold rounded-2xl transition-all mt-6 cursor-pointer text-sm shadow-[0_10px_25px_rgba(30,58,138,0.4)] hover:shadow-[0_15px_30px_rgba(30,58,138,0.6)] hover:-translate-y-0.5 tracking-wide border border-blue-400/30">
            Enter ERP Portal
          </button>
        </form>
      </div>
    </div>
  );
}