import React, { useState, useRef } from 'react';

const DEFAULT_ENTERPRISE_SETTINGS = {
  companyName: 'Jyanipur Interiors & Construction',
  companyAddress: '302 Amrutha lakshmi residency, Raja rajeshwari nagar, Kondapur, Hyderabad, Telangana, 500084',
  companyGst: '36OEYPS9800J1Z9',
  companyPan: 'AABCP1234F',
  companyCin: 'U45200TG2020PTC123456',
  companyEmail: 'accounts@jyanipur.in',
  companyPhone: '+91 9246546742',
  companyWebsite: 'https://www.jyanipur.in',
  logoUrl: '/new-logo-black.png',
  
  // Banking
  bankName: 'HDFC Bank',
  accountName: 'Jyanipur Interiors and Construction',
  accountNo: '50200049281092',
  ifscCode: 'HDFC0001812',
  branchName: 'Kondapur, Hyderabad',
  upiId: 'jyanipur@hdfcbank',

  // Signatures & Stamps
  signatureUrl: '',
  stampUrl: '',

  // Document Numbering
  invoicePrefix: 'INV/FY26-27/',
  estimatePrefix: 'EST/FY26-27/',
  poPrefix: 'PO/2026/',
  woPrefix: 'WO/2026/',

  // Taxes & Rates
  currencySymbol: '₹',
  defaultGstRate: 18,
  defaultTdsRate: 1,
  defaultHsnSac: '9954',
  financialYearStart: 'April',

  // PDF Engine Toggles
  showBankDetailsOnPdf: true,
  showTermsOnPdf: true,
  showRemarksOnPdf: true,
  showSignatoryOnPdf: true,
  showSignatureImage: true,
  showStampImage: true,
  pdfFooterDisclaimer: 'This is an authorized computer-generated document issued by Jyanipur Enterprise Infrastructure.',

  // Standard Legal Clauses
  defaultInvoiceTerms: '1. Payment is strictly due within 15 days from the invoice date.\n2. Overdue payments will accrue interest at 1.5% per month.\n3. All disputes are subject to Hyderabad jurisdiction.',
  defaultEstimateTerms: '1. 50% Mobilization advance required upon contract confirmation.\n2. 40% payment payable upon structural material delivery at site.\n3. 10% final settlement upon joint inspection and handover.\n4. Rates valid for 30 calendar days from issue date.',
  defaultPOTerms: '1. Delivery must strictly match approved technical specifications.\n2. Delayed deliveries incur liquidated damages of 0.5% per week.\n3. Defective items will be returned at vendor cost.',

  // HR & Site Labor
  defaultWorkStartTime: '09:00',
  defaultWorkEndTime: '18:00',
  overtimeMultiplier: 1.5,
  skilledLaborRate: 1200,
  unskilledLaborRate: 750,

  // Integrations & Messaging
  waInvoiceTemplate: 'Hello {clientName}, please find your official Tax Invoice {invoiceNo} for {projectName} attached.',
  waPoTemplate: 'Dear {vendorName}, please find Purchase Order {poNo} attached from Jyanipur Interiors.',

  // Security & SaaS
  sessionTimeoutMinutes: 60,
  adminPasskey: '@llIneedis1.978'
};

