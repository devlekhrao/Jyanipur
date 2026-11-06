import React, { useState, useEffect } from 'react';
import { 
  getVaultDocuments, saveVaultDocument, deleteVaultDocument, getProjects,
  getClientWorkOrders, getSubcontractorWorkOrders, getEstimations, getInvoices, 
  getMeasurementSheets
} from '../db';

export default function DocumentVault() {
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [projects, setProjects] = useState([]);
  
  // Auto-Generated Entities for Folders
  const [activeClients, setActiveClients] = useState([]);
  const [activeSubs, setActiveSubs] = useState([]);
  
  // Navigation & Filter States (Google Drive Style)
  const [path, setPath] = useState([{ type: 'ROOT', name: 'Vault Drive' }]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isUploadOpen, setIsModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    linkedType: 'General', 
    linkedId: '',
    linkedName: '',
    documentName: '', 
    category: '2D Drawings', 
    fileUrl: '', 
    fileType: 'PDF', 
    actualNotes: ''
  });

  const categories = [
    'All', '2D Drawings', '3D Renders', 'Client Approvals', 'Contracts & Legal', 
    'Estimations & Quotes', 'Bills & Invoices', 'Measurement Sheets', 'Site Reports', 'Site Photos'
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const [
        docs, projs, clientWOs, subWOs, ests, invs, meas
      ] = await Promise.all([
        getVaultDocuments ? getVaultDocuments() : Promise.resolve([]),
        getProjects ? getProjects() : Promise.resolve([]),
        getClientWorkOrders ? getClientWorkOrders() : Promise.resolve([]),
        getSubcontractorWorkOrders ? getSubcontractorWorkOrders() : Promise.resolve([]),
        getEstimations ? getEstimations() : Promise.resolve([]),
        getInvoices ? getInvoices() : Promise.resolve([]),
        getMeasurementSheets ? getMeasurementSheets() : Promise.resolve([]),
      ]);

      setProjects(projs || []);

      // 1. EXTRACT ALL UNIQUE CLIENTS ACROSS THE ENTIRE ERP
      const clientMap = new Map();
      const addClient = (name) => {
        if (name && String(name).trim() !== '') {
          clientMap.set(name, { id: name, name: name });
        }
      };

      (clientWOs || []).forEach(wo => addClient(wo.clientName));
      (ests || []).forEach(est => addClient(est.clientName));
      (invs || []).forEach(inv => addClient(inv.client));
      (projs || []).forEach(p => addClient(p.clientName));
      (meas || []).forEach(m => addClient(m.clientName));

      setActiveClients(Array.from(clientMap.values()));

      // 2. EXTRACT ALL SUBCONTRACTORS
      const subMap = new Map();
      (subWOs || []).forEach(wo => {
        if (wo.subName) subMap.set(wo.subcontractorId, { id: wo.subcontractorId, name: wo.subName, trade: wo.trade });
      });
      setActiveSubs(Array.from(subMap.values()));

      // 3. PROCESS PHYSICAL MANUAL UPLOADS
      const processedDocs = (docs || []).map(d => {
        let linkedType = d.projectId ? 'Project' : 'General';
        let linkedId = d.projectId || '';
        let linkedName = d.projectName || 'General Document';
        let actualNotes = d.notes;

        if (d.notes && d.notes.startsWith('{') && d.notes.includes('"linkedType"')) {
          try {
            const parsed = JSON.parse(d.notes);
            linkedType = parsed.linkedType;
            linkedId = parsed.linkedId;
            linkedName = parsed.linkedName || parsed.text; 
            actualNotes = parsed.text;
          } catch(e) {}
        }
        return { ...d, linkedType, linkedId, linkedName, actualNotes, isVirtual: false };
      });

      // =========================================================
      // 4. THE AUTO-SYNC ENGINE (Generates UI files for records)
      // =========================================================
      const virtualDocs = [];

      const generateHtmlBlob = (title, data) => {
        let rows = '';
        for (const [key, value] of Object.entries(data)) {
            if (typeof value !== 'object' && key !== 'items' && key !== 'data') {
                rows += `<tr><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: 600; width: 35%; text-transform: capitalize; color: #4b5563;">${key.replace(/([A-Z])/g, ' $1').trim()}</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #111827;">${value || '-'}</td></tr>`;
            }
        }
        const html = `<html style="font-family: 'Inter', system-ui, sans-serif; padding: 40px; background: #f4f4f5;">
            <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 16px; border: 1px solid #e4e4e7; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                <h2 style="color: #18181b; border-bottom: 2px solid #f4f4f5; padding-bottom: 16px; margin-top: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 2px;">${title}</h2>
                <table style="width: 100%; border-collapse: collapse; margin-top: 24px; font-size: 13px; text-align: left;">
                    ${rows}
                </table>
                <p style="margin-top: 40px; font-size: 10px; font-weight: bold; color: #a1a1aa; text-align: center; text-transform: uppercase; letter-spacing: 1px;">Auto-Generated System Record • Jyanipur ERP Vault</p>
            </div>
        </html>`;
        return 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
      };

      (ests || []).forEach(est => {
          if (!est.clientName) return;
          virtualDocs.push({
              id: `v_est_${est.id}`, linkedType: 'Client', linkedId: est.clientName, linkedName: est.clientName,
              documentName: `Estimation: ${est.estimateNo}`, category: 'Estimations & Quotes', fileType: 'FILE',
              uploadedAt: est.date, actualNotes: `Total Amount: ₹${est.totalAmount.toLocaleString('en-IN')}`, isVirtual: true,
              fileUrl: generateHtmlBlob('Estimation Document', est)
          });
      });

      (invs || []).forEach(inv => {
          if (!inv.client) return;
          virtualDocs.push({
              id: `v_inv_${inv.id}`, linkedType: 'Client', linkedId: inv.client, linkedName: inv.client,
              documentName: `Tax Invoice: ${inv.invoiceNo}`, category: 'Bills & Invoices', fileType: 'FILE',
              uploadedAt: inv.date, actualNotes: `Invoice Value: ₹${inv.amount.toLocaleString('en-IN')}`, isVirtual: true,
              fileUrl: generateHtmlBlob('Tax Invoice', inv)
          });
      });

      (clientWOs || []).forEach(wo => {
          if (!wo.clientName) return;
          virtualDocs.push({
              id: `v_cwo_${wo.id}`, linkedType: 'Client', linkedId: wo.clientName, linkedName: wo.clientName,
              documentName: `Work Contract: ${wo.woNo}`, category: 'Contracts & Legal', fileType: 'FILE',
              uploadedAt: wo.date, actualNotes: `Assigned Project: ${wo.projectName}`, isVirtual: true,
              fileUrl: generateHtmlBlob('Client Work Order', wo)
          });
      });

      (meas || []).forEach(ms => {
          if (!ms.clientName) return;
          virtualDocs.push({
              id: `v_ms_${ms.id}`, linkedType: 'Client', linkedId: ms.clientName, linkedName: ms.clientName,
              documentName: `Measurement Sheet: ${ms.title}`, category: 'Measurement Sheets', fileType: 'FILE',
              uploadedAt: ms.date, actualNotes: `Project Site: ${ms.projectName}`, isVirtual: true,
              fileUrl: generateHtmlBlob('Joint Measurement Sheet', ms)
          });
      });

      setDocuments([...processedDocs, ...virtualDocs].sort((a,b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)));

    } catch (e) {
      console.error("Error loading Vault documents:", e);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const currentFolder = path[path.length - 1];

  const navigateTo = (folder) => {
    setPath(prev => [...prev, folder]);
    setSearchQuery('');
    setActiveCategory('All');
  };

  const navigateUp = (index) => {
    setPath(prev => prev.slice(0, index + 1));
    setSearchQuery('');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const extension = file.name.split('.').pop().toLowerCase();
      let detectedType = 'FILE';
      if (['pdf'].includes(extension)) detectedType = 'PDF';
      else if (['jpg', 'jpeg', 'png', 'webp', 'svg'].includes(extension)) detectedType = 'IMAGE';
      else if (['dwg', 'dxf'].includes(extension)) detectedType = 'DWG';

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          fileUrl: reader.result,
          documentName: prev.documentName || file.name.split('.')[0],
          fileType: detectedType
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLinkedEntityChange = (e) => {
    const id = e.target.value;
    let name = '';
    if (formData.linkedType === 'Project') name = projects.find(p => String(p.id) === String(id))?.name;
    if (formData.linkedType === 'Client') name = activeClients.find(c => String(c.id) === String(id))?.name;
    if (formData.linkedType === 'Subcontractor') name = activeSubs.find(s => String(s.id) === String(id))?.name;
    
    setFormData({...formData, linkedId: id, linkedName: name});
  };

  const openUploadModal = () => {
    let lType = 'General';
    let lId = '';
    let lName = '';

    if (currentFolder.type === 'FOLDER') {
      lType = currentFolder.entityType;
      lId = currentFolder.entityId;
      lName = currentFolder.name;
    }

    setFormData({
      linkedType: lType, linkedId: lId, linkedName: lName, documentName: '', 
      category: '2D Drawings', fileUrl: '', fileType: 'PDF', actualNotes: ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.fileUrl) { return alert("Please upload a file or paste a valid document link."); }
    if (['Project', 'Client', 'Subcontractor'].includes(formData.linkedType) && !formData.linkedId) {
      return alert("Please select the specific account to link this document to.");
    }
    
    setSubmitting(true);
    try {
      const payloadNotes = JSON.stringify({
        text: formData.actualNotes, linkedType: formData.linkedType,
        linkedId: formData.linkedId, linkedName: formData.linkedName
      });

      const payload = {
        projectId: formData.linkedType === 'Project' ? (Number(formData.linkedId) || formData.linkedId) : null,
        documentName: formData.documentName, category: formData.category, fileUrl: formData.fileUrl,
        fileType: formData.fileType, notes: payloadNotes, uploadedAt: new Date().toISOString().split('T')[0]
      };

      await saveVaultDocument(payload);
      setIsModalOpen(false);
      await loadData();
    } catch (err) { alert("Failed to save document to cloud vault."); }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Remove this document from the vault permanently?")) {
      setLoading(true);
      await deleteVaultDocument(id);
      await loadData();
    }
  };

  let displayDocs = [];
  if (currentFolder.type === 'FOLDER') {
    displayDocs = documents.filter(d => String(d.linkedType) === String(currentFolder.entityType) && String(d.linkedId) === String(currentFolder.entityId));
  } else if (currentFolder.type === 'GENERAL') {
    displayDocs = documents.filter(d => d.linkedType === 'General');
  } else if (currentFolder.type === 'ROOT' && searchQuery !== '') {
    displayDocs = documents; 
  }

  displayDocs = displayDocs.filter(doc => {
    const matchesCategory = activeCategory === 'All' || doc.category === activeCategory;
    const matchesSearch = searchQuery.trim() === '' || 
      (doc.documentName && doc.documentName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (doc.actualNotes && doc.actualNotes.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (doc.linkedName && doc.linkedName.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  const inputClass = "w-full px-4 py-3.5 rounded-lg border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 text-sm font-medium transition-all disabled:opacity-75 disabled:cursor-not-allowed";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-0.5";

  return (
    <div className="w-full h-full flex flex-col font-['Inter',sans-serif]">
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 mb-6 border-b border-zinc-200 shrink-0 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Document Vault Drive</h2>
          <p className="text-zinc-500 text-sm mt-1 font-medium">Auto-syncs all app records and stores physical uploads by Client/Project.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center h-10 bg-white border border-zinc-200 rounded-lg px-3.5 shadow-sm w-full md:w-auto focus-within:ring-2 focus-within:ring-zinc-900 transition-all">
            <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input 
              type="text" 
              placeholder={currentFolder.type === 'ROOT' ? "Global search files..." : `Search in ${currentFolder.name}...`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-sm font-medium text-zinc-800 outline-none px-2 w-48 placeholder:text-zinc-400"
            />
          </div>

          <div className="flex items-center bg-white border border-zinc-200 rounded-lg p-1 shadow-sm">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100'}`}
              title="Grid View"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${viewMode === 'list' ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100'}`}
              title="List View"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5m-16.5-7.5h16.5m-16.5-3.75h16.5" /></svg>
            </button>
          </div>

          <button onClick={openUploadModal} className="bg-zinc-900 hover:bg-black text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-2 h-10 tracking-wide border border-black">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Upload File
          </button>
        </div>
      </div>

      {/* DRIVE BREADCRUMBS & FILTERS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0">
        <div className="flex items-center gap-2 text-xs font-bold bg-white px-4 py-2.5 rounded-lg shadow-sm border border-zinc-200 uppercase tracking-widest">
          {path.map((folder, index) => (
            <React.Fragment key={index}>
              <button 
                onClick={() => navigateUp(index)}
                className={`transition-colors cursor-pointer ${index === path.length - 1 ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-900'}`}
              >
                {folder.name}
              </button>
              {index < path.length - 1 && <span className="text-zinc-300">/</span>}
            </React.Fragment>
          ))}
        </div>

        {(currentFolder.type === 'FOLDER' || currentFolder.type === 'GENERAL' || (currentFolder.type === 'ROOT' && searchQuery !== '')) && (
          <div className="flex bg-white p-1 rounded-lg shadow-sm border border-zinc-200 overflow-x-auto max-w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {categories.map(cat => (
              <button 
                key={cat} onClick={() => setActiveCategory(cat)} 
                className={`px-4 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all cursor-pointer ${activeCategory === cat ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* MAIN VAULT BODY */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {loading ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-sm flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin"></div>
            <p>Scanning App Ecosystem & Generating Drive...</p>
          </div>
        ) : (
          <div className="space-y-8 pb-10">
            
            {/* VIEW 1: ROOT DRIVE FOLDERS */}
            {currentFolder.type === 'ROOT' && searchQuery === '' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                <div onClick={() => navigateTo({type: 'CATEGORY', id: 'CLIENTS', name: 'Client Workspaces'})} className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all cursor-pointer group">
                  <span className="w-12 h-12 flex items-center justify-center bg-blue-50 text-blue-600 rounded-xl mb-4 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  </span>
                  <h3 className="font-bold text-zinc-900 text-lg">Client Workspaces</h3>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1.5">{activeClients.length} Linked Accounts</p>
                </div>
                
                <div onClick={() => navigateTo({type: 'CATEGORY', id: 'SUBS', name: 'Subcontractors'})} className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all cursor-pointer group">
                  <span className="w-12 h-12 flex items-center justify-center bg-amber-50 text-amber-600 rounded-xl mb-4 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  </span>
                  <h3 className="font-bold text-zinc-900 text-lg">Subcontractors</h3>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1.5">{activeSubs.length} Linked Agencies</p>
                </div>
                
                <div onClick={() => navigateTo({type: 'CATEGORY', id: 'PROJECTS', name: 'Project Sites'})} className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all cursor-pointer group">
                  <span className="w-12 h-12 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-xl mb-4 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                  </span>
                  <h3 className="font-bold text-zinc-900 text-lg">Project Sites</h3>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1.5">{projects.length} Active Sites</p>
                </div>
                
                <div onClick={() => navigateTo({type: 'GENERAL', name: 'General Documents'})} className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all cursor-pointer group">
                  <span className="w-12 h-12 flex items-center justify-center bg-zinc-100 text-zinc-600 rounded-xl mb-4 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                  </span>
                  <h3 className="font-bold text-zinc-900 text-lg">General Files</h3>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1.5">{documents.filter(d=>d.linkedType==='General').length} Uploads</p>
                </div>
              </div>
            )}

            {/* VIEW 2: CATEGORY EXPLORER */}
            {currentFolder.type === 'CATEGORY' && (
              <div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {currentFolder.id === 'CLIENTS' && activeClients.map(c => {
                    const docCount = documents.filter(d => d.linkedType === 'Client' && String(d.linkedId) === String(c.id)).length;
                    return (
                      <div key={c.id} onClick={() => navigateTo({type: 'FOLDER', entityType: 'Client', entityId: c.id, name: c.name})} className="bg-white border border-zinc-200 hover:border-zinc-400 rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between h-32">
                        <div className="flex justify-between items-start mb-2">
                          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                          </div>
                          <span className="text-[9px] font-bold text-zinc-500 bg-zinc-100 px-2 py-1 rounded border border-zinc-200 uppercase">{docCount} files</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-zinc-900 text-sm truncate group-hover:text-blue-600 transition-colors">{c.name}</h4>
                          <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Client Folder</p>
                        </div>
                      </div>
                    )
                  })}

                  {currentFolder.id === 'SUBS' && activeSubs.map(s => {
                    const docCount = documents.filter(d => d.linkedType === 'Subcontractor' && String(d.linkedId) === String(s.id)).length;
                    return (
                      <div key={s.id} onClick={() => navigateTo({type: 'FOLDER', entityType: 'Subcontractor', entityId: s.id, name: s.name})} className="bg-white border border-zinc-200 hover:border-zinc-400 rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between h-32">
                        <div className="flex justify-between items-start mb-2">
                          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                          </div>
                          <span className="text-[9px] font-bold text-zinc-500 bg-zinc-100 px-2 py-1 rounded border border-zinc-200 uppercase">{docCount} files</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-zinc-900 text-sm truncate group-hover:text-amber-600 transition-colors">{s.name}</h4>
                          <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-1">{s.trade}</p>
                        </div>
                      </div>
                    )
                  })}

                  {currentFolder.id === 'PROJECTS' && projects.map(p => {
                    const docCount = documents.filter(d => d.linkedType === 'Project' && String(d.linkedId) === String(p.id)).length;
                    return (
                      <div key={p.id} onClick={() => navigateTo({type: 'FOLDER', entityType: 'Project', entityId: p.id, name: p.name})} className="bg-white border border-zinc-200 hover:border-zinc-400 rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between h-32">
                        <div className="flex justify-between items-start mb-2">
                          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                          </div>
                          <span className="text-[9px] font-bold text-zinc-500 bg-zinc-100 px-2 py-1 rounded border border-zinc-200 uppercase">{docCount} files</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-zinc-900 text-sm truncate group-hover:text-emerald-600 transition-colors">{p.name}</h4>
                          <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Project Site</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* VIEW 3: DOCUMENTS DISPLAY */}
            {(currentFolder.type === 'FOLDER' || currentFolder.type === 'GENERAL' || (currentFolder.type === 'ROOT' && searchQuery !== '')) && (
              <div>
                {displayDocs.length === 0 ? (
                  <div className="bg-white border border-dashed border-zinc-300 rounded-2xl p-16 text-center">
                    <div className="text-4xl mb-3 opacity-50 flex justify-center">
                      <svg className="w-12 h-12 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    </div>
                    <h3 className="text-base font-bold text-zinc-900">Folder is Empty</h3>
                    <p className="text-sm text-zinc-500 mt-1 mb-4 font-medium">Click "Upload File" above to add documents here.</p>
                  </div>
                ) : viewMode === 'grid' ? (
                  
                  /* GRID VIEW */
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {displayDocs.map(doc => (
                      <div key={doc.id} className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative">
                        
                        {!doc.isVirtual && (
                          <button 
                            onClick={() => handleDelete(doc.id)} 
                            className="absolute top-3 right-3 text-red-400 hover:text-white bg-white hover:bg-red-500 border border-red-200 opacity-0 group-hover:opacity-100 transition-all cursor-pointer p-1.5 z-10 rounded-md shadow-sm"
                            title="Delete Document"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        )}

                        <div>
                          <div className="w-full h-32 rounded-lg bg-zinc-50 border border-zinc-100 mb-3 flex items-center justify-center overflow-hidden relative group/thumb">
                            {doc.fileType === 'IMAGE' && doc.fileUrl ? (
                              <img src={doc.fileUrl} alt={doc.documentName} className="w-full h-full object-cover" />
                            ) : doc.fileType === 'PDF' ? (
                              <div className="flex flex-col items-center gap-1 text-zinc-400">
                                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5-3h7.5M6 20.25h12a2.25 2.25 0 002.25-2.25V9.75A2.25 2.25 0 0018 7.5h-2.25a2.25 2.25 0 01-2.25-2.25V3a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 3v15A2.25 2.25 0 006 20.25z" /></svg>
                              </div>
                            ) : doc.fileType === 'DWG' ? (
                              <div className="flex flex-col items-center gap-1 text-zinc-400">
                                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091.705.087 1.343-.092 1.905m0 0l-2.07 2.07" /></svg>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-1 text-zinc-400">
                                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                              </div>
                            )}

                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                              <button onClick={() => setPreviewDoc(doc)} className="bg-white text-zinc-900 text-[10px] uppercase tracking-widest font-bold px-4 py-2 rounded-lg shadow-md hover:scale-105 transition-transform cursor-pointer">
                                Preview File
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                              doc.linkedType === 'Subcontractor' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              doc.linkedType === 'Client' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              doc.linkedType === 'Project' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              'bg-zinc-100 text-zinc-600 border-zinc-200'
                            }`}>
                              {doc.linkedType}
                            </span>
                            <span className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest">{doc.category}</span>
                          </div>

                          <h4 className="font-bold text-zinc-900 text-sm mb-1 truncate tracking-tight" title={doc.documentName}>{doc.documentName}</h4>
                          {doc.isVirtual && <p className="text-[8px] font-bold bg-zinc-900 text-white inline-block px-1.5 py-0.5 rounded mb-2 uppercase tracking-widest">Auto-Synced System File</p>}
                          {doc.actualNotes && <p className="text-[11px] text-zinc-500 line-clamp-2 mb-3 leading-tight">{doc.actualNotes}</p>}
                        </div>

                        <div className="pt-3 border-t border-zinc-100 flex justify-between items-center mt-2">
                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{doc.uploadedAt}</span>
                          <button onClick={() => setPreviewDoc(doc)} className="px-3 py-1.5 bg-zinc-100 text-zinc-900 hover:bg-zinc-900 hover:text-white rounded-md font-bold cursor-pointer text-[9px] uppercase tracking-widest transition-all">
                            Open
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                ) : (

                  /* LIST VIEW */
                  <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                      <thead>
                        <tr className="bg-zinc-50 text-zinc-500 text-[10px] uppercase tracking-widest font-bold border-b border-zinc-200">
                          <th className="py-4 px-6">Document Title</th>
                          <th className="py-4 px-6">Linked Account</th>
                          <th className="py-4 px-6">Category</th>
                          <th className="py-4 px-6">Date</th>
                          <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 text-sm">
                        {displayDocs.map(doc => (
                          <tr key={doc.id} className="hover:bg-zinc-50/50 transition-colors">
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <span className="text-zinc-400 flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-100">
                                  {doc.fileType === 'IMAGE' ? (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                  ) : doc.fileType === 'PDF' ? (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                  ) : doc.fileType === 'DWG' ? (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" /></svg>
                                  ) : (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                  )}
                                </span>
                                <div>
                                  <p className="font-bold text-zinc-900 text-sm flex items-center gap-2 tracking-tight">
                                    {doc.documentName} 
                                    {doc.isVirtual && <span className="bg-zinc-900 text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest">SYNCED</span>}
                                  </p>
                                  {doc.actualNotes && <p className="text-[11px] text-zinc-500 font-medium truncate max-w-xs mt-0.5">{doc.actualNotes}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                                doc.linkedType === 'Subcontractor' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                doc.linkedType === 'Client' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                doc.linkedType === 'Project' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                'bg-zinc-100 text-zinc-600 border-zinc-200'
                              }`}>
                                {doc.linkedType}
                              </span>
                              <p className="text-[11px] font-bold text-zinc-900 mt-1.5 truncate max-w-[150px]">{doc.linkedName}</p>
                            </td>
                            <td className="py-4 px-6">
                              <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">{doc.category}</span>
                            </td>
                            <td className="py-4 px-6 text-zinc-500 text-[11px] font-bold uppercase tracking-widest">{doc.uploadedAt}</td>
                            <td className="py-4 px-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => setPreviewDoc(doc)} className="px-3 py-1.5 bg-zinc-100 text-zinc-900 hover:bg-zinc-900 hover:text-white rounded-lg font-bold cursor-pointer text-[10px] uppercase tracking-widest transition-all">
                                  Preview
                                </button>
                                {!doc.isVirtual && (
                                  <button onClick={() => handleDelete(doc.id)} className="p-1.5 bg-white text-red-500 hover:bg-red-600 hover:text-white border border-red-200 shadow-sm rounded-lg transition-all cursor-pointer">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </div>

      {/* UPLOAD MODAL */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] border border-zinc-200">
            
            <div className="px-8 py-6 border-b border-zinc-200 flex justify-between items-center bg-white shrink-0">
              <div>
                <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Upload Document</h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Store files securely in the Vault</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 transition-colors cursor-pointer">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-8 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-[#F4F4F5]">
              <form id="uploadForm" onSubmit={handleSave} className="space-y-6">
                
                {/* Dynamic Linker */}
                <div className="grid grid-cols-2 gap-4 bg-white p-5 border border-zinc-200 rounded-xl shadow-sm">
                  <div>
                    <label className={labelClass}>Link Document To <span className="text-red-500">*</span></label>
                    <select 
                      value={formData.linkedType} 
                      onChange={(e) => setFormData({...formData, linkedType: e.target.value, linkedId: '', linkedName: ''})}
                      className={`${inputClass} font-bold text-zinc-900 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2318181B%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
                    >
                      <option value="General">General / Company</option>
                      <option value="Project">Project Site</option>
                      <option value="Client">Client Account</option>
                      <option value="Subcontractor">Subcontractor</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Select Account</label>
                    {formData.linkedType === 'General' ? (
                       <input disabled type="text" placeholder="Not Applicable" className={`${inputClass} bg-zinc-100 opacity-50`} />
                    ) : (
                      <select 
                        required 
                        value={formData.linkedId} 
                        onChange={handleLinkedEntityChange} 
                        className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2318181B%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
                      >
                        <option value="" disabled>Select {formData.linkedType}...</option>
                        {formData.linkedType === 'Project' && projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        {formData.linkedType === 'Client' && activeClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        {formData.linkedType === 'Subcontractor' && activeSubs.map(s => <option key={s.id} value={s.id}>{s.name} ({s.trade})</option>)}
                      </select>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Document Title <span className="text-red-500">*</span></label>
                    <input type="text" required value={formData.documentName} onChange={e => setFormData({...formData, documentName: e.target.value})} placeholder="e.g. Master Plan Rev 2" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Category</label>
                    <select 
                      value={formData.category} 
                      onChange={e => setFormData({...formData, category: e.target.value})} 
                      className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2318181B%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
                    >
                      {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Upload File (PDF, Image, DWG)</label>
                  <input 
                    type="file" 
                    accept="image/*,.pdf,.dwg,.dxf" 
                    onChange={handleFileUpload} 
                    className="w-full text-sm text-zinc-600 file:mr-4 file:py-3 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:uppercase file:tracking-wider file:bg-zinc-200 file:text-zinc-900 hover:file:bg-zinc-300 cursor-pointer border border-zinc-200 bg-white rounded-lg transition-all shadow-sm" 
                  />
                </div>

                <div>
                  <label className={labelClass}>Or Paste File / Drive URL</label>
                  <input type="text" value={formData.fileUrl} onChange={e => setFormData({...formData, fileUrl: e.target.value})} placeholder="https://drive.google.com/..." className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>Revision Comments / Notes</label>
                  <textarea value={formData.actualNotes} onChange={e => setFormData({...formData, actualNotes: e.target.value})} placeholder="Approved by client on Aug 18..." className={`${inputClass} resize-y min-h-[90px]`} />
                </div>
              </form>
            </div>

            <div className="px-8 py-5 border-t border-zinc-200 flex justify-end gap-3 bg-white shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-bold tracking-widest uppercase rounded-lg text-[10px] transition-all cursor-pointer">
                Cancel
              </button>
              <button type="submit" form="uploadForm" disabled={submitting} className="px-8 py-2.5 bg-zinc-900 hover:bg-black text-white font-bold tracking-widest uppercase rounded-lg text-[10px] shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2">
                {submitting ? (
                  <><svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg> Saving...</>
                ) : 'Save to Vault'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* FULLSCREEN DOCUMENT PREVIEW MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-md">
          <div className="bg-white w-full h-full max-w-6xl max-h-[92vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 border border-zinc-200">
            
            <div className="px-8 py-5 border-b border-zinc-200 flex justify-between items-center bg-white shrink-0">
              <div className="flex items-center gap-4">
                <span className="text-3xl opacity-80">
                  {previewDoc.fileType === 'IMAGE' ? '🖼️' : previewDoc.fileType === 'PDF' ? '📄' : previewDoc.fileType === 'DWG' ? '📐' : '📁'}
                </span>
                <div>
                  <h3 className="font-bold text-zinc-900 text-lg tracking-tight">{previewDoc.documentName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                      previewDoc.linkedType === 'Subcontractor' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      previewDoc.linkedType === 'Client' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      previewDoc.linkedType === 'Project' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      'bg-zinc-100 text-zinc-700 border-zinc-200'
                    }`}>
                      {previewDoc.linkedType}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{previewDoc.linkedName}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <a 
                  href={previewDoc.fileUrl} 
                  download={previewDoc.documentName} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="px-5 py-2.5 bg-zinc-900 hover:bg-black text-white rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-sm transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                  {previewDoc.isVirtual ? 'Open Record' : 'Download Original'}
                </a>
                <button 
                  onClick={() => setPreviewDoc(null)} 
                  className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-zinc-900 rounded-full hover:bg-zinc-100 transition-colors cursor-pointer"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            <div className="flex-1 bg-[#F4F4F5] p-6 flex items-center justify-center overflow-auto relative inner-shadow">
              {previewDoc.fileType === 'IMAGE' ? (
                <img src={previewDoc.fileUrl} alt={previewDoc.documentName} className="max-w-full max-h-full object-contain rounded-xl shadow-lg border border-zinc-200" />
              ) : (previewDoc.fileType === 'PDF' && previewDoc.fileUrl.startsWith('data:application/pdf')) || previewDoc.fileUrl.startsWith('data:text/html') ? (
                <iframe src={previewDoc.fileUrl} title={previewDoc.documentName} className="w-full h-full rounded-xl border border-zinc-200 bg-white shadow-md" />
              ) : (
                <div className="text-center p-10 bg-white rounded-2xl max-w-md shadow-lg border border-zinc-200">
                  <div className="w-16 h-16 bg-zinc-100 text-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-5 text-3xl border border-zinc-200">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" /></svg>
                  </div>
                  <h4 className="font-bold text-zinc-900 text-xl mb-2 tracking-tight">{previewDoc.documentName}</h4>
                  <p className="text-xs text-zinc-500 mb-8 leading-relaxed">
                    {previewDoc.fileType === 'DWG' ? 'CAD Drawing (.DWG/.DXF) files require local CAD software or AutoCAD Web to render natively.' : 'This file format cannot be rendered directly in the browser frame.'}
                  </p>
                  <a 
                    href={previewDoc.fileUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="inline-flex items-center gap-2 px-8 py-3.5 bg-zinc-900 text-white rounded-xl text-[11px] uppercase tracking-widest font-bold hover:bg-black transition-all shadow-sm"
                  >
                    Download File Instead
                  </a>
                </div>
              )}
            </div>

            {previewDoc.actualNotes && (
              <div className="px-8 py-4 bg-white border-t border-zinc-200 shrink-0">
                <p className="text-xs text-zinc-600 font-medium">
                  <span className="font-bold text-zinc-900 uppercase tracking-widest text-[10px] mr-2">Notes:</span> {previewDoc.actualNotes}
                </p>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}