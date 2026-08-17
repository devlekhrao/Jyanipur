import React, { useState, useEffect } from 'react';
import { getVaultDocuments, saveVaultDocument, deleteVaultDocument, getProjects } from '../db';

export default function DocumentVault() {
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [projects, setProjects] = useState([]);
  
  // Navigation & Filter States
  const [currentFolder, setCurrentFolder] = useState('ALL'); // 'ALL' or projectId
  const [activeCategory, setActiveCategory] = useState('All');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isUploadOpen, setIsModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null); // For inline PDF/Image viewer

  const [formData, setFormData] = useState({
    projectId: '', 
    documentName: '', 
    category: '2D Drawings', 
    fileUrl: '', 
    fileType: 'PDF', 
    notes: ''
  });

  const categories = ['All', '2D Drawings', '3D Renders', 'Client Approvals', 'Contracts & Legal', 'Site Photos'];

  const loadData = async () => {
    setLoading(true);
    try {
      const [docs, projs] = await Promise.all([getVaultDocuments(), getProjects()]);
      setDocuments(docs || []);
      setProjects(projs || []);
    } catch (e) {
      console.warn("Ensure getVaultDocuments and getProjects exist in db.js");
      setDocuments([]);
      setProjects([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

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

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.fileUrl) {
      alert("Please upload a file or paste a valid document link.");
      return;
    }
    
    // Attach project name for quick rendering
    const selectedProj = projects.find(p => p.id === Number(formData.projectId));
    const payload = {
      ...formData,
      projectId: formData.projectId ? Number(formData.projectId) : '',
      projectName: selectedProj ? selectedProj.name : 'General Document',
      uploadedAt: new Date().toISOString().split('T')[0]
    };

    await saveVaultDocument(payload);
    setIsModalOpen(false);
    setFormData({ projectId: currentFolder !== 'ALL' ? currentFolder : '', documentName: '', category: '2D Drawings', fileUrl: '', fileType: 'PDF', notes: '' });
    await loadData();
  };

  const handleDelete = async (id) => {
    if (window.confirm("Remove this document from the vault?")) {
      await deleteVaultDocument(id);
      await loadData();
    }
  };

  // Filter Logic
  const filteredDocs = documents.filter(doc => {
    const matchesFolder = currentFolder === 'ALL' || doc.projectId === Number(currentFolder);
    const matchesCategory = activeCategory === 'All' || doc.category === activeCategory;
    const matchesSearch = searchQuery.trim() === '' || 
      (doc.documentName && doc.documentName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (doc.notes && doc.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesFolder && matchesCategory && matchesSearch;
  });

  const activeProjectObj = projects.find(p => p.id === Number(currentFolder));

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-inset focus:ring-[#B45309] text-zinc-900 text-sm font-medium transition-all disabled:opacity-75 disabled:cursor-not-allowed";
  const labelClass = "block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 ml-0.5";

  return (
    <div className="w-full h-full flex flex-col" style={{ fontFamily: 'Poppins, sans-serif' }}>
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 mb-6 border-b border-zinc-200 shrink-0 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Document Vault & Drawings Drive</h2>
            {currentFolder !== 'ALL' && (
              <span className="bg-amber-50 text-[#B45309] border border-amber-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                {activeProjectObj?.name || 'Folder'}
              </span>
            )}
          </div>
          <p className="text-zinc-500 text-sm mt-0.5 font-medium">Store 2D layout drawings, DWG files, 3D renders, contracts, and site photos.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="flex items-center h-10 bg-white border border-zinc-200 rounded-xl px-3.5 shadow-sm w-full md:w-auto">
            <span className="text-sm text-zinc-400">🔍</span>
            <input 
              type="text" 
              placeholder="Search drawings, files..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-sm font-medium text-zinc-800 outline-none px-2 w-48 placeholder:text-zinc-400"
            />
          </div>

          {/* View Toggle */}
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

          <button 
            onClick={() => {
              setFormData({ projectId: currentFolder !== 'ALL' ? currentFolder : '', documentName: '', category: '2D Drawings', fileUrl: '', fileType: 'PDF', notes: '' });
              setIsModalOpen(true);
            }} 
            className="bg-[#B45309] hover:bg-[#92400E] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer flex items-center gap-1.5 h-10"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Upload Document
          </button>
        </div>
      </div>

      {/* BREADCRUMB & CATEGORY FILTER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0">
        
        {/* Breadcrumb Folder Navigation */}
        <div className="flex items-center gap-2 text-sm font-semibold">
          <button 
            onClick={() => { setCurrentFolder('ALL'); setActiveCategory('All'); }}
            className={`flex items-center gap-1.5 transition-colors cursor-pointer ${currentFolder === 'ALL' ? 'text-[#B45309] font-bold' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
            All Vault Folders
          </button>

          {currentFolder !== 'ALL' && (
            <>
              <span className="text-zinc-300">/</span>
              <span className="text-zinc-900 font-bold flex items-center gap-1.5">
                <svg className="w-4 h-4 text-[#B45309]" fill="currentColor" viewBox="0 0 24 24"><path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15zM1.5 10.125V6a3 3 0 013-3h5.25a3 3 0 012.121.879l.879.879a1.5 1.5 0 001.06.442H19.5a3 3 0 013 3v2.925a4.5 4.5 0 00-3-.925h-15a4.5 4.5 0 00-3 .925z" /></svg>
                {activeProjectObj?.name}
              </span>
            </>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-zinc-200 overflow-x-auto max-w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {categories.map(cat => (
            <button 
              key={cat} 
              onClick={() => setActiveCategory(cat)} 
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === cat ? 'bg-[#B45309] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN VAULT BODY */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {loading ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-sm flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-4 border-zinc-200 border-t-[#B45309] rounded-full animate-spin"></div>
            <p>Loading Vault files...</p>
          </div>
        ) : (
          <div className="space-y-8 pb-10">
            
            {/* 1. PROJECT FOLDERS SECTION (Visible when in root 'ALL' folder) */}
            {currentFolder === 'ALL' && activeCategory === 'All' && searchQuery === '' && (
              <div>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Project Folders</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {projects.map(p => {
                    const docCount = documents.filter(d => d.projectId === p.id).length;
                    
                    return (
                      <div 
                        key={p.id} 
                        onClick={() => setCurrentFolder(p.id)}
                        className="bg-white border border-zinc-200 hover:border-[#B45309]/50 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#B45309] flex items-center justify-center group-hover:scale-105 transition-transform">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15zM1.5 10.125V6a3 3 0 013-3h5.25a3 3 0 012.121.879l.879.879a1.5 1.5 0 001.06.442H19.5a3 3 0 013 3v2.925a4.5 4.5 0 00-3-.925h-15a4.5 4.5 0 00-3 .925z" />
                            </svg>
                          </div>
                          <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
                            {docCount} files
                          </span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-zinc-900 text-sm truncate group-hover:text-[#B45309] transition-colors">{p.name}</h4>
                          <p className="text-[11px] text-zinc-400 font-medium truncate mt-0.5">{p.clientName || 'General Project'}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. DOCUMENTS DISPLAY SECTION */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                  {currentFolder === 'ALL' ? 'All Files & Drawings' : `${activeProjectObj?.name} Files`}
                </h3>
                <span className="text-xs text-zinc-400 font-medium">{filteredDocs.length} items found</span>
              </div>

              {filteredDocs.length === 0 ? (
                <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center text-zinc-400 text-sm font-medium">
                  No documents found in this folder. Click "+ Upload Document" above.
                </div>
              ) : viewMode === 'grid' ? (
                
                /* GRID VIEW */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredDocs.map(doc => (
                    <div key={doc.id} className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative">
                      <button 
                        onClick={() => handleDelete(doc.id)} 
                        className="absolute top-3 right-3 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1"
                        title="Delete Document"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>

                      <div>
                        {/* File Thumbnail or Icon Header */}
                        <div className="w-full h-32 rounded-xl bg-zinc-50 border border-zinc-100 mb-3 flex items-center justify-center overflow-hidden relative group/thumb">
                          {doc.fileType === 'IMAGE' && doc.fileUrl ? (
                            <img src={doc.fileUrl} alt={doc.documentName} className="w-full h-full object-cover" />
                          ) : doc.fileType === 'PDF' ? (
                            <div className="flex flex-col items-center gap-1 text-red-500">
                              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5-3h7.5M6 20.25h12a2.25 2.25 0 002.25-2.25V9.75A2.25 2.25 0 0018 7.5h-2.25a2.25 2.25 0 01-2.25-2.25V3a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 3v15A2.25 2.25 0 006 20.25z" /></svg>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-red-600">PDF Document</span>
                            </div>
                          ) : doc.fileType === 'DWG' ? (
                            <div className="flex flex-col items-center gap-1 text-blue-600">
                              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091.705.087 1.343-.092 1.905m0 0l-2.07 2.07" /></svg>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">CAD Drawing</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1 text-zinc-400">
                              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">File</span>
                            </div>
                          )}

                          {/* Overlay Quick View Button */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                            <button 
                              onClick={() => setPreviewDoc(doc)} 
                              className="bg-white text-zinc-900 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm hover:bg-amber-50 hover:text-[#B45309] transition-colors cursor-pointer"
                            >
                              Quick Preview
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="bg-zinc-100 text-zinc-600 text-[9px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider">{doc.category}</span>
                          <span className="text-[10px] text-zinc-400 font-medium">{doc.uploadedAt}</span>
                        </div>

                        <h4 className="font-semibold text-zinc-900 text-sm mb-1 truncate" title={doc.documentName}>{doc.documentName}</h4>
                        <p className="text-[11px] font-medium text-[#B45309] truncate mb-2">{doc.projectName || 'General Document'}</p>
                        {doc.notes && <p className="text-xs text-zinc-500 line-clamp-2 mb-3">{doc.notes}</p>}
                      </div>

                      <div className="pt-3 border-t border-zinc-100 flex justify-between items-center mt-2">
                        <button 
                          onClick={() => setPreviewDoc(doc)} 
                          className="px-2.5 py-1 bg-amber-50 text-[#B45309] hover:bg-[#B45309] hover:text-white border border-amber-200/60 rounded-lg font-semibold cursor-pointer text-[11px] uppercase tracking-wider transition-all"
                        >
                          View
                        </button>
                        <a 
                          href={doc.fileUrl} 
                          download={doc.documentName} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="px-2.5 py-1 bg-zinc-50 text-zinc-600 hover:bg-zinc-200 border border-zinc-200 rounded-lg font-semibold cursor-pointer text-[11px] uppercase tracking-wider transition-all"
                        >
                          Download
                        </a>
                      </div>
                    </div>
                  ))}
                </div>

              ) : (

                /* LIST VIEW */
                <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="bg-zinc-50/80 text-zinc-500 text-[11px] uppercase tracking-wider border-b border-zinc-200">
                        <th className="py-3.5 px-6 font-semibold">Document Title</th>
                        <th className="py-3.5 px-6 font-semibold">Project</th>
                        <th className="py-3.5 px-6 font-semibold">Category</th>
                        <th className="py-3.5 px-6 font-semibold">Uploaded Date</th>
                        <th className="py-3.5 px-6 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 text-sm">
                      {filteredDocs.map(doc => (
                        <tr key={doc.id} className="hover:bg-zinc-50 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <span className="text-xl">
                                {doc.fileType === 'IMAGE' ? '🖼️' : doc.fileType === 'PDF' ? '📄' : doc.fileType === 'DWG' ? '📐' : '📁'}
                              </span>
                              <div>
                                <p className="font-semibold text-zinc-900">{doc.documentName}</p>
                                {doc.notes && <p className="text-[11px] text-zinc-400 font-medium truncate max-w-xs">{doc.notes}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 font-medium text-sm text-[#B45309]">{doc.projectName || 'General'}</td>
                          <td className="py-4 px-6">
                            <span className="bg-zinc-100 text-zinc-600 text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider">
                              {doc.category}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-zinc-500 text-sm">{doc.uploadedAt}</td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => setPreviewDoc(doc)} 
                                className="px-3 py-1.5 bg-amber-50 text-[#B45309] hover:bg-[#B45309] hover:text-white border border-amber-200/60 rounded-lg font-semibold cursor-pointer text-[11px] uppercase tracking-wider transition-all"
                              >
                                View
                              </button>
                              <a 
                                href={doc.fileUrl} 
                                download={doc.documentName} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="px-3 py-1.5 bg-zinc-50 text-zinc-600 hover:bg-zinc-200 border border-zinc-200 rounded-lg font-semibold cursor-pointer text-[11px] uppercase tracking-wider transition-all"
                              >
                                Download
                              </a>
                              <button 
                                onClick={() => handleDelete(doc.id)} 
                                className="p-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 rounded-lg transition-all"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              )}
            </div>

          </div>
        )}
      </div>

      {/* UPLOAD MODAL */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-5 border-b border-zinc-200 flex justify-between items-center bg-zinc-50 shrink-0">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900">Add Document to Vault</h2>
                <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mt-0.5">Store 2D layouts, DWGs, renders, and site photos</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <form id="uploadForm" onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className={labelClass}>Project Site</label>
                  <select 
                    value={formData.projectId} 
                    onChange={e => setFormData({...formData, projectId: e.target.value})} 
                    className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
                  >
                    <option value="">General Company Document</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
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

                <div>
                  <label className={labelClass}>Document Title <span className="text-red-500">*</span></label>
                  <input type="text" required value={formData.documentName} onChange={e => setFormData({...formData, documentName: e.target.value})} placeholder="e.g. Master Plan Rev 2" className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>Upload File (PDF, Image, DWG)</label>
                  <input 
                    type="file" 
                    accept="image/*,.pdf,.dwg,.dxf" 
                    onChange={handleFileUpload} 
                    className="w-full text-sm text-zinc-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#B45309] file:text-white hover:file:bg-[#92400E] cursor-pointer" 
                  />
                </div>

                <div>
                  <label className={labelClass}>Or Paste File / Google Drive URL</label>
                  <input type="text" value={formData.fileUrl} onChange={e => setFormData({...formData, fileUrl: e.target.value})} placeholder="https://drive.google.com/..." className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>Revision Comments / Notes</label>
                  <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Approved by client on Aug 18..." className={`${inputClass} resize-y min-h-[70px]`} />
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-zinc-200 flex justify-end gap-3 bg-zinc-50 shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-semibold rounded-xl text-sm transition-all cursor-pointer">
                Cancel
              </button>
              <button type="submit" form="uploadForm" className="px-6 py-2.5 bg-[#B45309] hover:bg-[#92400E] text-white font-medium rounded-xl text-sm shadow-sm transition-all cursor-pointer">
                Save to Vault
              </button>
            </div>

          </div>
        </div>
      )}

      {/* FULLSCREEN DOCUMENT & DRAWING PREVIEW MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-8 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white w-full h-full max-w-6xl max-h-[92vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50 shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {previewDoc.fileType === 'IMAGE' ? '🖼️' : previewDoc.fileType === 'PDF' ? '📄' : previewDoc.fileType === 'DWG' ? '📐' : '📁'}
                </span>
                <div>
                  <h3 className="font-bold text-zinc-900 text-base">{previewDoc.documentName}</h3>
                  <p className="text-xs text-zinc-500 font-medium">
                    {previewDoc.projectName} • <span className="text-[#B45309] uppercase">{previewDoc.category}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <a 
                  href={previewDoc.fileUrl} 
                  download={previewDoc.documentName} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="px-4 py-2 bg-[#B45309] hover:bg-[#92400E] text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                  Download Original
                </a>
                <button 
                  onClick={() => setPreviewDoc(null)} 
                  className="p-2 text-zinc-400 hover:text-zinc-800 rounded-xl hover:bg-zinc-200 transition-colors cursor-pointer"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            {/* Viewer Content Body */}
            <div className="flex-1 bg-zinc-900/95 p-4 flex items-center justify-center overflow-auto relative">
              {previewDoc.fileType === 'IMAGE' ? (
                <img src={previewDoc.fileUrl} alt={previewDoc.documentName} className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
              ) : previewDoc.fileType === 'PDF' && previewDoc.fileUrl.startsWith('data:application/pdf') ? (
                <iframe src={previewDoc.fileUrl} title={previewDoc.documentName} className="w-full h-full rounded-lg border-0 bg-white" />
              ) : (
                <div className="text-center p-8 bg-white rounded-2xl max-w-md shadow-xl">
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
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#B45309] text-white rounded-xl text-xs font-semibold hover:bg-[#92400E] transition-all"
                  >
                    Open / Download File
                  </a>
                </div>
              )}
            </div>

            {/* Viewer Footer Notes */}
            {previewDoc.notes && (
              <div className="px-6 py-3 bg-white border-t border-zinc-200 shrink-0">
                <p className="text-xs text-zinc-600 font-medium">
                  <span className="font-bold text-[#B45309]">Notes:</span> {previewDoc.notes}
                </p>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}