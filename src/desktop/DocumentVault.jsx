import React, { useState, useEffect } from 'react';
import { 
  getVaultDocuments, saveVaultDocument, deleteVaultDocument, getProjects,
  getClientWorkOrders, getSubcontractorWorkOrders, getEstimations, getInvoices, 
  getMeasurementSheets, getSiteOperations, getSnags
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
        docs, projs, clientWOs, subWOs, ests, invs, meas, snags
      ] = await Promise.all([
        getVaultDocuments(),
        getProjects(),
        getClientWorkOrders ? getClientWorkOrders() : Promise.resolve([]),
        getSubcontractorWorkOrders ? getSubcontractorWorkOrders() : Promise.resolve([]),
        getEstimations ? getEstimations() : Promise.resolve([]),
        getInvoices ? getInvoices() : Promise.resolve([]),
        getMeasurementSheets ? getMeasurementSheets() : Promise.resolve([]),
        getSnags ? getSnags() : Promise.resolve([])
      ]);

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
            // Ignore nested objects/arrays, just print flat key-value pairs
            if (typeof value !== 'object' && key !== 'items' && key !== 'data') {
                rows += `<tr><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: 600; width: 35%; text-transform: capitalize; color: #4b5563;">${key.replace(/([A-Z])/g, ' $1').trim()}</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #111827;">${value || '-'}</td></tr>`;
            }
        }
        const html = `<html style="font-family: 'Segoe UI', system-ui, sans-serif; padding: 40px; background: #f3f4f6;">
            <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 16px; border: 1px solid #e5e7eb; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
                <h2 style="color: #b45309; border-bottom: 2px solid #fef3c7; padding-bottom: 16px; margin-top: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px;">${title}</h2>
                <table style="width: 100%; border-collapse: collapse; margin-top: 24px; font-size: 14px; text-align: left;">
                    ${rows}
                </table>
                <p style="margin-top: 40px; font-size: 11px; color: #9ca3af; text-align: center; text-transform: uppercase; letter-spacing: 1px;">Auto-Generated System Record • Jyanipur ERP Vault</p>
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

      (snags || []).forEach(sn => {
          const proj = (projs || []).find(p => p.id === sn.projectId);
          if (!proj || !proj.clientName) return;
          virtualDocs.push({
              id: `v_sn_${sn.id}`, linkedType: 'Client', linkedId: proj.clientName, linkedName: proj.clientName,
              documentName: `Snag Report: ${sn.title}`, category: 'Site Reports', fileType: sn.photoUrl ? 'IMAGE' : 'FILE',
              uploadedAt: sn.createdAt, actualNotes: `Status: ${sn.status} | Sub: ${sn.subcontractor}`, isVirtual: true,
              fileUrl: sn.photoUrl || generateHtmlBlob('Site Snag Report', sn)
          });
      });

      // Fast Parallel Fetch for Daily Site Reports (DPRs)
      const dprPromises = (projs || []).map(p => getSiteOperations(p.id || p._id).then(ops => ({ p, ops })).catch(() => null));
      const dprResults = await Promise.all(dprPromises);
      
      dprResults.forEach(res => {
        if (res && res.ops && res.ops.dprs) {
          res.ops.dprs.forEach(dpr => {
              const cName = res.p.clientName || 'Unassigned';
              if (dpr.photoLink) {
                  virtualDocs.push({
                      id: `v_dpr_p_${dpr.id}`, linkedType: 'Client', linkedId: cName, linkedName: cName,
                      documentName: `Site Progress Photo`, category: 'Site Photos', fileType: 'IMAGE',
                      uploadedAt: dpr.date, actualNotes: `Update: ${dpr.summary}`, isVirtual: true,
                      fileUrl: dpr.photoLink
                  });
              }
              virtualDocs.push({
                  id: `v_dpr_${dpr.id}`, linkedType: 'Client', linkedId: cName, linkedName: cName,
                  documentName: `Daily Report: ${dpr.date}`, category: 'Site Reports', fileType: 'FILE',
                  uploadedAt: dpr.date, actualNotes: dpr.summary, isVirtual: true,
                  fileUrl: generateHtmlBlob('Daily Progress Report', dpr)
              });
          });
        }
      });

      // Combine Manual Uploads + Auto-Synced Files
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

    // Smart Pre-fill if uploading inside a specific folder!
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

  // -----------------------------------------
  // FILTERING LOGIC FOR VAULT ENGINE
  // -----------------------------------------
  let displayDocs = [];
  if (currentFolder.type === 'FOLDER') {
    displayDocs = documents.filter(d => String(d.linkedType) === String(currentFolder.entityType) && String(d.linkedId) === String(currentFolder.entityId));
  } else if (currentFolder.type === 'GENERAL') {
    displayDocs = documents.filter(d => d.linkedType === 'General');
  } else if (currentFolder.type === 'ROOT' && searchQuery !== '') {
    displayDocs = documents; // Global search mode
  }

  displayDocs = displayDocs.filter(doc => {
    const matchesCategory = activeCategory === 'All' || doc.category === activeCategory;
    const matchesSearch = searchQuery.trim() === '' || 
      (doc.documentName && doc.documentName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (doc.actualNotes && doc.actualNotes.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (doc.linkedName && doc.linkedName.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-inset focus:ring-[#B45309] text-zinc-900 text-sm font-medium transition-all disabled:opacity-75 disabled:cursor-not-allowed";
  const labelClass = "block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 ml-0.5";

  return (
    <div className="w-full h-full flex flex-col" style={{ fontFamily: 'Poppins, sans-serif' }}>
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 mb-6 border-b border-zinc-200 shrink-0 gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Document Vault Drive</h2>
          <p className="text-zinc-500 text-sm mt-0.5 font-medium">Auto-syncs all app records and stores physical uploads by Client/Project.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center h-10 bg-white border border-zinc-200 rounded-xl px-3.5 shadow-sm w-full md:w-auto">
            <span className="text-sm text-zinc-400">🔍</span>
            <input 
              type="text" 
              placeholder={currentFolder.type === 'ROOT' ? "Global search files..." : `Search in ${currentFolder.name}...`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-sm font-medium text-zinc-800 outline-none px-2 w-48 placeholder:text-zinc-400"
            />
          </div>

          <div className="flex items-center bg-white border border-zinc-200 rounded-xl p-1 shadow-sm">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-amber-50 text-[#B45309]' : 'text-zinc-400 hover:text-zinc-700'}`}
              title="Grid View"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'list' ? 'bg-amber-50 text-[#B45309]' : 'text-zinc-400 hover:text-zinc-700'}`}
              title="List View"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5m-16.5-7.5h16.5m-16.5-3.75h16.5" /></svg>
            </button>
          </div>

          <button onClick={openUploadModal} className="bg-[#B45309] hover:bg-[#92400E] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer flex items-center gap-1.5 h-10">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Upload File
          </button>
        </div>
      </div>

      {/* DRIVE BREADCRUMBS & FILTERS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0">
        <div className="flex items-center gap-2 text-sm font-bold bg-white px-4 py-2 rounded-xl shadow-sm border border-zinc-200">
          {path.map((folder, index) => (
            <React.Fragment key={index}>
              <button 
                onClick={() => navigateUp(index)}
                className={`transition-colors cursor-pointer ${index === path.length - 1 ? 'text-[#B45309]' : 'text-zinc-400 hover:text-zinc-800'}`}
              >
                {folder.name}
              </button>
              {index < path.length - 1 && <span className="text-zinc-300">/</span>}
            </React.Fragment>
          ))}
        </div>

        {(currentFolder.type === 'FOLDER' || currentFolder.type === 'GENERAL' || (currentFolder.type === 'ROOT' && searchQuery !== '')) && (
          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-zinc-200 overflow-x-auto max-w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {categories.map(cat => (
              <button 
                key={cat} onClick={() => setActiveCategory(cat)} 
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${activeCategory === cat ? 'bg-[#B45309] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
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
            <div className="w-10 h-10 border-4 border-zinc-200 border-t-[#B45309] rounded-full animate-spin"></div>
            <p>Scanning App Ecosystem & Generating Drive...</p>
          </div>
        ) : (
          <div className="space-y-8 pb-10">
            
            {/* VIEW 1: ROOT DRIVE FOLDERS */}
            {currentFolder.type === 'ROOT' && searchQuery === '' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                <div onClick={() => navigateTo({type: 'CATEGORY', id: 'CLIENTS', name: 'Client Workspaces'})} className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                  <span className="text-4xl mb-4 block group-hover:scale-110 transition-transform">🤝</span>
                  <h3 className="font-bold text-blue-900 text-lg">Client Workspaces</h3>
                  <p className="text-xs text-blue-600 font-semibold mt-1">{activeClients.length} Linked Accounts</p>
                </div>
                
                <div onClick={() => navigateTo({type: 'CATEGORY', id: 'SUBS', name: 'Subcontractors'})} className="bg-gradient-to-br from-amber-50 to-white border border-amber-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                  <span className="text-4xl mb-4 block group-hover:scale-110 transition-transform">👷</span>
                  <h3 className="font-bold text-amber-900 text-lg">Subcontractors</h3>
                  <p className="text-xs text-amber-600 font-semibold mt-1">{activeSubs.length} Linked Agencies</p>
                </div>
                
                <div onClick={() => navigateTo({type: 'CATEGORY', id: 'PROJECTS', name: 'Project Sites'})} className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                  <span className="text-4xl mb-4 block group-hover:scale-110 transition-transform">🏢</span>
                  <h3 className="font-bold text-emerald-900 text-lg">Project Sites</h3>
                  <p className="text-xs text-emerald-600 font-semibold mt-1">{projects.length} Active Sites</p>
                </div>
                
                <div onClick={() => navigateTo({type: 'GENERAL', name: 'General Documents'})} className="bg-gradient-to-br from-zinc-100 to-white border border-zinc-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                  <span className="text-4xl mb-4 block group-hover:scale-110 transition-transform">📁</span>
                  <h3 className="font-bold text-zinc-900 text-lg">General Files</h3>
                  <p className="text-xs text-zinc-500 font-semibold mt-1">{documents.filter(d=>d.linkedType==='General').length} Uploads</p>
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
                      <div key={c.id} onClick={() => navigateTo({type: 'FOLDER', entityType: 'Client', entityId: c.id, name: c.name})} className="bg-white border border-blue-200 hover:border-blue-400 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between h-32">
                        <div className="flex justify-between items-start mb-2">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl group-hover:scale-105 transition-transform">📁</div>
                          <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">{docCount} files</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-zinc-900 text-sm truncate group-hover:text-blue-700 transition-colors">{c.name}</h4>
                          <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider mt-0.5">Client Folder</p>
                        </div>
                      </div>
                    )
                  })}

                  {currentFolder.id === 'SUBS' && activeSubs.map(s => {
                    const docCount = documents.filter(d => d.linkedType === 'Subcontractor' && String(d.linkedId) === String(s.id)).length;
                    return (
                      <div key={s.id} onClick={() => navigateTo({type: 'FOLDER', entityType: 'Subcontractor', entityId: s.id, name: s.name})} className="bg-white border border-amber-200 hover:border-amber-400 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between h-32">
                        <div className="flex justify-between items-start mb-2">
                          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl group-hover:scale-105 transition-transform">📁</div>
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{docCount} files</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-zinc-900 text-sm truncate group-hover:text-amber-700 transition-colors">{s.name}</h4>
                          <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wider mt-0.5">{s.trade}</p>
                        </div>
                      </div>
                    )
                  })}

                  {currentFolder.id === 'PROJECTS' && projects.map(p => {
                    const docCount = documents.filter(d => d.linkedType === 'Project' && String(d.linkedId) === String(p.id)).length;
                    return (
                      <div key={p.id} onClick={() => navigateTo({type: 'FOLDER', entityType: 'Project', entityId: p.id, name: p.name})} className="bg-white border border-emerald-200 hover:border-emerald-400 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between h-32">
                        <div className="flex justify-between items-start mb-2">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl group-hover:scale-105 transition-transform">📁</div>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{docCount} files</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-zinc-900 text-sm truncate group-hover:text-emerald-700 transition-colors">{p.name}</h4>
                          <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider mt-0.5">Project Site</p>
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
                    <div className="text-4xl mb-3">📭</div>
                    <h3 className="text-base font-bold text-zinc-900">Folder is Empty</h3>
                    <p className="text-sm text-zinc-500 mt-1 mb-4 font-medium">Click "Upload Document" above to add files here.</p>
                  </div>
                ) : viewMode === 'grid' ? (
                  
                  /* GRID VIEW */
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {displayDocs.map(doc => (
                      <div key={doc.id} className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative">
                        
                        {!doc.isVirtual && (
                          <button 
                            onClick={() => handleDelete(doc.id)} 
                            className="absolute top-3 right-3 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1 z-10 bg-white/80 rounded-lg"
                            title="Delete Document"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        )}

                        <div>
                          <div className="w-full h-32 rounded-xl bg-zinc-50 border border-zinc-100 mb-3 flex items-center justify-center overflow-hidden relative group/thumb">
                            {doc.fileType === 'IMAGE' && doc.fileUrl ? (
                              <img src={doc.fileUrl} alt={doc.documentName} className="w-full h-full object-cover" />
                            ) : doc.fileType === 'PDF' ? (
                              <div className="flex flex-col items-center gap-1 text-red-500">
                                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5-3h7.5M6 20.25h12a2.25 2.25 0 002.25-2.25V9.75A2.25 2.25 0 0018 7.5h-2.25a2.25 2.25 0 01-2.25-2.25V3a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 3v15A2.25 2.25 0 006 20.25z" /></svg>
                              </div>
                            ) : doc.fileType === 'DWG' ? (
                              <div className="flex flex-col items-center gap-1 text-blue-600">
                                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091.705.087 1.343-.092 1.905m0 0l-2.07 2.07" /></svg>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-1 text-zinc-400">
                                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                              </div>
                            )}

                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                              <button onClick={() => setPreviewDoc(doc)} className="bg-white text-zinc-900 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm hover:bg-amber-50 hover:text-[#B45309] transition-colors cursor-pointer">
                                Quick Preview
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                              doc.linkedType === 'Subcontractor' ? 'bg-amber-100 text-amber-700' :
                              doc.linkedType === 'Client' ? 'bg-blue-100 text-blue-700' :
                              doc.linkedType === 'Project' ? 'bg-emerald-100 text-emerald-700' :
                              'bg-zinc-100 text-zinc-600'
                            }`}>
                              {doc.linkedType}
                            </span>
                            <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">{doc.category}</span>
                          </div>

                          <h4 className="font-bold text-zinc-900 text-sm mb-1 truncate" title={doc.documentName}>{doc.documentName}</h4>
                          {doc.isVirtual && <p className="text-[10px] font-bold bg-amber-50 text-[#B45309] inline-block px-2 py-0.5 rounded-md mb-2">Auto-Synced System File</p>}
                          {doc.actualNotes && <p className="text-xs text-zinc-500 line-clamp-2 mb-3 leading-tight">{doc.actualNotes}</p>}
                        </div>

                        <div className="pt-3 border-t border-zinc-100 flex justify-between items-center mt-2">
                          <span className="text-[10px] text-zinc-400 font-medium">{doc.uploadedAt}</span>
                          <button onClick={() => setPreviewDoc(doc)} className="px-3 py-1.5 bg-zinc-50 text-zinc-600 hover:bg-[#B45309] hover:text-white hover:border-[#B45309] border border-zinc-200 rounded-lg font-bold cursor-pointer text-[10px] uppercase tracking-widest transition-all">
                            View File
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                ) : (

                  /* LIST VIEW */
                  <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                      <thead>
                        <tr className="bg-zinc-50/80 text-zinc-500 text-[10px] uppercase tracking-wider border-b border-zinc-200">
                          <th className="py-3.5 px-6 font-semibold">Document Title</th>
                          <th className="py-3.5 px-6 font-semibold">Linked Account</th>
                          <th className="py-3.5 px-6 font-semibold">Category</th>
                          <th className="py-3.5 px-6 font-semibold">Date</th>
                          <th className="py-3.5 px-6 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 text-sm">
                        {displayDocs.map(doc => (
                          <tr key={doc.id} className="hover:bg-zinc-50 transition-colors">
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <span className="text-xl">
                                  {doc.fileType === 'IMAGE' ? '🖼️' : doc.fileType === 'PDF' ? '📄' : doc.fileType === 'DWG' ? '📐' : '📁'}
                                </span>
                                <div>
                                  <p className="font-bold text-zinc-900 text-sm flex items-center gap-2">
                                    {doc.documentName} 
                                    {doc.isVirtual && <span className="bg-amber-50 text-[#B45309] text-[9px] px-1.5 py-0.5 rounded border border-amber-200">SYNCED</span>}
                                  </p>
                                  {doc.actualNotes && <p className="text-[11px] text-zinc-500 font-medium truncate max-w-xs">{doc.actualNotes}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                doc.linkedType === 'Subcontractor' ? 'bg-amber-100 text-amber-700' :
                                doc.linkedType === 'Client' ? 'bg-blue-100 text-blue-700' :
                                doc.linkedType === 'Project' ? 'bg-emerald-100 text-emerald-700' :
                                'bg-zinc-100 text-zinc-600'
                              }`}>
                                {doc.linkedType}
                              </span>
                              <p className="text-[11px] font-bold text-zinc-800 mt-1 truncate max-w-[150px]">{doc.linkedName}</p>
                            </td>
                            <td className="py-4 px-6">
                              <span className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">{doc.category}</span>
                            </td>
                            <td className="py-4 px-6 text-zinc-500 text-sm font-medium">{doc.uploadedAt}</td>
                            <td className="py-4 px-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => setPreviewDoc(doc)} className="px-3 py-1.5 bg-amber-50 text-[#B45309] hover:bg-[#B45309] hover:text-white border border-amber-200/60 rounded-lg font-bold cursor-pointer text-[10px] uppercase tracking-widest transition-all">
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-5 border-b border-zinc-200 flex justify-between items-center bg-zinc-50 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Upload Document</h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Link files to your accounts</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer p-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <form id="uploadForm" onSubmit={handleSave} className="space-y-4">
                
                {/* Dynamic Linker */}
                <div className="grid grid-cols-2 gap-4 bg-zinc-50 p-4 border border-zinc-200 rounded-xl">
                  <div>
                    <label className={labelClass}>Link Document To <span className="text-red-500">*</span></label>
                    <select 
                      value={formData.linkedType} 
                      onChange={(e) => setFormData({...formData, linkedType: e.target.value, linkedId: '', linkedName: ''})}
                      className={`${inputClass} font-bold text-[#B45309] cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
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
                        className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
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
                      className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
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
                    className="w-full text-sm text-zinc-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 cursor-pointer border border-zinc-200 rounded-xl" 
                  />
                </div>

                <div>
                  <label className={labelClass}>Or Paste File / Google Drive URL</label>
                  <input type="text" value={formData.fileUrl} onChange={e => setFormData({...formData, fileUrl: e.target.value})} placeholder="https://drive.google.com/..." className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>Revision Comments / Notes</label>
                  <textarea value={formData.actualNotes} onChange={e => setFormData({...formData, actualNotes: e.target.value})} placeholder="Approved by client on Aug 18..." className={`${inputClass} resize-y min-h-[70px]`} />
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-zinc-200 flex justify-end gap-3 bg-zinc-50 shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-bold tracking-widest uppercase rounded-xl text-[10px] transition-all cursor-pointer shadow-sm">
                Cancel
              </button>
              <button type="submit" form="uploadForm" disabled={submitting} className="px-6 py-2.5 bg-[#B45309] hover:bg-[#92400E] text-white font-bold tracking-widest uppercase rounded-xl text-[10px] shadow-sm transition-all cursor-pointer disabled:opacity-50">
                {submitting ? 'Saving to Vault...' : 'Save to Vault'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* FULLSCREEN DOCUMENT PREVIEW MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-8 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white w-full h-full max-w-6xl max-h-[92vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            
            <div className="px-6 py-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50 shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {previewDoc.fileType === 'IMAGE' ? '🖼️' : previewDoc.fileType === 'PDF' ? '📄' : previewDoc.fileType === 'DWG' ? '📐' : '📁'}
                </span>
                <div>
                  <h3 className="font-bold text-zinc-900 text-base">{previewDoc.documentName}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      previewDoc.linkedType === 'Subcontractor' ? 'bg-amber-100 text-amber-700' :
                      previewDoc.linkedType === 'Client' ? 'bg-blue-100 text-blue-700' :
                      previewDoc.linkedType === 'Project' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-zinc-200 text-zinc-700'
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
                  className="px-4 py-2 bg-[#B45309] hover:bg-[#92400E] text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-sm transition-all flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                  {previewDoc.isVirtual ? 'Open Auto-Record' : 'Download Original'}
                </a>
                <button 
                  onClick={() => setPreviewDoc(null)} 
                  className="p-2 text-zinc-400 hover:text-zinc-800 rounded-xl hover:bg-zinc-200 transition-colors cursor-pointer border border-transparent"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            <div className="flex-1 bg-zinc-900/95 p-4 flex items-center justify-center overflow-auto relative">
              {previewDoc.fileType === 'IMAGE' ? (
                <img src={previewDoc.fileUrl} alt={previewDoc.documentName} className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
              ) : (previewDoc.fileType === 'PDF' && previewDoc.fileUrl.startsWith('data:application/pdf')) || previewDoc.fileUrl.startsWith('data:text/html') ? (
                <iframe src={previewDoc.fileUrl} title={previewDoc.documentName} className="w-full h-full rounded-lg border-0 bg-white" />
              ) : (
                <div className="text-center p-8 bg-white rounded-2xl max-w-md shadow-xl border border-zinc-200">
                  <div className="w-16 h-16 bg-amber-50 text-[#B45309] rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">
                    📐
                  </div>
                  <h4 className="font-bold text-zinc-900 text-lg mb-1">{previewDoc.documentName}</h4>
                  <p className="text-xs text-zinc-500 mb-6">
                    {previewDoc.fileType === 'DWG' ? 'CAD Drawing (.DWG/.DXF) files require local CAD software or AutoCAD Web to render natively.' : 'This file format cannot be rendered directly in the browser frame.'}
                  </p>
                  <a 
                    href={previewDoc.fileUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#B45309] text-white rounded-xl text-[10px] uppercase tracking-widest font-bold hover:bg-[#92400E] transition-all"
                  >
                    Open / Download File
                  </a>
                </div>
              )}
            </div>

            {previewDoc.actualNotes && (
              <div className="px-6 py-3 bg-white border-t border-zinc-200 shrink-0">
                <p className="text-xs text-zinc-600 font-medium">
                  <span className="font-bold text-[#B45309]">Notes / Details:</span> {previewDoc.actualNotes}
                </p>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}