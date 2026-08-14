import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

// Import Layout Shells
import DesktopLayout from './desktop/DesktopLayout';
import MobileLayout from './mobile/MobileLayout';

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(false);

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
      try { 
        return { ...defaultSettings, ...JSON.parse(saved) }; 
      } catch (e) {
        console.warn("Could not parse saved company settings:", e);
      }
    }
    return defaultSettings;
  });

  // Persist Company Settings when updated
  useEffect(() => {
    localStorage.setItem('jyanipur_companySettings', JSON.stringify(companySettings));
  }, [companySettings]);

  // Detect Platform (Native Mobile App vs Desktop Web)
  useEffect(() => {
    const checkPlatform = () => {
      // 1. Safe Capacitor check (prevents silent crashes)
      let isNative = false;
      try {
        isNative = Capacitor?.isNativePlatform?.() || false;
      } catch (e) {}

      // 2. Strict User Agent Check (Forces mobile layout for "Add to Home Screen" devices on iOS/Android)
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // 3. Standard screen width fallback
      const isSmallScreen = window.innerWidth < 850;

      // If ANY of these are true, trigger the MobileLayout
      setIsMobile(isNative || isMobileUA || isSmallScreen);
    };

    checkPlatform();
    window.addEventListener('resize', checkPlatform);
    return () => window.removeEventListener('resize', checkPlatform);
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (email.trim() === 'accounts@jyanipur.in' && password === '@llIneedis1.978') {
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
    setError('');
  };

  // ==========================================
  // LOGGED IN: ROUTE TO DESKTOP / MOBILE LAYOUT
  // ==========================================
  if (isLoggedIn) {
    return isMobile ? (
      <MobileLayout 
        companySettings={companySettings} 
        setCompanySettings={setCompanySettings} 
        handleLogout={handleLogout} 
      />
    ) : (
      <DesktopLayout 
        companySettings={companySettings} 
        setCompanySettings={setCompanySettings} 
        handleLogout={handleLogout} 
      />
    );
  }

  // ==========================================
  // LOGGED OUT: LOGIN SCREEN
  // ==========================================
  return (
    <div className="fixed inset-0 w-screen h-[100dvh] flex items-center justify-center bg-[url('/background.png')] bg-cover bg-center bg-no-repeat px-4 font-['Poppins'] overflow-hidden overscroll-none bg-zinc-900">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>

      <div className="max-w-md w-full bg-white/90 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_40px_80px_rgba(0,0,0,0.4)] border border-white/40 p-10 relative z-10">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="bg-white p-4 rounded-3xl mb-5 shadow-sm border border-zinc-100">
            <img 
              src="/jyanipur.png" 
              alt="Jyanipur Logo" 
              className="h-12 w-auto object-contain" 
              onError={(e) => { e.target.style.display = 'none'; }} 
            />
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
            <input 
              type="email" 
              value={email} 
              onChange={(e) => { setEmail(e.target.value); if (error) setError(''); }} 
              className="w-full px-5 py-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-zinc-900 text-sm font-medium transition-all shadow-inner" 
              placeholder="accounts@jyanipur.in"
              autoComplete="email"
              required 
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Passkey</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => { setPassword(e.target.value); if (error) setError(''); }} 
              className="w-full px-5 py-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-zinc-900 text-sm font-medium transition-all shadow-inner" 
              placeholder="••••••••••••"
              autoComplete="current-password"
              required 
            />
          </div>

          <button 
            type="submit" 
            className="w-full py-4 bg-[#1E3A8A] hover:bg-blue-900 text-white font-bold rounded-2xl transition-all mt-6 cursor-pointer text-sm shadow-[0_10px_20px_rgba(30,58,138,0.2)] hover:shadow-[0_15px_25px_rgba(30,58,138,0.3)] hover:-translate-y-1 tracking-wide active:scale-95"
          >
            Enter Portal
          </button>
        </form>
      </div>
    </div>
  );
}