export default function Settings({ companySettings = {}, setCompanySettings }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'
  const fileInputBackupRef = useRef(null);

  // Live Auto-Save to localStorage
  const updateSetting = (key, value) => {
    setSaveStatus('saving');
    setCompanySettings(prev => {
      const updated = { ...prev, [key]: value };
      localStorage.setItem('jyanipur_companySettings', JSON.stringify(updated));
      return updated;
    });

    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 300);
  };

  const handleManualSave = () => {
    localStorage.setItem('jyanipur_companySettings', JSON.stringify(companySettings));
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2500);
  };

  const handleImageUpload = (e, targetKey) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateSetting(targetKey, reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Full ERP JSON Backup Export
  const handleExportBackup = () => {
    const backupData = {
      exportDate: new Date().toISOString(),
      version: '2.0.0',
      companySettings: companySettings
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Jyanipur_Settings_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Full ERP JSON Backup Import
  const handleImportBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (imported.companySettings) {
          setCompanySettings(imported.companySettings);
          localStorage.setItem('jyanipur_companySettings', JSON.stringify(imported.companySettings));
          alert('Settings restored successfully from backup file!');
        } else {
          alert('Invalid backup file structure.');
        }
      } catch (err) {
        alert('Failed to parse backup JSON file.');
      }
    };
    reader.readAsText(file);
  };

  // Factory Reset
  const handleResetToFactory = () => {
    if (window.confirm("CAUTION: Reset all company settings, banking, numbering, and templates to initial factory defaults?")) {
      setCompanySettings(DEFAULT_ENTERPRISE_SETTINGS);
      localStorage.setItem('jyanipur_companySettings', JSON.stringify(DEFAULT_ENTERPRISE_SETTINGS));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-lg border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 text-sm font-medium transition-all shadow-sm";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-0.5";
  const cardClass = "bg-white p-6 rounded-xl border border-zinc-200 shadow-sm space-y-5";
  const cardHeaderClass = "text-xs font-bold text-zinc-900 uppercase tracking-widest border-b border-zinc-100 pb-3 mb-4 flex items-center justify-between";

  const tabs = [
    { 
      id: 'profile', 
      label: 'Company & Banking', 
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> 
    },
    { 
      id: 'accounting', 
      label: 'Taxes & Numbering', 
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" /></svg> 
    },
    { 
      id: 'printing', 
      label: 'Print & PDF Engine', 
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg> 
    },
    { 
      id: 'defaults', 
      label: 'Legal Clauses', 
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> 
    },
    { 
      id: 'hr', 
      label: 'Labor & Wages', 
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg> 
    },
    { 
      id: 'system', 
      label: 'SaaS Administration', 
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> 
    }
  ];

  return (
    <div className="w-full h-full flex flex-col font-['Inter',sans-serif]">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 mb-6 border-b border-zinc-200 shrink-0 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">System Configuration</h2>
          <p className="text-zinc-500 text-sm mt-1 font-medium">Enterprise branding, legal clauses, PDF engine, and data persistence.</p>
        </div>

        <div className="flex items-center gap-3">
          {saveStatus === 'saving' && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5 bg-zinc-100 px-3 py-1.5 rounded-lg border border-zinc-200">
              <span className="w-2 h-2 rounded-full bg-zinc-400 animate-ping"></span> Saving...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Synced Permanently
            </span>
          )}

          <button 
            onClick={handleManualSave}
            className="bg-zinc-900 hover:bg-black text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-2 border border-black"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Save All Preferences
          </button>
        </div>
      </div>

      {/* MAIN LAYOUT: SIDEBAR + CONTENT */}
      <div className="flex flex-1 min-h-0 gap-8">
        
        {/* SETTINGS SIDEBAR */}
        <div className="w-60 shrink-0 flex flex-col gap-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-all cursor-pointer border ${
                activeTab === tab.id 
                  ? 'bg-zinc-900 border-black text-white shadow-sm' 
                  : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}

          {/* Device Persistence Badge */}
          <div className="mt-6 p-4 rounded-xl bg-zinc-100 border border-zinc-200 text-[10px] font-medium text-zinc-600 leading-relaxed">
            <span className="font-bold text-zinc-900 uppercase tracking-widest block mb-1">Local Mirror Active</span>
            Settings auto-commit instantly to your device cache and persist across reloads and logouts.
          </div>
        </div>

        {/* SETTINGS CONTENT AREA */}
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-10">
          <div className="max-w-3xl space-y-6">

            {/* TAB: PROFILE & BANK */}
            {activeTab === 'profile' && (
              <>
                <div className={cardClass}>
                  <div className={cardHeaderClass}>
                    <span>Company Operating Identity</span>
                    <span className="text-[10px] text-zinc-400 font-mono">Entity #36</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className={labelClass}>Registered Company Name</label>
                      <input type="text" value={companySettings.companyName || ''} onChange={e => updateSetting('companyName', e.target.value)} className={inputClass} placeholder="Registered Legal Name" />
                    </div>
                    <div>
                      <label className={labelClass}>GSTIN</label>
                      <input type="text" value={companySettings.companyGst || ''} onChange={e => updateSetting('companyGst', e.target.value.toUpperCase())} className={`${inputClass} font-mono`} placeholder="36OEYPS9800J1Z9" />
                    </div>
                    <div>
                      <label className={labelClass}>PAN Number</label>
                      <input type="text" value={companySettings.companyPan || ''} onChange={e => updateSetting('companyPan', e.target.value.toUpperCase())} className={`${inputClass} font-mono`} placeholder="AABCP1234F" />
                    </div>
                    <div>
                      <label className={labelClass}>Corporate Identity No. (CIN)</label>
                      <input type="text" value={companySettings.companyCin || ''} onChange={e => updateSetting('companyCin', e.target.value.toUpperCase())} className={`${inputClass} font-mono`} placeholder="U45200TG..." />
                    </div>
                    <div>
                      <label className={labelClass}>Official Phone</label>
                      <input type="text" value={companySettings.companyPhone || ''} onChange={e => updateSetting('companyPhone', e.target.value)} className={inputClass} placeholder="+91..." />
                    </div>
                    <div>
                      <label className={labelClass}>Billing & Accounts Email</label>
                      <input type="email" value={companySettings.companyEmail || ''} onChange={e => updateSetting('companyEmail', e.target.value)} className={inputClass} placeholder="accounts@company.com" />
                    </div>
                    <div>
                      <label className={labelClass}>Website URL</label>
                      <input type="text" value={companySettings.companyWebsite || ''} onChange={e => updateSetting('companyWebsite', e.target.value)} className={inputClass} placeholder="https://..." />
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelClass}>Operating Office Address</label>
                      <textarea rows="3" value={companySettings.companyAddress || ''} onChange={e => updateSetting('companyAddress', e.target.value)} className={`${inputClass} resize-y min-h-[75px]`} placeholder="Full physical office address"></textarea>
                    </div>
                  </div>
                </div>

                <div className={cardClass}>
                  <div className={cardHeaderClass}>
                    <span>Banking & Remittance Particulars</span>
                    <span className="text-[10px] text-zinc-400">Printed on BOQs & Invoices</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className={labelClass}>Bank Name</label><input type="text" value={companySettings.bankName || ''} onChange={e => updateSetting('bankName', e.target.value)} className={inputClass} placeholder="e.g. HDFC Bank" /></div>
                    <div><label className={labelClass}>Account Holder Name</label><input type="text" value={companySettings.accountName || ''} onChange={e => updateSetting('accountName', e.target.value)} className={inputClass} placeholder="Beneficiary Account Name" /></div>
                    <div><label className={labelClass}>Account Number</label><input type="text" value={companySettings.accountNo || ''} onChange={e => updateSetting('accountNo', e.target.value)} className={`${inputClass} font-mono font-bold`} placeholder="5020..." /></div>
                    <div><label className={labelClass}>IFSC Code</label><input type="text" value={companySettings.ifscCode || ''} onChange={e => updateSetting('ifscCode', e.target.value.toUpperCase())} className={`${inputClass} font-mono font-bold`} placeholder="HDFC0001812" /></div>
                    <div><label className={labelClass}>Branch</label><input type="text" value={companySettings.branchName || ''} onChange={e => updateSetting('branchName', e.target.value)} className={inputClass} placeholder="Branch Name" /></div>
                    <div><label className={labelClass}>Virtual Payment Address (UPI)</label><input type="text" value={companySettings.upiId || ''} onChange={e => updateSetting('upiId', e.target.value)} className={inputClass} placeholder="name@bank" /></div>
                  </div>
                </div>

                <div className={cardClass}>
                  <div className={cardHeaderClass}>
                    <span>Signatures & Official Seals</span>
                    <span className="text-[10px] text-zinc-400">PDF Authentication</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Digital Signature */}
                    <div className="border border-zinc-200 rounded-lg p-4 bg-zinc-50/50 space-y-3">
                      <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest block">Authorized Signatory</span>
                      <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'signatureUrl')} className="w-full text-xs text-zinc-600 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-zinc-900 file:text-white cursor-pointer" />
                      {companySettings.signatureUrl ? (
                        <div className="bg-white p-3 rounded border border-zinc-200 flex items-center justify-between">
                          <img src={companySettings.signatureUrl} alt="Signature" className="h-10 w-auto object-contain mix-blend-multiply" />
                          <button onClick={() => updateSetting('signatureUrl', '')} className="text-red-600 hover:text-red-800 text-[10px] font-bold uppercase tracking-widest cursor-pointer">Remove</button>
                        </div>
                      ) : (
                        <p className="text-[10px] text-zinc-400 italic">No signature file uploaded.</p>
                      )}
                    </div>

                    {/* Official Company Stamp */}
                    <div className="border border-zinc-200 rounded-lg p-4 bg-zinc-50/50 space-y-3">
                      <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest block">Official Seal / Stamp</span>
                      <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'stampUrl')} className="w-full text-xs text-zinc-600 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-zinc-900 file:text-white cursor-pointer" />
                      {companySettings.stampUrl ? (
                        <div className="bg-white p-3 rounded border border-zinc-200 flex items-center justify-between">
                          <img src={companySettings.stampUrl} alt="Stamp" className="h-10 w-auto object-contain mix-blend-multiply" />
                          <button onClick={() => updateSetting('stampUrl', '')} className="text-red-600 hover:text-red-800 text-[10px] font-bold uppercase tracking-widest cursor-pointer">Remove</button>
                        </div>
                      ) : (
                        <p className="text-[10px] text-zinc-400 italic">No stamp file uploaded.</p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* TAB: ACCOUNTING & TAX */}
            {activeTab === 'accounting' && (
              <>
                <div className={cardClass}>
                  <div className={cardHeaderClass}>
                    <span>Document Sequence Codes</span>
                    <span className="text-[10px] text-zinc-400">Auto-Numbering</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Tax Invoice Prefix</label>
                      <input type="text" value={companySettings.invoicePrefix || ''} onChange={e => updateSetting('invoicePrefix', e.target.value)} className={`${inputClass} font-mono`} placeholder="INV/FY26-27/" />
                    </div>
                    <div>
                      <label className={labelClass}>Estimation / BOQ Prefix</label>
                      <input type="text" value={companySettings.estimatePrefix || ''} onChange={e => updateSetting('estimatePrefix', e.target.value)} className={`${inputClass} font-mono`} placeholder="EST/FY26-27/" />
                    </div>
                    <div>
                      <label className={labelClass}>Purchase Order Prefix</label>
                      <input type="text" value={companySettings.poPrefix || ''} onChange={e => updateSetting('poPrefix', e.target.value)} className={`${inputClass} font-mono`} placeholder="PO/2026/" />
                    </div>
                    <div>
                      <label className={labelClass}>Subcontractor Work Order Prefix</label>
                      <input type="text" value={companySettings.woPrefix || ''} onChange={e => updateSetting('woPrefix', e.target.value)} className={`${inputClass} font-mono`} placeholder="WO/2026/" />
                    </div>
                  </div>
                </div>

                <div className={cardClass}>
                  <div className={cardHeaderClass}>
                    <span>Statutory Tax & Currency Standard</span>
                    <span className="text-[10px] text-zinc-400">GSTR Compliance</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={labelClass}>Currency Display Symbol</label>
                      <input type="text" value={companySettings.currencySymbol || '₹'} onChange={e => updateSetting('currencySymbol', e.target.value)} className={inputClass} placeholder="₹" />
                    </div>
                    <div>
                      <label className={labelClass}>Standard GST Bracket (%)</label>
                      <input type="number" value={companySettings.defaultGstRate || 18} onChange={e => updateSetting('defaultGstRate', parseFloat(e.target.value))} className={inputClass} placeholder="18" />
                    </div>
                    <div>
                      <label className={labelClass}>Section 194C TDS Rate (%)</label>
                      <input type="number" step="0.1" value={companySettings.defaultTdsRate || 1} onChange={e => updateSetting('defaultTdsRate', parseFloat(e.target.value))} className={inputClass} placeholder="1.0" />
                    </div>
                    <div>
                      <label className={labelClass}>Standard SAC Code (Interiors)</label>
                      <input type="text" value={companySettings.defaultHsnSac || '9954'} onChange={e => updateSetting('defaultHsnSac', e.target.value)} className={`${inputClass} font-mono`} placeholder="9954" />
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelClass}>Financial Year Beginning</label>
                      <select value={companySettings.financialYearStart || 'April'} onChange={e => updateSetting('financialYearStart', e.target.value)} className={inputClass}>
                        <option value="April">April (Indian Fiscal Cycle: Apr - Mar)</option>
                        <option value="January">January (Calendar Cycle: Jan - Dec)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* TAB: PRINT & PDF ENGINE */}
            {activeTab === 'printing' && (
              <div className={cardClass}>
                <div className={cardHeaderClass}>
                  <span>A4 Print Engine Visibility Rules</span>
                  <span className="text-[10px] text-zinc-400">PDF Output Architecture</span>
                </div>
                <div className="space-y-3">
                  {[
                    { key: 'showBankDetailsOnPdf', label: 'Bank Details Box', desc: 'Display beneficiary account, IFSC, and bank name on quotation & invoice footers.' },
                    { key: 'showTermsOnPdf', label: 'Terms & Conditions Schedule', desc: 'Render legal payment milestones and warranty clauses on the final page.' },
                    { key: 'showRemarksOnPdf', label: 'Scope Remarks Section', desc: 'Include project-specific notes and technical architectural caveats.' },
                    { key: 'showSignatoryOnPdf', label: 'Authorized Signatory Block', desc: 'Show the formal corporate authorization block.' },
                    { key: 'showSignatureImage', label: 'Render Uploaded Digital Signature', desc: 'Automatically embed the uploaded signature image into the signatory box.' },
                    { key: 'showStampImage', label: 'Render Official Corporate Seal', desc: 'Embed the company circular seal over the signature block.' }
                  ].map(item => (
                    <label key={item.key} className="flex items-start gap-3 p-3.5 rounded-lg border border-zinc-200 bg-zinc-50/50 hover:bg-zinc-50 cursor-pointer transition-colors">
                      <input 
                        type="checkbox" 
                        checked={companySettings[item.key] !== false} 
                        onChange={e => updateSetting(item.key, e.target.checked)} 
                        className="w-4 h-4 mt-0.5 rounded text-zinc-900 border-zinc-300 focus:ring-zinc-900 accent-zinc-900 cursor-pointer" 
                      />
                      <div>
                        <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider block">{item.label}</span>
                        <span className="text-xs text-zinc-500 font-medium">{item.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="pt-4 border-t border-zinc-100">
                  <label className={labelClass}>Global PDF Footer Disclaimer</label>
                  <textarea rows="2" value={companySettings.pdfFooterDisclaimer || ''} onChange={e => updateSetting('pdfFooterDisclaimer', e.target.value)} className={`${inputClass} resize-y text-xs`} placeholder="e.g. This is a computer-generated document..."></textarea>
                </div>
              </div>
            )}

            {/* TAB: LEGAL CLAUSES */}
            {activeTab === 'defaults' && (
              <div className={cardClass}>
                <div className={cardHeaderClass}>
                  <span>Standard Corporate Clauses</span>
                  <span className="text-[10px] text-zinc-400">Pre-fill Defaults</span>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Estimation / BOQ Payment Milestone Terms</label>
                    <textarea rows="4" value={companySettings.defaultEstimateTerms || ''} onChange={e => updateSetting('defaultEstimateTerms', e.target.value)} className={`${inputClass} text-xs leading-relaxed font-mono`} placeholder="Standard milestone rules..."></textarea>
                  </div>
                  <div>
                    <label className={labelClass}>Tax Invoice Legal Terms</label>
                    <textarea rows="4" value={companySettings.defaultInvoiceTerms || ''} onChange={e => updateSetting('defaultInvoiceTerms', e.target.value)} className={`${inputClass} text-xs leading-relaxed font-mono`} placeholder="Payment terms..."></textarea>
                  </div>
                  <div>
                    <label className={labelClass}>Purchase Order Procurement Terms</label>
                    <textarea rows="4" value={companySettings.defaultPOTerms || ''} onChange={e => updateSetting('defaultPOTerms', e.target.value)} className={`${inputClass} text-xs leading-relaxed font-mono`} placeholder="PO specifications..."></textarea>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: LABOR & WAGES */}
            {activeTab === 'hr' && (
              <div className={cardClass}>
                <div className={cardHeaderClass}>
                  <span>Labor Baseline & Muster Rules</span>
                  <span className="text-[10px] text-zinc-400">Form XVI Calculations</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Site Shift Start Time</label>
                    <input type="time" value={companySettings.defaultWorkStartTime || '09:00'} onChange={e => updateSetting('defaultWorkStartTime', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Site Shift End Time</label>
                    <input type="time" value={companySettings.defaultWorkEndTime || '18:00'} onChange={e => updateSetting('defaultWorkEndTime', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Overtime Multiplier</label>
                    <input type="number" step="0.1" value={companySettings.overtimeMultiplier || 1.5} onChange={e => updateSetting('overtimeMultiplier', parseFloat(e.target.value))} className={inputClass} placeholder="1.5" />
                  </div>
                  <div>
                    <label className={labelClass}>Master Craftsman Benchmark Rate (₹/day)</label>
                    <input type="number" value={companySettings.skilledLaborRate || 1200} onChange={e => updateSetting('skilledLaborRate', parseFloat(e.target.value))} className={inputClass} placeholder="1200" />
                  </div>
                  <div>
                    <label className={labelClass}>General Helper Benchmark Rate (₹/day)</label>
                    <input type="number" value={companySettings.unskilledLaborRate || 750} onChange={e => updateSetting('unskilledLaborRate', parseFloat(e.target.value))} className={inputClass} placeholder="750" />
                  </div>
                </div>
              </div>
            )}

            {/* TAB: SAAS ADMINISTRATION */}
            {activeTab === 'system' && (
              <>
                {/* Backup & Portability */}
                <div className={cardClass}>
                  <div className={cardHeaderClass}>
                    <span>ERP Data Portability & Disaster Recovery</span>
                    <span className="text-[10px] text-zinc-400">JSON Snapshots</span>
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Download an offline encrypted snapshot of your ERP company configuration. You can import this snapshot on any computer or browser to restore all settings instantly.
                  </p>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button 
                      onClick={handleExportBackup}
                      className="px-5 py-2.5 bg-zinc-900 hover:bg-black text-white rounded-lg text-xs font-bold uppercase tracking-widest shadow-sm cursor-pointer flex items-center gap-2 border border-black"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                      Export Backup File
                    </button>

                    <button 
                      onClick={() => fileInputBackupRef.current && fileInputBackupRef.current.click()}
                      className="px-5 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-900 rounded-lg text-xs font-bold uppercase tracking-widest shadow-sm cursor-pointer flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                      Restore From File
                    </button>
                    <input type="file" ref={fileInputBackupRef} accept=".json" onChange={handleImportBackup} className="hidden" />
                  </div>
                </div>

                {/* Authentication & Access */}
                <div className={cardClass}>
                  <div className={cardHeaderClass}>
                    <span>Administrator Access Control</span>
                    <span className="text-[10px] text-zinc-400">Security Guard</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Portal Admin Passkey</label>
                      <input 
                        type="text" 
                        value={companySettings.adminPasskey || '@llIneedis1.978'} 
                        onChange={e => updateSetting('adminPasskey', e.target.value)} 
                        className={`${inputClass} font-mono`} 
                        placeholder="Secure passkey..." 
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Inactivity Session Timeout (Minutes)</label>
                      <input 
                        type="number" 
                        value={companySettings.sessionTimeoutMinutes || 60} 
                        onChange={e => updateSetting('sessionTimeoutMinutes', parseInt(e.target.value) || 60)} 
                        className={inputClass} 
                        placeholder="60" 
                      />
                    </div>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-red-50/50 p-6 rounded-xl border border-red-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-red-100 pb-3">
                    <h3 className="text-xs font-bold text-red-700 uppercase tracking-widest flex items-center gap-2">
                      <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      Danger Zone
                    </h3>
                  </div>
                  <p className="text-xs text-red-800/80 leading-relaxed font-medium">
                    Resetting to factory defaults will restore standard enterprise numbering, delete custom legal clauses, and reset bank details back to default Jyanipur credentials.
                  </p>
                  <button 
                    onClick={handleResetToFactory}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold uppercase tracking-widest shadow-sm cursor-pointer transition-colors"
                  >
                    Reset All Settings to Factory Default
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}