import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Import All Mobile View Modules
import MobileDashboard from './MobileDashboard';
import MobileCRM from './MobileCRM';
import MobileProjects from './MobileProjects';
import MobileTaxInvoice from './MobileTaxInvoice';
import MobileEstimation from './MobileEstimation';
import MobilePurchaseOrders from './MobilePurchaseOrders';
import MobilePurchases from './MobilePurchases';
import MobileSiteManager from './MobileSiteManager';
import MobileSiteSnag from './MobileSiteSnag';
import MobileSubcontractors from './MobileSubcontractors';
import MobileMeasurementSheet from './MobileMeasurementSheet';
import MobileInventory from './MobileInventory';
import MobileRateBook from './MobileRateBook';
import MobilePettyCash from './MobilePettyCash';
import MobileIncome from './MobileIncome';
import MobileSalaries from './MobileSalaries';
import MobileEmployeeAttendance from './MobileEmployeeAttendance';
import MobileEmployeeExpenses from './MobileEmployeeExpenses';
import MobileTools from './MobileTools';
import MobileTaskBoard from './MobileTaskBoard';
import MobileVendorLedger from './MobileVendorLedger';
import MobileGST from './MobileGST';
import MobileProjectPnL from './MobileProjectPnL';
import MobileProjectControl from './MobileProjectControl';
import MobileDocumentVault from './MobileDocumentVault';
import MobileSettings from './MobileSettings';

