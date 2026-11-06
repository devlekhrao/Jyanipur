import React, { useState, useEffect } from 'react';
import Dashboard from './Dashboard';
import CRM from './CRM';
import TaxInvoice from './TaxInvoice';
import Estimation from './Estimation';
import EmployeeAttendance from './EmployeeAttendance';
import WorkOrders from './WorkOrders';
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
import CADViewer from './CADViewer';
import SiteSnag from './SiteSnag';
import ProjectControl from './ProjectControl';
import ProjectPnL from './ProjectPnL';
import MeasurementSheet from './MeasurementSheet';
import SiteManager from './SiteManager'; 
import PettyCash from './PettyCash';
import Settings from './Settings';
import BankStatement from './BankStatement';
import SiteSafety from './SiteSafety';
import WarrantyDLP from './WarrantyDLP';

// CLIENT SERVICES & SUPPORT MODULES
import Services from './Services';
import ClientSupport from './ClientSupport';
import ClientPortal from './ClientPortal';
import PortalEmail from './PortalEmail';

const APP_VERSION = "2.1.0";

export function VersionBadge({ isSidebarExpanded }) {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    async function checkVersion() {
      try {
        const res = await fetch("https://www.jyanipur.org.in/version.json");
        const data = await res.json();
        if (data.version && data.version !== APP_VERSION) {
          setUpdateAvailable(true);
        }
      } catch (e) {}
    }
    checkVersion();
  }, []);

  if (!isSidebarExpanded) {
    return (
      <div className="w-5 h-5 mx-auto flex items-center justify-center" title={`v${APP_VERSION} ${updateAvailable ? '- Update Ready' : '- Active'}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${updateAvailable ? 'bg-zinc-900 animate-pulse' : 'bg-emerald-500'}`}></span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-2 py-1 bg-zinc-50 rounded text-[8px] font-bold text-zinc-500 uppercase tracking-widest w-full">
      <span>v{APP_VERSION}</span>
      <span className="text-emerald-600 flex items-center gap-1">
        <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
        Active
      </span>
    </div>
  );
}

