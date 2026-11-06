import React, { useState, useEffect } from 'react';
import * as db from '../db';
import { exportToCSV } from '../utils';

export default function Inventory({ setActivePage, companySettings = {} }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('Godown'); // 'Godown' | 'Movements'
  
  const [items, setItems] = useState([]);
  const [movements, setMovements] = useState([]);
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockStatusFilter, setStockStatusFilter] = useState('All');

  // Modals
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [selectedChallanMovement, setSelectedChallanMovement] = useState(null);

  // Item Master Form
  const [itemForm, setItemForm] = useState({ 
    name: '', 
    category: 'Hardware', 
    unit: 'Pcs',
    minThreshold: 5,
    unitCost: '',
    rackLocation: '' // Warehouse bay/rack (e.g., Shed 1 - Bay B)
  });

  // Material Movement (Inward, Outward Dispatch, Site Return) Form
  const [movementForm, setMovementForm] = useState({ 
    itemId: '', 
    itemName: '',
    type: 'OUT', // 'IN' (Arrival) | 'OUT' (Dispatch to Site) | 'RETURN' (Leftover returned to Godown)
    quantity: '', 
    unit: 'Pcs',
    projectId: '', 
    date: new Date().toISOString().split('T')[0], 
    vehicleNo: '',
    driverName: '',
    notes: '' 
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedItems, fetchedMovements, fetchedProjects] = await Promise.all([
        db.getInventoryItems ? db.getInventoryItems() : Promise.resolve([]),
        db.getInventoryMovements ? db.getInventoryMovements() : Promise.resolve([]),
        db.getProjects ? db.getProjects() : Promise.resolve([])
      ]);

      // Supplementary localStorage cache for offline resilience
      const cachedMovements = JSON.parse(localStorage.getItem('jyanipur_inventory') || '[]');
      const combinedMovements = [...(fetchedMovements || [])];
      
      cachedMovements.forEach(cm => {
        if (!combinedMovements.some(m => String(m.id || m._id) === String(cm.id || cm._id))) {
          combinedMovements.push(cm);
        }
      });

      // Sort movements chronologically (newest first)
      combinedMovements.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      setMovements(combinedMovements);
      setProjects((fetchedProjects || []).filter(p => p.status !== 'Completed'));

      // --- AUTOMATION: RECONCILE MASTER STOCK LEVELS FROM INWARD & DISPATCH LOGS ---
      const masterItemsMap = new Map();

      // Seed from existing catalog items
      (fetchedItems || []).forEach(item => {
        const key = (item.name || item.materialName || '').trim().toLowerCase();
        if (key) {
          masterItemsMap.set(key, {
            id: item.id || item._id || key,
            name: item.name || item.materialName,
            category: item.category || 'General',
            unit: item.unit || 'Nos',
            minThreshold: Number(item.minThreshold) || 5,
            unitCost: Number(item.unitCost) || 0,
            rackLocation: item.rackLocation || 'Bay A'
          });
        }
      });

      // Surface materials recorded from DPR logs, PO receipts, or direct dispatches
      combinedMovements.forEach(m => {
        const key = (m.itemName || m.materialName || '').trim().toLowerCase();
        if (key && !masterItemsMap.has(key)) {
          masterItemsMap.set(key, {
            id: key,
            name: m.itemName || m.materialName,
            category: 'Auto-Inward (PO/DPR)',
            unit: m.unit || 'Nos',
            minThreshold: 5,
            unitCost: 0,
            rackLocation: 'Central Yard'
          });
        }
      });

      // Compute on-hand inventory: (IN + RETURN) - OUT
      const reconciledItems = Array.from(masterItemsMap.values()).map(item => {
        const itemKey = item.name.toLowerCase();

        const totalIn = combinedMovements
          .filter(m => (m.type === 'IN' || m.type === 'RETURN') && (m.itemName || m.materialName || '').trim().toLowerCase() === itemKey)
          .reduce((sum, m) => sum + (parseFloat(m.quantity) || 0), 0);

        const totalOut = combinedMovements
          .filter(m => m.type === 'OUT' && (m.itemName || m.materialName || '').trim().toLowerCase() === itemKey)
          .reduce((sum, m) => sum + (parseFloat(m.quantity) || 0), 0);

        const liveStock = Math.max(0, totalIn - totalOut);
        const itemValuation = liveStock * (item.unitCost || 0);

        return {
          ...item,
          totalIn,
          totalOut,
          totalStock: liveStock,
          itemValuation
        };
      });

      reconciledItems.sort((a, b) => a.name.localeCompare(b.name));
      setItems(reconciledItems);

    } catch (e) {
      console.error("Error loading inventory ecosystem:", e);
      setItems([]);
      setMovements([]);
      setProjects([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!itemForm.name.trim()) return alert("Material name is required.");
    setSubmitting(true);
    try {
      const payload = {
        ...itemForm,
        id: Date.now(),
        minThreshold: parseFloat(itemForm.minThreshold) || 5,
        unitCost: parseFloat(itemForm.unitCost) || 0
      };

      if (typeof db.saveInventoryItem === 'function') {
        await db.saveInventoryItem(payload);
      } else {
        const cached = JSON.parse(localStorage.getItem('jyanipur_inventory_items') || '[]');
        cached.push(payload);
        localStorage.setItem('jyanipur_inventory_items', JSON.stringify(cached));
      }

      setIsItemModalOpen(false);
      setItemForm({ name: '', category: 'Hardware', unit: 'Pcs', minThreshold: 5, unitCost: '', rackLocation: '' });
      await loadData();
      alert(`Material "${payload.name}" added to master inventory!`);
    } catch (err) {
      alert("Failed to save item to database.");
    }
    setSubmitting(false);
  };

  // --- AUTOMATION: RECORD MOVEMENT & GENERATE DELIVERY CHALLAN ---
  const handleRecordMovement = async (e) => {
    e.preventDefault();
    const qtyVal = parseFloat(movementForm.quantity);
    if (!movementForm.itemName || !qtyVal || qtyVal <= 0) {
      return alert("Please enter a valid material and quantity.");
    }
    
    if (movementForm.type === 'OUT' && !movementForm.projectId) {
      return alert("Please select a Destination Project Site for outward dispatches.");
    }

    const currentItem = items.find(i => i.name.toLowerCase() === movementForm.itemName.toLowerCase());
    const availableStock = currentItem ? currentItem.totalStock : 0;

    if (movementForm.type === 'OUT' && qtyVal > availableStock) {
      return alert(`Insufficient stock in Central Godown! Available on-hand: ${availableStock} ${currentItem?.unit || 'Nos'}.`);
    }

    setSubmitting(true);
    try {
      const selectedProj = projects.find(p => String(p.id || p._id) === String(movementForm.projectId));
      const challanNo = `DC/${new Date().getFullYear()}/${Date.now().toString().slice(-4)}`;

      const movementRecord = {
        id: Date.now(),
        challanNo: movementForm.type === 'OUT' ? challanNo : undefined,
        itemId: currentItem ? currentItem.id : movementForm.itemName,
        itemName: movementForm.itemName,
        quantity: qtyVal,
        unit: movementForm.unit || currentItem?.unit || 'Nos',
        type: movementForm.type,
        date: movementForm.date,
        projectId: movementForm.projectId || null,
        projectName: selectedProj ? (selectedProj.name || selectedProj.projectName) : 'Central Godown',
        vehicleNo: movementForm.vehicleNo || '-',
        driverName: movementForm.driverName || '-',
        notes: movementForm.notes || (
          movementForm.type === 'IN' ? 'Stock inward arrival' :
          movementForm.type === 'RETURN' ? 'Unused surplus material returned from site' : 'Site dispatch voucher'
        )
      };

      if (typeof db.recordInventoryMovement === 'function') {
        await db.recordInventoryMovement(movementRecord);
      } else if (typeof db.saveInventoryMovement === 'function') {
        await db.saveInventoryMovement(movementRecord);
      } else {
        const cached = JSON.parse(localStorage.getItem('jyanipur_inventory') || '[]');
        cached.unshift(movementRecord);
        localStorage.setItem('jyanipur_inventory', JSON.stringify(cached));
      }

      setIsMovementModalOpen(false);
      setMovementForm({ itemId: '', itemName: '', type: 'OUT', quantity: '', unit: 'Pcs', projectId: '', date: new Date().toISOString().split('T')[0], vehicleNo: '', driverName: '', notes: '' });
      await loadData();

      // If it's a site dispatch, prompt to open printable delivery challan
      if (movementRecord.type === 'OUT') {
        if (window.confirm(`Dispatched ${qtyVal} ${movementRecord.unit} to ${movementRecord.projectName}!\n\nOpen official Delivery Gate Pass / Challan for vehicle dispatch?`)) {
          setSelectedChallanMovement(movementRecord);
        }
      } else {
        alert(`Stock Movement Recorded!\n\n${movementRecord.type === 'IN' ? 'Stock Added (+IN)' : 'Surplus Returned (+RETURN)'}: ${qtyVal} ${movementRecord.unit} of ${movementRecord.itemName}`);
      }

    } catch (err) {
      console.error("Error recording movement:", err);
      alert("Failed to save inventory movement.");
    }
    setSubmitting(false);
  };

  const openMovementModal = (item = null, forceType = 'OUT') => {
    setMovementForm({ 
      itemId: item ? item.id : '', 
      itemName: item ? item.name : '',
      type: forceType, 
      quantity: '', 
      unit: item ? item.unit : 'Pcs',
      projectId: '', 
      date: new Date().toISOString().split('T')[0], 
      vehicleNo: '',
      driverName: '',
      notes: '' 
    });
    setIsMovementModalOpen(true);
  };

  // --- AUTOMATION: 1-CLICK DRAFT PURCHASE ORDER FOR LOW STOCK ---
  const handleFastDraftPO = (item) => {
    const defaultReorderQty = Math.max(item.minThreshold * 2, 20);
    const draft = {
      vendorName: '',
      date: new Date().toISOString().split('T')[0],
      projectName: 'Central Godown Replenishment',
      shippingAddress: companySettings.companyAddress || 'Jyanipur Central Warehouse',
      description: `Reorder replenishment for depleted stock: ${item.name}`,
      items: [
        {
          id: Date.now(),
          description: item.name,
          uom: item.unit || 'Nos',
          qty: defaultReorderQty,
          rate: item.unitCost || 0,
          tax: 18
        }
      ]
    };

    sessionStorage.setItem('draft_poDetails', JSON.stringify(draft));
    sessionStorage.setItem('draft_poItems', JSON.stringify(draft.items));
    sessionStorage.setItem('draft_poView', 'form');

    if (setActivePage) {
      setActivePage('Purchase Orders');
    } else {
      alert(`Purchase Order drafted for ${item.name} (${defaultReorderQty} ${item.unit})!\n\nNavigate to Purchase Orders to select the supplier and dispatch.`);
    }
  };

  const handleExportStock = () => {
    const exportData = items.map(i => ({
      'Material Name': i.name,
      'Category': i.category,
      'Warehouse Bay': i.rackLocation || 'Bay A',
      'Unit': i.unit,
      'Min Reorder Threshold': i.minThreshold,
      'Total Received': i.totalIn,
      'Total Dispatched': i.totalOut,
      'Live Stock In-Hand': i.totalStock,
      'Benchmark Rate (INR)': i.unitCost || 0,
      'Stock Valuation (INR)': i.itemValuation || 0,
      'Stock Health': i.totalStock === 0 ? 'OUT OF STOCK' : i.totalStock <= i.minThreshold ? 'LOW STOCK' : 'OPTIMAL'
    }));
    exportToCSV('Jyanipur_Central_Inventory_Stock', exportData);
  };

  const handleExportMovements = () => {
    const exportData = movements.map(m => ({
      'Date': m.date,
      'Challan No': m.challanNo || '-',
      'Flow Type': m.type === 'IN' ? 'INWARD (+)' : m.type === 'RETURN' ? 'SITE RETURN (+)' : 'SITE DISPATCH (-)',
      'Material': m.itemName || m.materialName,
      'Quantity': m.quantity,
      'Unit': m.unit,
      'Destination / Site': m.projectName || 'Central Warehouse',
      'Vehicle No': m.vehicleNo || '-',
      'Driver': m.driverName || '-',
      'Notes': m.notes
    }));
    exportToCSV('Jyanipur_Material_Dispatches_Audit', exportData);
  };

  // Filters
  const filteredItems = items.filter(i => {
    const matchesSearch = !searchQuery.trim() || 
      (i.name && i.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (i.category && i.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (i.rackLocation && i.rackLocation.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = categoryFilter === 'All' || i.category === categoryFilter;

    let matchesStatus = true;
    if (stockStatusFilter === 'Low Stock') matchesStatus = i.totalStock > 0 && i.totalStock <= i.minThreshold;
    if (stockStatusFilter === 'Out of Stock') matchesStatus = i.totalStock === 0;
    if (stockStatusFilter === 'In Stock') matchesStatus = i.totalStock > i.minThreshold;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const filteredMovements = movements.filter(m => 
    !searchQuery.trim() ||
    (m.itemName && m.itemName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (m.projectName && m.projectName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (m.challanNo && m.challanNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (m.notes && m.notes.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Financial & Operational Metrics
  const lowStockCount = items.filter(i => i.totalStock > 0 && i.totalStock <= i.minThreshold).length;
  const outOfStockCount = items.filter(i => i.totalStock === 0).length;
  const totalUnitsInGodown = items.reduce((sum, i) => sum + (i.totalStock || 0), 0);
  const totalInventoryValuation = items.reduce((sum, i) => sum + (i.itemValuation || 0), 0);
  const dispatchesThisMonth = movements.filter(m => m.type === 'OUT' && m.date && m.date.startsWith(new Date().toISOString().slice(0, 7))).length;

  const categories = ['All', 'Hardware', 'Electrical', 'Plumbing', 'Wood / Board', 'Paint', 'Civil & Cement', 'Auto-Inward (PO/DPR)', 'Miscellaneous'];

  const inputClass = "w-full px-4 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 text-xs font-medium transition-all shadow-sm disabled:opacity-75 disabled:cursor-not-allowed";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-0.5";

  return (
    <div className="w-full h-full flex flex-col font-['Inter',sans-serif]">
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center pb-6 mb-4 border-b border-zinc-200 shrink-0 gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Material Inventory & Central Godown</h2>
          <p className="text-zinc-500 text-sm mt-1 font-medium">Auto-reconciliation from PO inward receipts, site DPR consumption, delivery gate passes, and inventory valuation.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center h-10 bg-white border border-zinc-200 rounded-lg px-3.5 shadow-sm w-full md:w-auto focus-within:ring-2 focus-within:ring-zinc-900 transition-all">
            <svg className="w-4 h-4 text-zinc-400 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              placeholder="Search material, challan, site..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-xs font-medium text-zinc-900 outline-none w-full md:w-52 placeholder:text-zinc-400"
            />
          </div>

          <button 
            onClick={activeTab === 'Godown' ? handleExportStock : handleExportMovements}
            className="h-10 bg-white border border-zinc-200 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-50 px-4 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-2"
          >
            <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export CSV
          </button>

          <button 
            onClick={() => setIsItemModalOpen(true)} 
            className="h-10 bg-white border border-zinc-200 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-50 px-4 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Material Type
          </button>

          <button 
            onClick={() => openMovementModal(null, 'OUT')} 
            className="h-10 bg-zinc-900 hover:bg-black text-white px-5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-2 border border-black"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
            Dispatch to Site
          </button>
        </div>
      </div>

      {/* KPI METRICS STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-6 shrink-0 print:hidden">
        <div className="bg-white border border-zinc-200 p-5 rounded-xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">Total Managed Items</span>
          <p className="text-2xl font-black text-zinc-900 tracking-tight">{items.length}</p>
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">{totalUnitsInGodown.toLocaleString()} Total Units</span>
        </div>

        <div className="bg-white border border-zinc-200 p-5 rounded-xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">Godown Stock Valuation</span>
          <p className="text-2xl font-black text-zinc-900 tracking-tight">₹ {totalInventoryValuation.toLocaleString('en-IN')}</p>
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Capital in Warehouse</span>
        </div>

        <div className="bg-amber-50 border border-amber-200 p-5 rounded-xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest block mb-1.5">Low Stock Alerts</span>
          <p className="text-2xl font-black text-amber-800 tracking-tight">{lowStockCount}</p>
          <span className="text-[10px] font-bold text-amber-700/80 uppercase tracking-widest mt-1">Below Minimum Level</span>
        </div>

        <div className="bg-red-50 border border-red-200 p-5 rounded-xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest block mb-1.5">Depleted (Zero Stock)</span>
          <p className="text-2xl font-black text-red-700 tracking-tight">{outOfStockCount}</p>
          <span className="text-[10px] font-bold text-red-700/80 uppercase tracking-widest mt-1">Immediate PO Required</span>
        </div>

        <div className="bg-zinc-900 border border-black p-5 rounded-xl shadow-sm flex flex-col justify-center relative overflow-hidden text-white">
          <svg className="absolute -right-4 -bottom-6 w-32 h-32 opacity-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-widest block mb-1.5 relative z-10 opacity-80">Monthly Dispatches</span>
          <p className="text-2xl font-black tracking-tight relative z-10">{dispatchesThisMonth}</p>
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-80 mt-1 relative z-10">Moved to Job Sites</span>
        </div>
      </div>

      {/* TABS & VIEW FILTERS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 shrink-0 print:hidden">
        <div className="flex bg-zinc-100 p-1 rounded-lg border border-zinc-200">
          <button 
            onClick={() => setActiveTab('Godown')} 
            className={`px-5 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
              activeTab === 'Godown' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Godown Balance Stock ({items.length})
          </button>
          <button 
            onClick={() => setActiveTab('Movements')} 
            className={`px-5 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
              activeTab === 'Movements' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Inward & Dispatch Audit Ledger ({movements.length})
          </button>
        </div>

        {activeTab === 'Godown' && (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="bg-white border border-zinc-200 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-700 px-3 py-2 outline-none cursor-pointer shadow-sm"
            >
              {categories.map(cat => <option key={cat} value={cat}>{cat === 'All' ? 'All Categories' : cat}</option>)}
            </select>

            <div className="flex bg-white p-1 rounded-lg border border-zinc-200 shadow-sm">
              {['All', 'In Stock', 'Low Stock', 'Out of Stock'].map(st => (
                <button
                  key={st}
                  onClick={() => setStockStatusFilter(st)}
                  className={`px-3 py-1 rounded text-[9px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                    stockStatusFilter === st ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CONTENT TABLES */}
      <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        {loading ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-xs flex flex-col items-center justify-center space-y-3 flex-1">
            <div className="w-10 h-10 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin"></div>
            <p>Reconciling stock levels from procurement and dispatch logs...</p>
          </div>
        ) : activeTab === 'Godown' ? (
          
          /* GODOWN LIVE STOCK BALANCE TABLE */
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1050px]">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500 text-[10px] font-bold uppercase tracking-widest border-b border-zinc-200 sticky top-0 z-10">
                  <th className="py-3.5 px-6">Material Description</th>
                  <th className="py-3.5 px-6 w-44">Category</th>
                  <th className="py-3.5 px-6 w-36">Bay / Rack</th>
                  <th className="py-3.5 px-6 text-right w-32">Total Inward (+)</th>
                  <th className="py-3.5 px-6 text-right w-32">Dispatched (-)</th>
                  <th className="py-3.5 px-6 text-right w-40">Live Stock</th>
                  <th className="py-3.5 px-6 text-right w-36">Valuation (₹)</th>
                  <th className="py-3.5 px-6 text-center w-36">Status</th>
                  <th className="py-3.5 px-6 text-right w-64">Automated Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-zinc-400 font-bold text-xs uppercase tracking-widest">
                      No matching materials found in warehouse inventory.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map(item => {
                    const isZero = item.totalStock === 0;
                    const isLow = !isZero && item.totalStock <= item.minThreshold;

                    return (
                      <tr key={item.id} className="hover:bg-zinc-50/80 transition-colors group">
                        <td className="py-4 px-6">
                          <p className="font-bold text-zinc-900 tracking-tight">{item.name}</p>
                          <span className="text-[10px] text-zinc-400 font-medium">Reorder Alert: ≤ {item.minThreshold} {item.unit}</span>
                        </td>

                        <td className="py-4 px-6">
                          <span className="px-2.5 py-0.5 bg-zinc-100 text-zinc-700 border border-zinc-200 rounded text-[9px] font-bold uppercase tracking-widest">
                            {item.category}
                          </span>
                        </td>

                        <td className="py-4 px-6 text-xs font-mono font-bold text-zinc-600">
                          {item.rackLocation || 'Bay A'}
                        </td>

                        <td className="py-4 px-6 text-right font-medium text-xs text-zinc-600 font-mono">
                          {item.totalIn || 0} <span className="text-[10px] text-zinc-400 font-bold">{item.unit}</span>
                        </td>

                        <td className="py-4 px-6 text-right font-medium text-xs text-zinc-600 font-mono">
                          {item.totalOut || 0} <span className="text-[10px] text-zinc-400 font-bold">{item.unit}</span>
                        </td>

                        <td className="py-4 px-6 text-right font-black text-base bg-zinc-50/40 font-mono">
                          <span className={isZero ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-emerald-700'}>
                            {item.totalStock}
                          </span>
                          <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold ml-1.5">{item.unit}</span>
                        </td>

                        <td className="py-4 px-6 text-right font-bold text-xs text-zinc-900 font-mono">
                          ₹{(item.itemValuation || 0).toLocaleString('en-IN')}
                        </td>

                        <td className="py-4 px-6 text-center">
                          <span className={`px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${
                            isZero ? 'bg-red-50 text-red-700 border-red-200' :
                            isLow ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-emerald-50 text-emerald-800 border-emerald-300'
                          }`}>
                            {isZero ? 'Depleted' : isLow ? 'Low Stock' : 'Optimal'}
                          </span>
                        </td>

                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* 1-Click Fast Reorder Trigger */}
                            {(isLow || isZero) && (
                              <button 
                                onClick={() => handleFastDraftPO(item)}
                                title="Auto-create PO replenishment draft"
                                className="px-2.5 py-1.5 bg-zinc-900 hover:bg-black text-white rounded-lg font-bold cursor-pointer text-[9px] uppercase tracking-widest transition-all shadow-sm flex items-center gap-1 border border-black"
                              >
                                <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                                Reorder PO
                              </button>
                            )}

                            <button 
                              onClick={() => openMovementModal(item, 'IN')} 
                              className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 rounded-lg font-bold cursor-pointer text-[9px] uppercase tracking-widest transition-all shadow-sm"
                            >
                              + Inward
                            </button>
                            
                            <button 
                              onClick={() => openMovementModal(item, 'OUT')} 
                              disabled={isZero}
                              className={`px-2.5 py-1.5 rounded-lg font-bold text-[9px] uppercase tracking-widest transition-all shadow-sm ${
                                isZero 
                                  ? 'bg-zinc-100 text-zinc-400 border border-zinc-200 cursor-not-allowed opacity-60' 
                                  : 'bg-white text-zinc-900 hover:bg-zinc-900 hover:text-white border border-zinc-200 cursor-pointer'
                              }`}
                            >
                              Dispatch
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        ) : (

          /* DISPATCH & INWARD MOVEMENT AUDIT TRAIL */
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1050px]">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500 text-[10px] font-bold uppercase tracking-widest border-b border-zinc-200 sticky top-0 z-10">
                  <th className="py-3.5 px-6 w-32">Date</th>
                  <th className="py-3.5 px-6 w-36 text-center">Movement Flow</th>
                  <th className="py-3.5 px-6 w-36">Challan / Ref</th>
                  <th className="py-3.5 px-6">Material Description</th>
                  <th className="py-3.5 px-6 text-right w-36">Quantity</th>
                  <th className="py-3.5 px-6 w-60">Destination / Source Site</th>
                  <th className="py-3.5 px-6">Vehicle & Remarks</th>
                  <th className="py-3.5 px-6 text-right w-32">Gate Pass</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm">
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-zinc-400 font-bold text-xs uppercase tracking-widest">
                      No stock movement audit records found.
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map((mov, idx) => (
                    <tr key={mov.id || idx} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="py-4 px-6 text-xs text-zinc-500 font-bold uppercase tracking-widest font-mono">{mov.date}</td>
                      <td className="py-4 px-6 text-center">
                        <span className={`px-2.5 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase border ${
                          mov.type === 'IN' 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                            : mov.type === 'RETURN'
                            ? 'bg-blue-50 text-blue-800 border-blue-300'
                            : 'bg-zinc-100 text-zinc-800 border-zinc-300'
                        }`}>
                          {mov.type === 'IN' ? 'Inward (+)' : mov.type === 'RETURN' ? 'Site Return (+)' : 'Site Dispatch (-)'}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-mono text-xs font-bold text-zinc-800">
                        {mov.challanNo || '-'}
                      </td>
                      <td className="py-4 px-6 font-bold text-zinc-900 tracking-tight">{mov.itemName || mov.materialName}</td>
                      <td className="py-4 px-6 text-right font-black text-sm text-zinc-900 bg-zinc-50/40 font-mono">
                        {mov.type === 'OUT' ? '-' : '+'}{mov.quantity} <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{mov.unit}</span>
                      </td>
                      <td className="py-4 px-6 text-xs font-bold text-zinc-800">
                        {mov.projectName || 'Central Warehouse'}
                      </td>
                      <td className="py-4 px-6 text-xs text-zinc-500 font-medium truncate max-w-[220px]">
                        {mov.vehicleNo && mov.vehicleNo !== '-' ? `[Veh: ${mov.vehicleNo}] ` : ''}
                        {mov.notes || '-'}
                      </td>
                      <td className="py-4 px-6 text-right">
                        {mov.type === 'OUT' ? (
                          <button
                            onClick={() => setSelectedChallanMovement(mov)}
                            className="px-2.5 py-1 bg-white hover:bg-zinc-900 hover:text-white border border-zinc-200 rounded text-[9px] font-bold uppercase tracking-widest transition-all cursor-pointer"
                          >
                            Challan
                          </button>
                        ) : (
                          <span className="text-zinc-300 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- ADD NEW MATERIAL MODAL --- */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] border border-zinc-200">
            <div className="px-8 py-6 border-b border-zinc-200 flex justify-between items-center bg-white shrink-0">
              <div>
                <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Add Material Type</h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Register item to inventory master catalog</p>
              </div>
              <button onClick={() => setIsItemModalOpen(false)} className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 flex items-center justify-center cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveItem} className="p-8 space-y-4 bg-zinc-50/50">
              <div>
                <label className={labelClass}>Material Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. 18mm Century Marine Plywood" 
                  value={itemForm.name} 
                  onChange={e => setItemForm({...itemForm, name: e.target.value})} 
                  className={inputClass} 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Category</label>
                  <select 
                    value={itemForm.category} 
                    onChange={e => setItemForm({...itemForm, category: e.target.value})} 
                    className={`${inputClass} font-bold`}
                  >
                    <option value="Hardware">Hardware & Fittings</option>
                    <option value="Electrical">Electrical & Lighting</option>
                    <option value="Plumbing">Plumbing & Sanitary</option>
                    <option value="Wood / Board">Wood / Plywood / MDF</option>
                    <option value="Paint">Paint & Finishes</option>
                    <option value="Civil & Cement">Civil, Sand & Cement</option>
                    <option value="Miscellaneous">Miscellaneous</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Unit of Measure</label>
                  <select 
                    value={itemForm.unit} 
                    onChange={e => setItemForm({...itemForm, unit: e.target.value})} 
                    className={`${inputClass} font-bold`}
                  >
                    <option value="Pcs">Pieces (Pcs)</option>
                    <option value="Bags">Bags</option>
                    <option value="SqFt">SqFt</option>
                    <option value="Sheets">Sheets</option>
                    <option value="Ltrs">Liters (Ltrs)</option>
                    <option value="Mtrs">Meters (Mtrs)</option>
                    <option value="Box">Boxes (Box)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Min Alert Qty</label>
                  <input 
                    type="number" 
                    min="0"
                    value={itemForm.minThreshold} 
                    onChange={e => setItemForm({...itemForm, minThreshold: e.target.value})} 
                    className={`${inputClass} text-center font-bold`} 
                    placeholder="5" 
                  />
                </div>
                <div>
                  <label className={labelClass}>Unit Cost (₹)</label>
                  <input 
                    type="number" 
                    step="any"
                    value={itemForm.unitCost} 
                    onChange={e => setItemForm({...itemForm, unitCost: e.target.value})} 
                    className={`${inputClass} text-center font-bold`} 
                    placeholder="0.00" 
                  />
                </div>
                <div>
                  <label className={labelClass}>Bay / Rack</label>
                  <input 
                    type="text" 
                    value={itemForm.rackLocation} 
                    onChange={e => setItemForm({...itemForm, rackLocation: e.target.value})} 
                    className={inputClass} 
                    placeholder="Bay B-2" 
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-zinc-200">
                <button type="button" onClick={() => setIsItemModalOpen(false)} className="px-5 py-2.5 bg-white border border-zinc-200 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-700 cursor-pointer">Cancel</button>
                <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-zinc-900 hover:bg-black text-white rounded-lg text-[10px] font-bold uppercase tracking-widest border border-black cursor-pointer">
                  {submitting ? 'Saving...' : 'Save Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- RECORD MOVEMENT MODAL --- */}
      {isMovementModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] border border-zinc-200">
            <div className="px-8 py-6 border-b border-zinc-200 flex justify-between items-center bg-white shrink-0">
              <div>
                <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
                  {movementForm.type === 'IN' ? 'Stock Inward (+)' : movementForm.type === 'RETURN' ? 'Leftover Site Return (+)' : 'Dispatch Material to Site (-)'}
                </h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                  {movementForm.type === 'IN' ? 'Add materials received into Central Yard' : movementForm.type === 'RETURN' ? 'Surplus returned from site back to Godown' : 'Generate transfer gate pass to job site'}
                </p>
              </div>
              <button onClick={() => setIsMovementModalOpen(false)} className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 flex items-center justify-center cursor-pointer">✕</button>
            </div>

            <div className="p-8 overflow-y-auto bg-zinc-50/50">
              <div className="flex bg-white border border-zinc-200 p-1 rounded-xl mb-5 shadow-sm">
                <button 
                  type="button" 
                  onClick={() => setMovementForm({...movementForm, type: 'IN', projectId: ''})} 
                  className={`flex-1 py-1.5 rounded-lg text-[9px] uppercase tracking-widest font-bold transition-all cursor-pointer ${
                    movementForm.type === 'IN' ? 'bg-emerald-50 text-emerald-800 shadow-sm border border-emerald-300' : 'text-zinc-500 hover:bg-zinc-50'
                  }`}
                >
                  Inward (+)
                </button>
                <button 
                  type="button" 
                  onClick={() => setMovementForm({...movementForm, type: 'OUT'})} 
                  className={`flex-1 py-1.5 rounded-lg text-[9px] uppercase tracking-widest font-bold transition-all cursor-pointer ${
                    movementForm.type === 'OUT' ? 'bg-zinc-900 text-white shadow-sm border border-black' : 'text-zinc-500 hover:bg-zinc-50'
                  }`}
                >
                  Dispatch (-)
                </button>
                <button 
                  type="button" 
                  onClick={() => setMovementForm({...movementForm, type: 'RETURN'})} 
                  className={`flex-1 py-1.5 rounded-lg text-[9px] uppercase tracking-widest font-bold transition-all cursor-pointer ${
                    movementForm.type === 'RETURN' ? 'bg-blue-50 text-blue-800 shadow-sm border border-blue-300' : 'text-zinc-500 hover:bg-zinc-50'
                  }`}
                >
                  Site Return (+)
                </button>
              </div>

              <form id="movementForm" onSubmit={handleRecordMovement} className="space-y-4 bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                <div>
                  <label className={labelClass}>Material <span className="text-red-500">*</span></label>
                  <select 
                    required 
                    value={movementForm.itemName} 
                    onChange={e => {
                      const sel = items.find(i => i.name === e.target.value);
                      setMovementForm({
                        ...movementForm, 
                        itemName: e.target.value,
                        unit: sel?.unit || 'Nos'
                      });
                    }} 
                    className={`${inputClass} font-bold`}
                  >
                    <option value="" disabled>Choose material...</option>
                    {items.map(i => (
                      <option key={i.id} value={i.name}>
                        {i.name} (In Hand: {i.totalStock} {i.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Quantity <span className="text-red-500">*</span></label>
                    <input 
                      type="number" 
                      step="any" 
                      required 
                      placeholder="0" 
                      value={movementForm.quantity} 
                      onChange={e => setMovementForm({...movementForm, quantity: e.target.value})} 
                      className={`${inputClass} font-bold text-zinc-900`} 
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Movement Date</label>
                    <input 
                      type="date" 
                      required 
                      value={movementForm.date} 
                      onChange={e => setMovementForm({...movementForm, date: e.target.value})} 
                      className={inputClass} 
                    />
                  </div>
                </div>

                {(movementForm.type === 'OUT' || movementForm.type === 'RETURN') && (
                  <div>
                    <label className={labelClass}>
                      {movementForm.type === 'OUT' ? 'Destination Project Site' : 'Origin Site'} <span className="text-red-500">*</span>
                    </label>
                    <select 
                      required 
                      value={movementForm.projectId} 
                      onChange={e => setMovementForm({...movementForm, projectId: e.target.value})} 
                      className={`${inputClass} font-bold`}
                    >
                      <option value="" disabled>Select project site...</option>
                      {projects.map(p => (
                        <option key={p.id || p._id} value={p.id || p._id}>
                          {p.name || p.projectName} ({p.clientName || 'Client'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {movementForm.type === 'OUT' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Vehicle / Auto No.</label>
                      <input 
                        type="text" 
                        placeholder="TS 09..." 
                        value={movementForm.vehicleNo} 
                        onChange={e => setMovementForm({...movementForm, vehicleNo: e.target.value})} 
                        className={inputClass} 
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Driver Name</label>
                      <input 
                        type="text" 
                        placeholder="Driver name" 
                        value={movementForm.driverName} 
                        onChange={e => setMovementForm({...movementForm, driverName: e.target.value})} 
                        className={inputClass} 
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className={labelClass}>Dispatch Remarks / Challan Notes</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Received by Site Supervisor" 
                    value={movementForm.notes} 
                    onChange={e => setMovementForm({...movementForm, notes: e.target.value})} 
                    className={inputClass} 
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-zinc-200">
                  <button type="button" onClick={() => setIsMovementModalOpen(false)} className="px-5 py-2.5 bg-white border border-zinc-200 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-700 cursor-pointer">Cancel</button>
                  <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-zinc-900 hover:bg-black text-white rounded-lg text-[10px] font-bold uppercase tracking-widest border border-black cursor-pointer">
                    {submitting ? 'Recording...' : `Confirm ${movementForm.type === 'IN' ? 'Inward' : movementForm.type === 'RETURN' ? 'Return' : 'Dispatch'}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- OFFICIAL DELIVERY CHALLAN / GATE PASS MODAL --- */}
      {selectedChallanMovement && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-zinc-200 max-h-[90vh]">
            
            <div className="px-6 py-4 border-b border-zinc-200 bg-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-base font-bold text-zinc-900 tracking-tight">Material Delivery Challan / Gate Pass</h3>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">{selectedChallanMovement.challanNo || 'GATE PASS'}</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all cursor-pointer shadow-sm"
                >
                  Print Challan
                </button>
                <button onClick={() => setSelectedChallanMovement(null)} className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 cursor-pointer">✕</button>
              </div>
            </div>

            {/* Printable A4 Challan Layout */}
            <div className="p-8 overflow-y-auto bg-white text-zinc-900 text-xs space-y-6">
              <div className="flex justify-between items-start border-b-2 border-black pb-4">
                <div>
                  <h1 className="text-base font-black uppercase text-black">{companySettings.companyName || 'Jyanipur Interiors & Construction'}</h1>
                  <p className="text-[10px] text-zinc-500 whitespace-pre-wrap">{companySettings.companyAddress || 'Central Warehouse Logistics Yard, Hyderabad'}</p>
                  <p className="text-[10px] text-zinc-800 font-bold mt-1">GSTIN: <span className="font-medium text-zinc-600">{companySettings.companyGst || '36OEYPS9800J1Z9'}</span></p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold uppercase tracking-widest bg-zinc-100 px-2.5 py-1 rounded border border-zinc-200 inline-block mb-1">
                    Material Transfer Gate Pass
                  </span>
                  <p className="font-mono text-sm font-black text-black">{selectedChallanMovement.challanNo || 'DC-001'}</p>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Date: {selectedChallanMovement.date}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-3 bg-zinc-50 rounded-lg border border-zinc-200 text-xs">
                <div>
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-0.5">Destination Site:</span>
                  <p className="font-bold text-zinc-900">{selectedChallanMovement.projectName}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-0.5">Transport & Driver:</span>
                  <p className="font-bold text-zinc-900">
                    {selectedChallanMovement.vehicleNo ? `Veh: ${selectedChallanMovement.vehicleNo}` : 'Direct Transport'} 
                    {selectedChallanMovement.driverName ? ` (${selectedChallanMovement.driverName})` : ''}
                  </p>
                </div>
              </div>

              <table className="w-full text-left border-collapse border border-zinc-300">
                <thead>
                  <tr className="bg-zinc-100 text-[10px] uppercase font-bold text-zinc-800 border-b border-zinc-300">
                    <th className="py-2.5 px-3 border-r border-zinc-300 w-12 text-center">#</th>
                    <th className="py-2.5 px-4 border-r border-zinc-300">Material Item Description</th>
                    <th className="py-2.5 px-4 text-center border-r border-zinc-300 w-24">UOM</th>
                    <th className="py-2.5 px-4 text-right w-32">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-3 px-3 text-center border-r border-zinc-200 font-bold">1</td>
                    <td className="py-3 px-4 border-r border-zinc-200 font-bold text-zinc-900">{selectedChallanMovement.itemName}</td>
                    <td className="py-3 px-4 text-center border-r border-zinc-200 font-medium">{selectedChallanMovement.unit}</td>
                    <td className="py-3 px-4 text-right font-black font-mono text-sm">{selectedChallanMovement.quantity}</td>
                  </tr>
                </tbody>
              </table>

              {selectedChallanMovement.notes && (
                <div className="p-2.5 bg-zinc-50 rounded border border-zinc-200 text-[11px]">
                  <span className="font-bold text-zinc-700">Dispatch Notes: </span>
                  <span className="text-zinc-600">{selectedChallanMovement.notes}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-8 pt-10 border-t border-zinc-200">
                <div>
                  <div className="border-t-2 border-black w-44 pt-1.5 mt-8">
                    <p className="font-black text-xs text-black">Storekeeper / Yard Officer</p>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Dispatched By</p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <div className="border-t-2 border-black w-44 pt-1.5 mt-8 text-right">
                    <p className="font-black text-xs text-black">Site Supervisor / Engineer</p>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Received & Inspected By</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}