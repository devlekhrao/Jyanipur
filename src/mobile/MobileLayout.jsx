import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerLightHaptic } from '../utils/haptics';

// 2D Vector Icons
import { 
  LayoutDashboard, Receipt, Building2, HardHat, LayoutGrid, 
  Users, Ruler, ShoppingCart, Package, AlertTriangle, 
  Briefcase, DraftingCompass, Warehouse, Tag, Wallet, 
  IndianRupee, Banknote, CalendarCheck, CreditCard, PenTool, 
  ClipboardList, Store, Landmark, TrendingUp, SlidersHorizontal, 
  FolderClosed, Settings 
} from 'lucide-react';

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

  // Quick-access bottom bar items with 2D Icons
  const mainTabs = [
    { id: 'Dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'Tax Invoice', label: 'Invoices', icon: Receipt },
    { id: 'Projects', label: 'Projects', icon: Building2 },
    { id: 'Site Operations', label: 'Site', icon: HardHat },
    { id: 'Menu', label: 'All Apps', icon: LayoutGrid },
  ];

  // Full module list for the slide-up menu drawer with 2D Icons
  const allApps = [
    { id: 'Dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'CRM Leads', label: 'CRM & Leads', icon: Users },
    { id: 'Projects', label: 'Projects & Jobs', icon: Building2 },
    { id: 'Estimation', label: 'BOQ Estimations', icon: Ruler },
    { id: 'Tax Invoice', label: 'Tax Invoices', icon: Receipt },
    { id: 'Purchase Orders', label: 'Purchase Orders', icon: ShoppingCart },
    { id: 'Purchases', label: 'Inward Purchases', icon: Package },
    { id: 'Site Operations', label: 'Site Operations', icon: HardHat },
    { id: 'Site Snag', label: 'Quality Snags', icon: AlertTriangle },
    { id: 'Subcontractors', label: 'Subcontractors', icon: Briefcase },
    { id: 'Measurement Sheet', label: 'Measurement Sheets', icon: DraftingCompass },
    { id: 'Inventory', label: 'Godown Inventory', icon: Warehouse },
    { id: 'Rate Book', label: 'Material RateBook', icon: Tag },
    { id: 'Petty Cash', label: 'Site Petty Cash', icon: Wallet },
    { id: 'Income', label: 'Client Income', icon: IndianRupee },
    { id: 'Salaries', label: 'Payroll & Salaries', icon: Banknote },
    { id: 'Employee Attendance', label: 'Staff Attendance', icon: CalendarCheck },
    { id: 'Employee Expenses', label: 'Staff Expenses', icon: CreditCard },
    { id: 'Tools', label: 'Tools & Assets', icon: PenTool },
    { id: 'Task Board', label: 'Task Kanban', icon: ClipboardList },
    { id: 'Vendors', label: 'Vendor Ledgers', icon: Store },
    { id: 'GST Filing', label: 'GST Compliance', icon: Landmark },
    { id: 'Project P&L', label: 'Project P&L', icon: TrendingUp },
    { id: 'Project Control', label: 'Project Control', icon: SlidersHorizontal },
    { id: 'Document Vault', label: 'Document Vault', icon: FolderClosed },
    { id: 'Settings', label: 'System Settings', icon: Settings },
  ];

  const renderActiveView = () => {
    switch (activeTab) {
      case 'Dashboard': return <MobileDashboard companySettings={companySettings} setActiveTab={setActiveTab} />;
      case 'CRM Leads': return <MobileCRM />;
      case 'Projects': return <MobileProjects />;
      case 'Estimation': return <MobileEstimation companySettings={companySettings} />;
      case 'Tax Invoice': return <MobileTaxInvoice companySettings={companySettings} updateDirtyState={updateDirtyState} />;
      case 'Purchase Orders': return <MobilePurchaseOrders companySettings={companySettings} updateDirtyState={updateDirtyState} />;
      case 'Purchases': return <MobilePurchases />;
      case 'Site Operations': return <MobileSiteManager />;
      case 'Site Snag': return <MobileSiteSnag companySettings={companySettings} />;
      case 'Subcontractors': return <MobileSubcontractors />;
      case 'Measurement Sheet': return <MobileMeasurementSheet />;
      case 'Inventory': return <MobileInventory />;
      case 'Rate Book': return <MobileRateBook />;
      case 'Petty Cash': return <MobilePettyCash />;
      case 'Income': return <MobileIncome />;
      case 'Salaries': return <MobileSalaries />;
      case 'Employee Attendance': return <MobileEmployeeAttendance />;
      case 'Employee Expenses': return <MobileEmployeeExpenses />;
      case 'Tools': return <MobileTools />;
      case 'Task Board': return <MobileTaskBoard />;
      case 'Vendors': return <MobileVendorLedger />;
      case 'GST Filing': return <MobileGST />;
      case 'Project P&L': return <MobileProjectPnL />;
      case 'Project Control': return <MobileProjectControl />;
      case 'Document Vault': return <MobileDocumentVault />;
      case 'Settings': return <MobileSettings companySettings={companySettings} setCompanySettings={setCompanySettings} />;
      default: return <MobileDashboard companySettings={companySettings} setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="w-full h-[100dvh] flex flex-col bg-zinc-100 font-['Poppins'] overflow-hidden">
      
      {/* FLUID SAFE AREA HEADER */}
      <header className="px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-3 bg-white border-b border-zinc-200 flex justify-between items-center shrink-0 z-30 shadow-sm">
        <div className="flex items-center gap-2">
          <img 
            src={companySettings.logoUrl || "/jyanipur.png"} 
            alt="Logo" 
            className="h-7 w-auto object-contain" 
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <span className="font-semibold text-[11px] text-zinc-900 text-sm tracking-tight truncate max-w-[180px]">
            {companySettings.companyName || 'Jyanipur'}
          </span>
        </div>
        <button 
          onClick={() => {
            triggerLightHaptic();
            handleLogout();
          }}
          className="text-[9px] font-semibold text-[11px] text-red-500 bg-red-50 px-2.5 py-1 rounded-lg uppercase tracking-wider active:scale-95 transition-transform"
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
            className="w-full h-full p-3 overflow-hidden relative"
          >
            {renderActiveView()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* FLUID SAFE AREA BOTTOM NAVIGATION */}
      <nav className="bg-white border-t border-zinc-200 flex justify-around pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] px-1 shrink-0 z-30">
        {mainTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id && tab.id !== 'Menu';
          return (
            <button
              key={tab.id}
              onClick={() => {
                triggerLightHaptic(); 
                if (tab.id === 'Menu') {
                  setIsDrawerOpen(true);
                } else {
                  setActiveTab(tab.id);
                }
              }}
              className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all active:scale-90 ${
                isActive ? 'text-[#1E3A8A] font-semibold text-[11px] scale-105' : 'text-zinc-400 font-bold'
              }`}
            >
              <Icon 
                strokeWidth={isActive ? 2.5 : 2} 
                className={`w-[22px] h-[22px] transition-colors ${isActive ? 'stroke-[#1E3A8A]' : 'stroke-zinc-400'}`} 
              />
              <span className="text-[9px] mt-1">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ALL APPS SLIDE-UP DRAWER */}
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
              className="bg-white w-full h-[85vh] rounded-t-[2.5rem] p-6 pb-[calc(env(safe-area-inset-bottom,0px)+24px)] flex flex-col shadow-2xl"
            >
              
              {/* Drawer Header */}
              <div className="flex justify-between items-center border-b border-zinc-100 pb-3 mb-4 shrink-0">
                <div>
                  <h3 className="text-xl font-bold text-zinc-900">All Modules</h3>
                  <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">Jyanipur Business Suite</p>
                </div>
                <button 
                  onClick={() => {
                    triggerLightHaptic(); 
                    setIsDrawerOpen(false);
                  }}
                  className="w-8 h-8 flex items-center justify-center bg-zinc-100 text-zinc-600 rounded-full font-bold active:scale-90 transition-transform"
                >
                  ✕
                </button>
              </div>

              {/* Apps Grid */}
              <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-3 pb-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {allApps.map(app => {
                  const Icon = app.icon;
                  const isActive = activeTab === app.id;
                  return (
                    <button
                      key={app.id}
                      onClick={() => {
                        triggerLightHaptic();
                        setActiveTab(app.id);
                        setIsDrawerOpen(false);
                      }}
                      className={`p-3 rounded-2xl flex flex-col items-center justify-center text-center border transition-all active:scale-90 ${
                        isActive 
                          ? 'bg-blue-50 border-[#1E3A8A] text-[#1E3A8A]' 
                          : 'bg-zinc-50 border-zinc-200/80 text-zinc-600 hover:bg-zinc-100'
                      }`}
                    >
                      <Icon 
                        strokeWidth={isActive ? 2.5 : 2} 
                        className={`w-6 h-6 mb-2 transition-colors ${isActive ? 'stroke-[#1E3A8A]' : 'stroke-zinc-500'}`} 
                      />
                      <span className="text-[10px] font-bold leading-tight text-zinc-800">{app.label}</span>
                    </button>
                  );
                })}
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}