export default function MobileLayout({ 
  companySettings, 
  setCompanySettings, 
  handleLogout, 
  updateDirtyState 
}) {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Quick-access bottom bar items
  const mainTabs = [
    { id: 'Dashboard', label: 'Home', icon: '📊' },
    { id: 'Tax Invoice', label: 'Invoices', icon: '🧾' },
    { id: 'Projects', label: 'Projects', icon: '🏗️' },
    { id: 'Site Operations', label: 'Site', icon: '👷' },
    { id: 'Menu', label: 'All Apps', icon: '☰' },
  ];

  // Full module list for the slide-up menu drawer
  const allApps = [
    { id: 'Dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'CRM Leads', label: 'CRM & Leads', icon: '📇' },
    { id: 'Projects', label: 'Projects & Jobs', icon: '🏗️' },
    { id: 'Estimation', label: 'BOQ Estimations', icon: '📐' },
    { id: 'Tax Invoice', label: 'Tax Invoices', icon: '🧾' },
    { id: 'Purchase Orders', label: 'Purchase Orders', icon: '🛍️' },
    { id: 'Purchases', label: 'Inward Purchases', icon: '📦' },
    { id: 'Site Operations', label: 'Site Operations', icon: '👷' },
    { id: 'Site Snag', label: 'Quality Snags', icon: '🛠️' },
    { id: 'Subcontractors', label: 'Subcontractors', icon: '👷‍♂️' },
    { id: 'Measurement Sheet', label: 'Measurement Sheets', icon: '📏' },
    { id: 'Inventory', label: 'Godown Inventory', icon: '🏬' },
    { id: 'Rate Book', label: 'Material RateBook', icon: '🏷️' },
    { id: 'Petty Cash', label: 'Site Petty Cash', icon: '👛' },
    { id: 'Income', label: 'Client Income', icon: '💰' },
    { id: 'Salaries', label: 'Payroll & Salaries', icon: '💼' },
    { id: 'Employee Attendance', label: 'Staff Attendance', icon: '📅' },
    { id: 'Employee Expenses', label: 'Staff Expenses', icon: '💳' },
    { id: 'Tools', label: 'Tools & Assets', icon: '🧰' },
    { id: 'Task Board', label: 'Task Kanban', icon: '📋' },
    { id: 'Vendors', label: 'Vendor Ledgers', icon: '🏪' },
    { id: 'GST Filing', label: 'GST Compliance', icon: '🏛️' },
    { id: 'Project P&L', label: 'Project P&L', icon: '📈' },
    { id: 'Project Control', label: 'Project Control', icon: '📑' },
    { id: 'Document Vault', label: 'Document Vault', icon: '📁' },
    { id: 'Settings', label: 'System Settings', icon: '⚙️' },
  ];

  const renderActiveView = () => {
    switch (activeTab) {
      case 'Dashboard': 
        return <MobileDashboard companySettings={companySettings} setActiveTab={setActiveTab} />;
      case 'CRM Leads': 
        return <MobileCRM />;
      case 'Projects': 
        return <MobileProjects />;
      case 'Estimation': 
        return <MobileEstimation companySettings={companySettings} />;
      case 'Tax Invoice': 
        return <MobileTaxInvoice companySettings={companySettings} updateDirtyState={updateDirtyState} />;
      case 'Purchase Orders': 
        return <MobilePurchaseOrders companySettings={companySettings} updateDirtyState={updateDirtyState} />;
      case 'Purchases': 
        return <MobilePurchases />;
      case 'Site Operations': 
        return <MobileSiteManager />;
      case 'Site Snag': 
        return <MobileSiteSnag companySettings={companySettings} />;
      case 'Subcontractors': 
        return <MobileSubcontractors />;
      case 'Measurement Sheet': 
        return <MobileMeasurementSheet />;
      case 'Inventory': 
        return <MobileInventory />;
      case 'Rate Book': 
        return <MobileRateBook />;
      case 'Petty Cash': 
        return <MobilePettyCash />;
      case 'Income': 
        return <MobileIncome />;
      case 'Salaries': 
        return <MobileSalaries />;
      case 'Employee Attendance': 
        return <MobileEmployeeAttendance />;
      case 'Employee Expenses': 
        return <MobileEmployeeExpenses />;
      case 'Tools': 
        return <MobileTools />;
      case 'Task Board': 
        return <MobileTaskBoard />;
      case 'Vendors': 
        return <MobileVendorLedger />;
      case 'GST Filing': 
        return <MobileGST />;
      case 'Project P&L': 
        return <MobileProjectPnL />;
      case 'Project Control': 
        return <MobileProjectControl />;
      case 'Document Vault': 
        return <MobileDocumentVault />;
      case 'Settings': 
        return <MobileSettings companySettings={companySettings} setCompanySettings={setCompanySettings} />;
      default: 
        return <MobileDashboard companySettings={companySettings} setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="w-full h-[100dvh] flex flex-col bg-zinc-100 font-['Poppins'] overflow-hidden">
      
      {/* TOP APP HEADER */}
      <header className="px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 bg-white border-b border-zinc-200 flex justify-between items-center shrink-0 z-30">
        <div className="flex items-center gap-2">
          <img 
            src={companySettings.logoUrl || "/jyanipur.png"} 
            alt="Logo" 
            className="h-7 w-auto object-contain" 
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <span className="font-black text-zinc-900 text-sm tracking-tight truncate max-w-[180px]">
            {companySettings.companyName || 'Jyanipur'}
          </span>
        </div>
        <button 
          onClick={handleLogout}
          className="text-[9px] font-black text-red-500 bg-red-50 px-2.5 py-1 rounded-lg uppercase tracking-wider active:scale-95 transition-transform"
        >
          Logout
        </button>
      </header>

      {/* ANIMATED ACTIVE VIEW AREA */}
      <main className="flex-1 overflow-hidden min-h-0 relative bg-zinc-100">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1.0] }}
            className="w-full h-full p-3 overflow-hidden"
          >
            {renderActiveView()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* BOTTOM TAB NAVIGATION */}
      <nav className="bg-white border-t border-zinc-200 flex justify-around pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] px-1 shrink-0 z-30">
        {mainTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id === 'Menu') {
                setIsDrawerOpen(true);
              } else {
                setActiveTab(tab.id);
              }
            }}
            className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all active:scale-90 ${
              activeTab === tab.id && tab.id !== 'Menu' 
                ? 'text-[#1E3A8A] font-black scale-105' 
                : 'text-zinc-400 font-bold'
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span className="text-[9px] mt-0.5">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* ALL APPS SLIDE-UP DRAWER WITH SPRING ANIMATION */}
      <AnimatePresence>
        {isDrawerOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex flex-col justify-end bg-slate-950/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="bg-white w-full h-[85vh] rounded-t-[2.5rem] p-6 flex flex-col shadow-2xl"
            >
              
              {/* Drawer Header */}
              <div className="flex justify-between items-center border-b border-zinc-100 pb-3 mb-4 shrink-0">
                <div>
                  <h3 className="text-xl font-extrabold text-zinc-900">All Modules</h3>
                  <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">Jyanipur Business Suite</p>
                </div>
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-8 h-8 flex items-center justify-center bg-zinc-100 text-zinc-600 rounded-full font-bold active:scale-90 transition-transform"
                >
                  ✕
                </button>
              </div>

              {/* Apps Grid */}
              <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-3 pb-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {allApps.map(app => (
                  <button
                    key={app.id}
                    onClick={() => {
                      setActiveTab(app.id);
                      setIsDrawerOpen(false);
                    }}
                    className={`p-3 rounded-2xl flex flex-col items-center justify-center text-center border transition-all active:scale-90 ${
                      activeTab === app.id 
                        ? 'bg-blue-50 border-[#1E3A8A] text-[#1E3A8A]' 
                        : 'bg-zinc-50 border-zinc-200/80 text-zinc-800'
                    }`}
                  >
                    <span className="text-2xl mb-1">{app.icon}</span>
                    <span className="text-[10px] font-extrabold leading-tight">{app.label}</span>
                  </button>
                ))}
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}