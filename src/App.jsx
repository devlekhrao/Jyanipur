import React, { useState } from 'react';
import Dashboard from './Dashboard';
import CRM from './CRM'; // Added CRM import
import TaxInvoice from './TaxInvoice';
import Estimation from './Estimation';
import EmployeeAttendance from './EmployeeAttendance';
import Purchases from './Purchases';
import Inventory from './Inventory';
import Tools from './Tools'; // Added Tools import
import RateBook from './RateBook';
import Subcontractors from './Subcontractors';
import EmployeeExpenses from './EmployeeExpenses';
import Salaries from './Salaries';
import Income from './Income';
import GST from './GST';
import Projects from './Projects';
import MeasurementSheet from './MeasurementSheet';

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState('');
  
  // DEFAULT ACTIVE PAGE IS NOW DASHBOARD
  const [activePage, setActivePage] = useState('Dashboard');

  // --- GLOBAL COMPANY & PRINT SETTINGS ---
  const [companySettings, setCompanySettings] = useState({
    companyName: 'Jyanipur Interiors',
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
    signatureUrl: '', // URL or Data URL for digital signature stamp
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

  const inputClass = "w-full px-4 py-3 rounded-xl border-none bg-white/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 text-xs font-medium transition-all shadow-sm";
  const labelClass = "block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1";

  if (isLoggedIn) {
    return (
      <div className="relative h-screen w-full font-['Poppins'] text-zinc-800 selection:bg-amber-100 overflow-hidden flex items-center justify-center p-4 lg:p-6 print:p-0 print:block">
        
        <div className="absolute inset-0 z-0 bg-[url('/background.png')] bg-cover bg-center print:hidden">
          <div className="absolute inset-0 bg-black/20"></div>
        </div>

        <div className="relative z-10 flex w-full h-full max-w-[1600px] bg-white/80 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_30px_80px_rgba(0,0,0,0.3)] border border-white/60 overflow-hidden print:bg-white print:shadow-none print:border-none print:rounded-none">
          
          <aside className="w-[260px] bg-white/40 border-r border-white/60 flex flex-col z-10 flex-shrink-0 print:hidden">
            <div className="pt-10 pb-6 flex flex-col items-center justify-center">
              <div className="bg-white/80 p-3 rounded-2xl shadow-sm mb-3">
                <img src={companySettings.logoUrl} alt="Logo" className="h-8 w-auto object-contain" />
              </div>
              <span className="font-bold text-sm tracking-[0.2em] text-zinc-900 uppercase">Jyanipur</span>
            </div>

            <div className="px-8 py-2">
              <div className="h-px w-full bg-zinc-300/40"></div>
            </div>

            {/* Main Application Modules */}
            <div className="flex-1 overflow-y-auto py-4 px-5 flex flex-col gap-2 custom-scrollbar">
              {[
                'Dashboard',
                'CRM', // Added CRM to the sidebar
                'Projects',
                'Measurement Sheet',
                'Estimation',
                'Tax Invoice',
                'Purchases',
                'Inventory',
                'Tools & Assets', // Added Tools to the sidebar
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
                  className={`text-left px-5 py-3 rounded-xl text-xs transition-all duration-300 flex items-center ${
                    activePage === page 
                      ? 'bg-zinc-900 text-white font-semibold shadow-lg shadow-zinc-900/20 translate-x-1' 
                      : 'text-zinc-600 hover:bg-white/80 hover:text-zinc-900 font-medium'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            {/* Pinned Bottom Actions */}
            <div className="p-5 flex flex-col gap-3 border-t border-zinc-300/40">
              <button
                onClick={() => setActivePage('Settings')}
                className={`w-full py-3 rounded-xl text-[10px] uppercase tracking-widest font-bold transition-all duration-300 cursor-pointer shadow-sm border ${
                  activePage === 'Settings' 
                    ? 'bg-zinc-900 text-white border-zinc-900 shadow-md' 
                    : 'bg-white/50 border-white/60 text-zinc-500 hover:bg-zinc-800 hover:text-white hover:border-zinc-800'
                }`}
              >
                Settings
              </button>
              <button 
                onClick={handleLogout}
                className="w-full bg-white/50 border border-white/60 text-zinc-500 hover:bg-red-500 hover:text-white hover:border-red-500 py-3 rounded-xl text-[10px] uppercase tracking-widest font-bold transition-all duration-300 cursor-pointer shadow-sm"
              >
                Log Out
              </button>
            </div>
          </aside>

          <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10 print:overflow-visible">
            <div className="flex-1 p-8 lg:p-12 overflow-y-auto print:p-0 print:overflow-visible custom-scrollbar">
              <div className="max-w-7xl mx-auto print:max-w-none print:mx-0">
                
                {/* RENDER LOGIC */}
                {activePage === 'Dashboard' ? (
                  <Dashboard setActivePage={setActivePage} />
                ) : activePage === 'CRM' ? (
                  <CRM /> // Added CRM Render Block
                ) : activePage === 'Tax Invoice' ? (
                  <TaxInvoice companySettings={companySettings} />
                ) : activePage === 'Estimation' ? (
                  <Estimation companySettings={companySettings} />
                ) : activePage === 'Purchases' ? (
                  <Purchases />
                ) : activePage === 'Inventory' ? (
                  <Inventory /> 
                ) : activePage === 'Tools & Assets' ? (
                  <Tools /> // Added Tools Render Block
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
                ) : activePage === 'Projects' ? (
                  <Projects />
                ) : activePage === 'Measurement Sheet' ? (
                  <MeasurementSheet />
                ) : activePage === 'Settings' ? (
                  <div className="w-full pb-20">
                    <div className="flex justify-between items-end pb-4 border-b border-zinc-300/50 mb-6">
                      <div>
                        <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Portal & Print Settings</h2>
                        <p className="text-zinc-600 text-xs mt-1 font-medium">Configure company branding, digital signature, and PDF print preferences.</p>
                      </div>
                      <button onClick={() => alert('Settings Saved!')} className="bg-zinc-900 text-white px-6 py-3 rounded-xl text-xs font-semibold shadow-lg hover:-translate-y-0.5 transition-all">
                        Save Preferences
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      
                      {/* Left Side: Profile & Banking */}
                      <div className="space-y-6">
                        <div className="bg-white/60 backdrop-blur-md p-8 rounded-3xl border border-white/60 shadow-xl space-y-4">
                          <h3 className="text-xs font-extrabold text-zinc-900 uppercase tracking-wider border-b border-zinc-200/50 pb-2">Company Profile</h3>
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
                        <div className="bg-white/60 backdrop-blur-md p-8 rounded-3xl border border-white/60 shadow-xl space-y-4">
                          <h3 className="text-xs font-extrabold text-zinc-900 uppercase tracking-wider border-b border-zinc-200/50 pb-2">Authorized Digital Signature / Stamp</h3>
                          
                          <div>
                            <label className={labelClass}>Upload Signature Image (PNG with transparent background recommended)</label>
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={handleSignatureUpload} 
                              className="w-full text-xs text-zinc-600 file:mr-4 file:py-2 px-1 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-zinc-900 file:text-white hover:file:bg-black cursor-pointer" 
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
                            <div className="mt-3 p-4 bg-white/50 rounded-2xl border border-zinc-200/60 inline-block">
                              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Signature Preview:</p>
                              <img src={companySettings.signatureUrl} alt="Signature Preview" className="h-14 w-auto object-contain border-b border-zinc-300 pb-1" />
                              <button 
                                onClick={() => setCompanySettings({...companySettings, signatureUrl: ''})}
                                className="text-[9px] text-red-500 font-bold hover:underline mt-2 block"
                              >
                                Remove Signature
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="bg-white/60 backdrop-blur-md p-8 rounded-3xl border border-white/60 shadow-xl space-y-4">
                          <h3 className="text-xs font-extrabold text-zinc-900 uppercase tracking-wider border-b border-zinc-200/50 pb-2">Bank Details (PDF)</h3>
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
                        <div className="bg-white/60 backdrop-blur-md p-8 rounded-3xl border border-white/60 shadow-xl space-y-5">
                          <h3 className="text-xs font-extrabold text-zinc-900 uppercase tracking-wider border-b border-zinc-200/50 pb-2">Print Layout Visibility</h3>
                          
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={companySettings.showBankDetailsOnPdf} onChange={e => setCompanySettings({...companySettings, showBankDetailsOnPdf: e.target.checked})} className="w-5 h-5 rounded text-zinc-900 border-zinc-300 focus:ring-zinc-900" />
                            <div>
                              <span className="text-xs font-bold text-zinc-800 block">Show Bank Details Box</span>
                              <span className="text-[10px] text-zinc-500">Include bank name, account number, and IFSC on printed PDFs</span>
                            </div>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={companySettings.showTermsOnPdf} onChange={e => setCompanySettings({...companySettings, showTermsOnPdf: e.target.checked})} className="w-5 h-5 rounded text-zinc-900 border-zinc-300 focus:ring-zinc-900" />
                            <div>
                              <span className="text-xs font-bold text-zinc-800 block">Show Terms & Conditions</span>
                              <span className="text-[10px] text-zinc-500">Display payment schedules and terms on printed PDFs</span>
                            </div>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={companySettings.showRemarksOnPdf} onChange={e => setCompanySettings({...companySettings, showRemarksOnPdf: e.target.checked})} className="w-5 h-5 rounded text-zinc-900 border-zinc-300 focus:ring-zinc-900" />
                            <div>
                              <span className="text-xs font-bold text-zinc-800 block">Show Remarks Section</span>
                              <span className="text-[10px] text-zinc-500">Include project specific notes on printed PDFs</span>
                            </div>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={companySettings.showSignatoryOnPdf} onChange={e => setCompanySettings({...companySettings, showSignatoryOnPdf: e.target.checked})} className="w-5 h-5 rounded text-zinc-900 border-zinc-300 focus:ring-zinc-900" />
                            <div>
                              <span className="text-xs font-bold text-zinc-800 block">Show Authorized Signatory Block</span>
                              <span className="text-[10px] text-zinc-500">Include signature block at the bottom right of PDFs</span>
                            </div>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={companySettings.showSignatureImage} onChange={e => setCompanySettings({...companySettings, showSignatureImage: e.target.checked})} className="w-5 h-5 rounded text-zinc-900 border-zinc-300 focus:ring-zinc-900" />
                            <div>
                              <span className="text-xs font-bold text-zinc-800 block">Render Signature Image on PDF</span>
                              <span className="text-[10px] text-zinc-500">Print the uploaded signature image above the Authorized Signatory text</span>
                            </div>
                          </label>
                        </div>

                        <div className="bg-white/60 backdrop-blur-md p-8 rounded-3xl border border-white/60 shadow-xl space-y-4">
                          <h3 className="text-xs font-extrabold text-zinc-900 uppercase tracking-wider border-b border-zinc-200/50 pb-2">PDF Footer Note</h3>
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
                    <div className="bg-white/40 backdrop-blur-xl p-10 rounded-[2rem] border border-white/60 shadow-lg max-w-sm w-full">
                      <h2 className="text-xl font-extrabold text-zinc-900 mb-2">{activePage}</h2>
                      <p className="text-zinc-600 text-xs font-medium">This module is currently being constructed.</p>
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[url('/background.png')] bg-cover bg-center px-4 font-['Poppins'] relative overflow-hidden">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>

      <div className="max-w-md w-full bg-white/85 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_40px_80px_rgba(0,0,0,0.3)] border border-white/60 p-10 relative z-10">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="bg-white p-4 rounded-3xl mb-5 shadow-sm border border-white/50">
            <img src="/jyanipur.png" alt="Jyanipur Logo" className="h-12 w-auto object-contain" />
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