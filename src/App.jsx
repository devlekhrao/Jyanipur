import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { motion, AnimatePresence } from 'framer-motion';

// Import Layout Shells
import DesktopLayout from './desktop/DesktopLayout';
import MobileLayout from './mobile/MobileLayout';

// Import Separate Admin Console
import AdminConsole from './AdminConsole';

export default function App() {
  // Main Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  
  // Admin Console & Protection State
  const [isAdminConsoleOpen, setIsAdminConsoleOpen] = useState(false);
  const [showAdminPrompt, setShowAdminPrompt] = useState(false);
  const [adminPasskey, setAdminPasskey] = useState('');
  const [adminError, setAdminError] = useState('');

  const teakTintFilter = 'brightness(0) saturate(100%) invert(36%) sepia(61%) saturate(2251%) hue-rotate(5deg) brightness(95%) contrast(92%)';

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('jyanipur_auth') === 'true';
  });

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

  useEffect(() => {
    localStorage.setItem('jyanipur_companySettings', JSON.stringify(companySettings));
  }, [companySettings]);

  useEffect(() => {
    const checkPlatform = () => {
      let isNative = false;
      try {
        isNative = Capacitor?.isNativePlatform?.() || false;
      } catch (e) {}

      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isSmallScreen = window.innerWidth < 850;

      setIsMobile(isNative || isMobileUA || isSmallScreen);
    };

    checkPlatform();
    window.addEventListener('resize', checkPlatform);
    return () => window.removeEventListener('resize', checkPlatform);
  }, []);

  // --- Main Employee Login ---
  const handleLogin = (e) => {
    e.preventDefault();
    if (email.trim() === 'accounts@jyanipur.in' && password === '@llIneedis1.978') {
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
    setError('');
    localStorage.removeItem('jyanipur_auth');
  };

  // --- Admin Console Protection ---
  const handleAdminAccess = (e) => {
    e.preventDefault();
    // Updated to the exact requested passkey
    if (adminPasskey === '@llIneedis1.978') {
      setAdminError('');
      setAdminPasskey('');
      setShowAdminPrompt(false);
      setIsAdminConsoleOpen(true);
    } else {
      setAdminError('Unauthorized. Invalid master passkey.');
    }
  };

  // LOGGED IN: ROUTE TO DESKTOP / MOBILE LAYOUT
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

  // LOGGED OUT: LOGIN SCREEN
  return (
    <div className="fixed inset-0 w-screen h-[100dvh] flex items-center justify-center bg-[url('/background.png')] bg-cover bg-center bg-no-repeat px-4 font-['Poppins'] overflow-hidden overscroll-none bg-zinc-900">
      
      <div className="absolute inset-0 bg-[#B45309]/30 mix-blend-multiply"></div>
      <div className="absolute inset-0 bg-black/40"></div>

      {/* TOP RIGHT ADMIN BUTTON (STEALTH MODE - BIG LOGO ONLY) */}
      <button 
        onClick={() => setShowAdminPrompt(true)}
        className="absolute top-6 right-6 lg:top-8 lg:right-8 z-20 hover:scale-110 transition-transform cursor-pointer drop-shadow-md opacity-90 hover:opacity-100"
      >
        <img 
          src="/jyanipur.png" 
          alt="Jyanipur" 
          className="h-10 lg:h-12 w-auto object-contain" 
          style={{ filter: teakTintFilter }} 
        />
      </button>

      {/* ADMIN PASSWORD PROMPT MODAL */}
      <AnimatePresence>
        {showAdminPrompt && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="max-w-sm w-full bg-white/95 backdrop-blur-3xl rounded-[2rem] p-8 shadow-2xl border border-white/40 relative"
            >
              <button 
                onClick={() => { setShowAdminPrompt(false); setAdminError(''); setAdminPasskey(''); }}
                className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-800 text-xs font-bold p-2"
              >
                ✕
              </button>
              
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-[#B45309]/10 flex items-center justify-center mb-4">
                  <img src="/jyanipur.png" alt="Lock" className="h-5 w-auto" style={{ filter: teakTintFilter }} />
                </div>
                <h3 className="text-lg font-bold text-zinc-800">Admin Authorization</h3>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1 font-bold">Restricted Access Zone</p>
              </div>

              {adminError && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 text-[11px] rounded-xl border border-red-200 text-center font-bold tracking-wide">
                  {adminError}
                </div>
              )}

              <form onSubmit={handleAdminAccess}>
                <div className="mb-6">
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Master Passkey</label>
                  <input 
                    type="password" 
                    value={adminPasskey} 
                    onChange={(e) => setAdminPasskey(e.target.value)} 
                    placeholder="Enter admin passkey"
                    className="w-full px-5 py-3.5 rounded-2xl border border-zinc-200 bg-zinc-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B45309] text-zinc-900 text-sm font-medium transition-all shadow-inner" 
                    autoFocus
                    required 
                  />
                </div>
                <button type="submit" className="w-full py-3.5 bg-[#B45309] hover:bg-[#92400E] text-white font-bold rounded-2xl transition-all cursor-pointer text-sm shadow-[0_10px_20px_rgba(180,83,9,0.2)]">
                  Verify & Open Console
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SEPARATE FULL-SCREEN ADMIN CONSOLE COMPONENT */}
      <AdminConsole isOpen={isAdminConsoleOpen} onClose={() => setIsAdminConsoleOpen(false)} />

      {/* MAIN EMPLOYEE LOGIN CARD */}
      <div className="max-w-md w-full bg-white/95 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_40px_80px_rgba(0,0,0,0.5)] border border-white/40 p-10 relative z-10">
        
        <div className="mb-10 flex flex-col items-center text-center">
          <img 
            src="/jyanipur.png" 
            alt="Jyanipur Symbol" 
            className="h-24 w-auto object-contain drop-shadow-sm" 
            style={{ filter: teakTintFilter }} 
            onError={(e) => { e.target.style.display='none'; }} 
          />
          <p className="text-zinc-500 text-xs uppercase tracking-widest mt-4 font-bold">Portal Access</p>
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

          <button type="submit" className="w-full py-4 bg-[#B45309] hover:bg-[#92400E] text-white font-bold rounded-2xl transition-all cursor-pointer text-sm shadow-[0_10px_20px_rgba(180,83,9,0.2)] hover:shadow-[0_15px_25px_rgba(180,83,9,0.3)] hover:-translate-y-1 tracking-wide">
            Enter Portal
          </button>
        </form>

      </div>
    </div>
  );
}