export default function DesktopLayout() {
  const [authStep, setAuthStep] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('jyanipur_auth') === 'true';
  });
  
  const [activePage, setActivePage] = useState('Dashboard');
  const [visitedPages, setVisitedPages] = useState(new Set(['Dashboard']));
  const [dirtyStates, setDirtyStates] = useState({});
  const [pendingPage, setPendingPage] = useState(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  
  // Collapsed by default for full screen space
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  // Group expansion accordion
  const [expandedGroups, setExpandedGroups] = useState({
    "Workspace": true,
    "Services & Support": false,
    "Site Execution": false,
    "Finance & Sales": false,
    "Supply Chain": false,
    "Team & HR": false
  });

  // RESTORED MASTER SETTINGS STATE (Fixes ReferenceError on line 396)
  const defaultSettings = {
    companyName: 'Jyanipur Interiors & Construction',
    companyAddress: '302 Amrutha lakshmi residency, Raja rajeshwari nagar, Kondapur, Hyderabad, Telangana, 500084',
    companyGst: '36OEYPS9800J1Z9',
    companyEmail: 'accounts@jyanipur.in',
    companyPhone: '+91 9246546742',
    logoUrl: '/new-logo-black.png', 
  };

  const [companySettings, setCompanySettings] = useState(() => {
    const saved = localStorage.getItem('jyanipur_companySettings');
    if (saved && saved !== 'undefined') {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return defaultSettings;
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
    
    if (isSidebarExpanded) {
      const activeGroup = navigationGroups.find(g => g.pages.includes(pageName));
      if (activeGroup && !expandedGroups[activeGroup.title]) {
        setExpandedGroups(prev => ({ ...prev, [activeGroup.title]: true }));
      }
    }
  };

  const handleSaveDraft = () => {
    setShowWarningModal(false);
    commitPageSwitch(pendingPage);
  };

  const handleDiscard = () => {
    if (activePage === 'Tax Invoice') {
      sessionStorage.removeItem('draft_invoiceDetails');
      sessionStorage.removeItem('draft_items');
      sessionStorage.removeItem('draft_taxMode');
      sessionStorage.removeItem('draft_editingId');
      sessionStorage.removeItem('draft_invoiceView');
    }
    if (activePage === 'Purchase Orders') {
      sessionStorage.removeItem('draft_poDetails');
      sessionStorage.removeItem('draft_poItems');
      sessionStorage.removeItem('draft_poEditingId');
      sessionStorage.removeItem('draft_poView');
    }
    if (activePage === 'Estimation') {
      localStorage.removeItem('jyanipur_desktop_estimate_draft');
    }
    if (activePage === 'Purchases') {
      sessionStorage.removeItem('draft_purDetails');
      sessionStorage.removeItem('draft_purItems');
      sessionStorage.removeItem('draft_purEditingId');
      sessionStorage.removeItem('draft_purView');
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

  const icons = {
    Dashboard: <svg className="w-3.5 h-3.5 opacity-75 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
    CRM: <svg className="w-3.5 h-3.5 opacity-75 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
    Projects: <svg className="w-3.5 h-3.5 opacity-75 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
    'Task Board': <svg className="w-3.5 h-3.5 opacity-75 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
    'Document Vault': <svg className="w-3.5 h-3.5 opacity-75 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>,
    'CAD Studio': <svg className="w-3.5 h-3.5 opacity-75 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>,
    
    // Dedicated Services & Client Support Icons
    'Services': <svg className="w-3.5 h-3.5 opacity-75 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
    'Client Support': <svg className="w-3.5 h-3.5 opacity-75 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
    'Client Portal': <svg className="w-3.5 h-3.5 opacity-75 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>,
    'Portal Email': <svg className="w-3.5 h-3.5 opacity-75 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,

    'Project Control': <svg className="w-3.5 h-3.5 opacity-75 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>,
    'Daily Report': <svg className="w-3.5 h-3.5 opacity-75 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
    'Site Snags': <svg className="w-3.5 h-3.5 opacity-75 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
    'Measurement Sheet': <svg className="w-3.5 h-3.5 opacity-75 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" /></svg>,
    'HSE Safety Tracker': <svg className="w-3.5 h-3.5 opacity-75 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
    'Warranty & DLP': <svg className="w-3.5 h-3.5 opacity-75 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    
    Estimation: <svg className="w-3.5 h-3.5 opacity-75 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
    'Work Orders': <svg className="w-3.5 h-3.5 opacity-75 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    'Tax Invoice': <svg className="w-3.5 h-3.5 opacity-75 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    'Project P&L': <svg className="w-3.5 h-3.5 opacity-75 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>,
    Income: <svg className="w-3.5 h-3.5 opacity-75 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    'Bank Statement': <svg className="w-3.5 h-3.5 opacity-75 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
    'Petty Cash': <svg className="w-3.5 h-3.5 opacity-75 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>,
    'GST Filing': <svg className="w-3.5 h-3.5 opacity-75 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" /></svg>,
    
    'Purchase Orders': <svg className="w-3.5 h-3.5 opacity-75 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    Purchases: <svg className="w-3.5 h-3.5 opacity-75 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>,
    Vendors: <svg className="w-3.5 h-3.5 opacity-75 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    'Vendor Ledger': <svg className="w-3.5 h-3.5 opacity-75 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
    Inventory: <svg className="w-3.5 h-3.5 opacity-75 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
    'Rate Book': <svg className="w-3.5 h-3.5 opacity-75 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
    'Tools & Assets': <svg className="w-3.5 h-3.5 opacity-75 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    Subcontractors: <svg className="w-3.5 h-3.5 opacity-75 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    
    'Employee Attendance': <svg className="w-3.5 h-3.5 opacity-75 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
    'Staff Expenses': <svg className="w-3.5 h-3.5 opacity-75 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    Salaries: <svg className="w-3.5 h-3.5 opacity-75 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  };

  const navigationGroups = [
    { title: "Workspace", pages: ['Dashboard', 'CRM', 'Projects', 'Task Board', 'Document Vault', 'CAD Studio'] },
    { title: "Services & Support", pages: ['Services', 'Client Support'] },
    { title: "Site Execution", pages: ['Project Control', 'Daily Report', 'Site Snags', 'Measurement Sheet', 'HSE Safety Tracker', 'Warranty & DLP'] },
    { title: "Finance & Sales", pages: ['Estimation', 'Work Orders', 'Tax Invoice', 'Project P&L', 'Income', 'Bank Statement', 'Petty Cash', 'GST Filing'] },
    { title: "Supply Chain", pages: ['Purchase Orders', 'Purchases', 'Vendors', 'Vendor Ledger', 'Inventory', 'Rate Book', 'Tools & Assets', 'Subcontractors'] },
    { title: "Team & HR", pages: ['Employee Attendance', 'Staff Expenses', 'Salaries'] }
  ];

  const toggleGroup = (title) => {
    if (!isSidebarExpanded) {
      setIsSidebarExpanded(true);
    }
    setExpandedGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setAuthStep('login');
    setEmail('');
    setPassword('');
    setTotpCode('');
    localStorage.removeItem('jyanipur_auth');
    setActivePage('Dashboard');
    setVisitedPages(new Set(['Dashboard']));
    setDirtyStates({});
  };

  if (isLoggedIn) {
    return (
      <div className="flex flex-col w-screen h-screen overflow-hidden bg-[#F4F4F5] font-['Inter',sans-serif] text-zinc-900 selection:bg-zinc-200 print:block print:h-auto print:overflow-visible">
        
        {showWarningModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 print:hidden">
            <div className="bg-white border border-zinc-200 p-8 rounded-2xl shadow-2xl max-w-sm w-full">
              <h3 className="text-xl font-bold text-zinc-900 mb-2 tracking-tight">Unsaved Progress</h3>
              <p className="text-zinc-500 text-xs mb-8 leading-relaxed">
                You have unsaved changes in <strong className="text-zinc-900">{activePage}</strong>.
              </p>
              <div className="flex flex-col gap-3">
                <button onClick={handleSaveDraft} className="w-full bg-zinc-900 text-white font-bold py-3 rounded-lg text-xs uppercase tracking-widest hover:bg-black transition-colors">Save Draft & Switch</button>
                <button onClick={handleDiscard} className="w-full bg-white text-zinc-900 font-bold py-3 rounded-lg text-xs uppercase tracking-widest border border-zinc-300 hover:bg-zinc-50 transition-colors">Discard Changes</button>
                <button onClick={() => setShowWarningModal(false)} className="w-full text-zinc-500 font-bold py-3 rounded-lg text-xs uppercase tracking-widest hover:text-zinc-900 transition-colors">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* FULL-WIDTH SLIM NAVBAR */}
        <header className="print:hidden w-full h-14 bg-white border-b border-zinc-200 px-4 flex items-center justify-between z-20 flex-shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
              className="w-8 h-8 flex items-center justify-center rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-zinc-900 rounded-md flex items-center justify-center text-white font-bold text-sm shadow-sm">J</div>
              <span className="font-bold text-base tracking-[0.15em] uppercase text-zinc-900 leading-none hidden sm:block">
                Jyanipur
              </span>
            </div>
          </div>

          <div className="flex flex-1 items-center justify-end md:justify-between pl-6">
            <div className="hidden md:flex items-center gap-4">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Quick Actions</span>
              <div className="h-4 w-[1px] bg-zinc-200"></div>
              
              <div className="flex items-center gap-2">
                <button onClick={() => handlePageSwitch('Tax Invoice')} className="px-3 py-1.5 bg-zinc-50 hover:bg-zinc-900 text-zinc-600 hover:text-white rounded-md text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-zinc-200 hover:border-zinc-900 shadow-sm">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg> Invoice
                </button>
                <button onClick={() => handlePageSwitch('Purchases')} className="px-3 py-1.5 bg-zinc-50 hover:bg-zinc-900 text-zinc-600 hover:text-white rounded-md text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-zinc-200 hover:border-zinc-900 shadow-sm">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg> Purchase
                </button>
                <button onClick={() => handlePageSwitch('Estimation')} className="px-3 py-1.5 bg-zinc-50 hover:bg-zinc-900 text-zinc-600 hover:text-white rounded-md text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-zinc-200 hover:border-zinc-900 shadow-sm">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg> Estimate
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-[11px] font-bold text-zinc-900 leading-tight">Admin Portal</p>
                <p className="text-[9px] font-medium text-zinc-500 tracking-wide">accounts@jyanipur.in</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-[10px] shadow-sm">
                AD
              </div>
            </div>
          </div>
        </header>

        {/* BOTTOM SECTION */}
        <div className="flex flex-1 overflow-hidden print:block print:h-auto print:overflow-visible">
          
          {/* ULTRA-COMPACT SIDEBAR */}
          <aside 
            className={`print:hidden h-full bg-white text-zinc-800 flex flex-col z-10 border-r border-zinc-200 shadow-[1px_0_10px_rgba(0,0,0,0.02)] transition-all duration-300 ease-in-out ${
              isSidebarExpanded ? 'w-[200px]' : 'w-[52px]'
            }`}
          >            
            <div className={`flex-1 overflow-y-auto overflow-x-hidden ${isSidebarExpanded ? 'px-2 py-3' : 'px-1 py-3'} flex flex-col gap-0.5 [&::-webkit-scrollbar]:hidden`}>
              {navigationGroups.map((group) => (
                <div key={group.title} className="flex flex-col mb-1">
                  
                  {isSidebarExpanded ? (
                    <button 
                      onClick={() => toggleGroup(group.title)} 
                      className="flex items-center justify-between px-2 py-1 w-full text-left cursor-pointer group/nav rounded-md hover:bg-zinc-50 transition-colors"
                    >
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-[0.1em] truncate">{group.title}</span>
                      <svg className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-300 ${expandedGroups[group.title] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                  ) : (
                    <div className="w-full flex justify-center mb-0.5 mt-0.5">
                      <div className="w-3 h-[1px] bg-zinc-200 my-0.5"></div>
                    </div>
                  )}

                  {(expandedGroups[group.title] || !isSidebarExpanded) && (
                    <div className="flex flex-col gap-0.5">
                      {group.pages.map((page) => (
                        <button 
                          key={page} 
                          onClick={() => handlePageSwitch(page)} 
                          title={page}
                          className={`group text-left rounded-md text-[10px] font-medium transition-all duration-200 flex items-center ${
                            activePage === page 
                              ? 'bg-zinc-900 text-white shadow-sm' 
                              : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                          } ${!isSidebarExpanded ? 'justify-center p-2' : 'px-2.5 py-1.5'}`}
                        >
                          <span className={`${isSidebarExpanded ? 'mr-2' : 'mr-0'}`}>
                            {icons[page] || <svg className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                          </span>
                          
                          {isSidebarExpanded && (
                            <span className="truncate flex-1 font-bold">{page}</span>
                          )}

                          {dirtyStates[page] && isSidebarExpanded && (
                            <span className={`ml-auto w-1 h-1 rounded-full ${activePage === page ? 'bg-zinc-400' : 'bg-zinc-900'}`}></span>
                          )}
                          
                          {dirtyStates[page] && !isSidebarExpanded && (
                            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500"></span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* COMPACT FOOTER - ICON ONLY */}
            <div className="p-2 bg-white border-t border-zinc-100 flex flex-col gap-1.5 items-center transition-all">
              <VersionBadge isSidebarExpanded={false} />
              
              <div className="flex flex-col gap-1.5 w-full items-center">
                <button 
                  onClick={() => handlePageSwitch('Settings')} 
                  title="Settings" 
                  className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors cursor-pointer ${activePage === 'Settings' ? 'bg-zinc-900 text-white' : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border border-zinc-200'}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </button>
                <button 
                  onClick={handleLogout} 
                  title="Logout" 
                  className="w-8 h-8 flex items-center justify-center bg-white border border-zinc-200 hover:border-red-600 hover:bg-red-600 hover:text-white text-zinc-600 rounded-md transition-all cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                </button>
              </div>
            </div>
          </aside>

          {/* MAIN CONTENT AREA */}
          <main className="print:w-full print:ml-0 print:block flex-1 h-full overflow-y-auto relative bg-[#F4F4F5] print:h-auto print:overflow-visible custom-scrollbar">
            <div className="w-full h-full max-w-[1600px] mx-auto p-4 lg:p-6">
              {visitedPages.has('Dashboard') && <div className={activePage === 'Dashboard' ? 'block' : 'hidden'}><Dashboard setActivePage={handlePageSwitch} companySettings={companySettings} /></div>}
              {visitedPages.has('CRM') && <div className={activePage === 'CRM' ? 'block' : 'hidden'}><CRM setActivePage={handlePageSwitch} companySettings={companySettings} /></div>}
              {visitedPages.has('Projects') && <div className={activePage === 'Projects' ? 'block' : 'hidden'}><Projects /></div>}
              {visitedPages.has('Task Board') && <div className={activePage === 'Task Board' ? 'block' : 'hidden'}><TaskBoard /></div>}
              {visitedPages.has('Document Vault') && <div className={activePage === 'Document Vault' ? 'block' : 'hidden'}><DocumentVault /></div>}
              {visitedPages.has('CAD Studio') && <div className={activePage === 'CAD Studio' ? 'block w-full h-full' : 'hidden'}><CADViewer /></div>}
              
              {/* Preserved / Mounted Pages */}
              {visitedPages.has('Client Portal') && <div className={activePage === 'Client Portal' ? 'block' : 'hidden'}><ClientPortal /></div>}
              {visitedPages.has('Portal Email') && <div className={activePage === 'Portal Email' ? 'block' : 'hidden'}><PortalEmail companySettings={companySettings} /></div>}

              {/* Mounted Services & Client Support */}
              {visitedPages.has('Services') && <div className={activePage === 'Services' ? 'block' : 'hidden'}><Services setActivePage={handlePageSwitch} companySettings={companySettings} /></div>}
              {visitedPages.has('Client Support') && <div className={activePage === 'Client Support' ? 'block' : 'hidden'}><ClientSupport companySettings={companySettings} /></div>}

              {visitedPages.has('Project Control') && <div className={activePage === 'Project Control' ? 'block' : 'hidden'}><ProjectControl companySettings={companySettings} /></div>}
              {visitedPages.has('Daily Report') && <div className={activePage === 'Daily Report' ? 'block' : 'hidden'}><SiteManager /></div>}
              {visitedPages.has('Site Snags') && <div className={activePage === 'Site Snags' ? 'block' : 'hidden'}><SiteSnag companySettings={companySettings} /></div>}
              {visitedPages.has('Measurement Sheet') && <div className={activePage === 'Measurement Sheet' ? 'block' : 'hidden'}><MeasurementSheet /></div>}
              {visitedPages.has('HSE Safety Tracker') && <div className={activePage === 'HSE Safety Tracker' ? 'block' : 'hidden'}><SiteSafety /></div>}
              {visitedPages.has('Warranty & DLP') && <div className={activePage === 'Warranty & DLP' ? 'block' : 'hidden'}><WarrantyDLP /></div>}
              
              {visitedPages.has('Estimation') && <div className={activePage === 'Estimation' ? 'block' : 'hidden'}><Estimation companySettings={companySettings} updateDirtyState={updateDirtyState} setActivePage={handlePageSwitch} /></div>}
              {visitedPages.has('Work Orders') && <div className={activePage === 'Work Orders' ? 'block' : 'hidden'}><WorkOrders companySettings={companySettings} updateDirtyState={updateDirtyState} /></div>}
              {visitedPages.has('Tax Invoice') && <div className={activePage === 'Tax Invoice' ? 'block' : 'hidden'}><TaxInvoice companySettings={companySettings} updateDirtyState={updateDirtyState} /></div>}
              {visitedPages.has('Project P&L') && <div className={activePage === 'Project P&L' ? 'block' : 'hidden'}><ProjectPnL /></div>}
              {visitedPages.has('Income') && <div className={activePage === 'Income' ? 'block' : 'hidden'}><Income companySettings={companySettings} /></div>}
              {visitedPages.has('Bank Statement') && <div className={activePage === 'Bank Statement' ? 'block' : 'hidden'}><BankStatement /></div>}
              {visitedPages.has('Petty Cash') && <div className={activePage === 'Petty Cash' ? 'block' : 'hidden'}><PettyCash companySettings={companySettings} /></div>}
              {visitedPages.has('GST Filing') && <div className={activePage === 'GST Filing' ? 'block' : 'hidden'}><GST companySettings={companySettings} /></div>}
              
              {visitedPages.has('Purchase Orders') && <div className={activePage === 'Purchase Orders' ? 'block' : 'hidden'}><PurchaseOrders companySettings={companySettings} updateDirtyState={updateDirtyState} /></div>}
              {visitedPages.has('Purchases') && <div className={activePage === 'Purchases' ? 'block' : 'hidden'}><Purchases companySettings={companySettings} updateDirtyState={updateDirtyState} /></div>}
              {visitedPages.has('Vendors') && <div className={activePage === 'Vendors' ? 'block' : 'hidden'}><Vendors /></div>}
              {visitedPages.has('Vendor Ledger') && <div className={activePage === 'Vendor Ledger' ? 'block' : 'hidden'}><VendorLedger /></div>}
              {visitedPages.has('Inventory') && <div className={activePage === 'Inventory' ? 'block' : 'hidden'}><Inventory companySettings={companySettings} setActivePage={handlePageSwitch} /></div>}
              {visitedPages.has('Rate Book') && <div className={activePage === 'Rate Book' ? 'block' : 'hidden'}><RateBook /></div>}
              {visitedPages.has('Tools & Assets') && <div className={activePage === 'Tools & Assets' ? 'block' : 'hidden'}><Tools /></div>}
              {visitedPages.has('Subcontractors') && <div className={activePage === 'Subcontractors' ? 'block' : 'hidden'}><Subcontractors /></div>}
              
              {visitedPages.has('Employee Attendance') && <div className={activePage === 'Employee Attendance' ? 'block' : 'hidden'}><EmployeeAttendance companySettings={companySettings} /></div>}
              {visitedPages.has('Staff Expenses') && <div className={activePage === 'Staff Expenses' ? 'block' : 'hidden'}><EmployeeExpenses /></div>}
              {visitedPages.has('Salaries') && <div className={activePage === 'Salaries' ? 'block' : 'hidden'}><Salaries /></div>}
              
              {visitedPages.has('Settings') && (
                <div className={activePage === 'Settings' ? 'block' : 'hidden'}>
                  <Settings companySettings={companySettings} setCompanySettings={setCompanySettings} />
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-screen h-[100dvh] flex items-center justify-center bg-[#F4F4F5] px-4 font-['Inter',sans-serif]">
      <div className="max-w-[420px] w-full bg-white rounded-3xl shadow-[0_8px_40px_rgb(0,0,0,0.06)] border border-zinc-200 p-10 relative z-10">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="w-14 h-14 bg-zinc-900 rounded-xl flex items-center justify-center text-white font-bold text-3xl mb-5 shadow-sm">J</div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Jyanipur Enterprise</h1>
          <p className="text-zinc-500 text-sm mt-1.5 font-medium">Sign in to access your workspace</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100 text-center font-bold tracking-wide">
            {error}
          </div>
        )}

        {authStep === 'login' ? (
          <form onSubmit={handleInitialLogin} className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-0.5">Work Email</label>
              <input 
                type="email" 
                name="email"
                placeholder="name@jyanipur.in"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="w-full px-4 py-3.5 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900" 
                required 
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-0.5">Passkey</label>
              <input 
                type="password" 
                name="password"
                placeholder="Enter your secure passkey"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="w-full px-4 py-3.5 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900" 
                required 
              />
            </div>

            <div className="flex items-center pt-1 pb-1 ml-0.5">
              <input 
                type="checkbox" 
                id="rememberMe" 
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-zinc-900 bg-zinc-100 border-zinc-300 rounded focus:ring-zinc-900 cursor-pointer accent-zinc-900"
              />
              <label htmlFor="rememberMe" className="ml-3 text-xs font-bold text-zinc-600 cursor-pointer select-none">
                Remember this device
              </label>
            </div>

            <button type="submit" className="w-full py-4 bg-zinc-900 hover:bg-black text-white font-bold rounded-xl text-sm uppercase tracking-widest cursor-pointer shadow-sm">
              Continue
            </button>
          </form>
        ) : (
          <form onSubmit={handle2FASubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-0.5 text-center">Enter 6-Digit Authenticator Code</label>
              <input 
                type="text" 
                name="totpCode"
                maxLength={6}
                placeholder="000000"
                value={totpCode} 
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))} 
                className="w-full px-4 py-5 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 text-center text-3xl tracking-[0.5em] font-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900" 
                required 
                autoFocus
              />
            </div>
            
            <button type="submit" className="w-full py-4 bg-zinc-900 hover:bg-black text-white font-bold rounded-xl text-sm uppercase tracking-widest cursor-pointer shadow-sm">
              Verify & Login
            </button>
            <button type="button" onClick={() => setAuthStep('login')} className="w-full py-3.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-600 font-bold rounded-xl text-xs uppercase tracking-widest cursor-pointer">
              Back to Login
            </button>
          </form>
        )}
      </div>
      
      <div className="fixed bottom-8 text-center w-full text-[10px] font-bold uppercase tracking-widest text-zinc-400">
        Secured by Jyanipur Enterprise Infrastructure
      </div>
    </div>
  );
}