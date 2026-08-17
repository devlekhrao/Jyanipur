import React, { useState, useEffect } from 'react';
import { getProjects, getInventoryItems, getInventoryMovements, saveInventoryItem, recordInventoryMovement } from '../db';

export default function Inventory() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('Godown'); // 'Godown' or 'Movements'
  
  const [items, setItems] = useState([]);
  const [movements, setMovements] = useState([]);
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);

  const [itemForm, setItemForm] = useState({ name: '', category: 'Electrical', unit: 'Pcs' });
  const [movementForm, setMovementForm] = useState({ 
    itemId: '', type: 'IN', quantity: '', projectId: '', date: new Date().toISOString().split('T')[0], notes: '' 
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedItems, fetchedMovements, fetchedProjects] = await Promise.all([
        getInventoryItems(), getInventoryMovements(), getProjects()
      ]);
      setItems(fetchedItems || []);
      setMovements(fetchedMovements || []);
      setProjects((fetchedProjects || []).filter(p => p.status !== 'Completed'));
    } catch (e) {
      console.error("Error loading inventory from cloud DB:", e);
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
    if (!itemForm.name) return alert("Item name required.");
    setSubmitting(true);
    try {
      await saveInventoryItem(itemForm);
      setIsItemModalOpen(false);
      setItemForm({ name: '', category: 'Electrical', unit: 'Pcs' });
      await loadData();
    } catch (err) {
      alert("Failed to save item to cloud DB.");
    }
    setSubmitting(false);
  };

  const handleRecordMovement = async (e) => {
    e.preventDefault();
    if (!movementForm.itemId || !movementForm.quantity) return alert("Item and Quantity required.");
    if (movementForm.type === 'OUT' && !movementForm.projectId) return alert("Project Site is required for dispatches.");
    
    if (movementForm.type === 'OUT') {
      const currentItem = items.find(i => String(i.id) === String(movementForm.itemId));
      const availableStock = currentItem ? (currentItem.totalStock !== undefined ? currentItem.totalStock : (currentItem.qty || 0)) : 0;
      if (currentItem && parseFloat(movementForm.quantity) > availableStock) {
        return alert(`Insufficient stock in Godown. You only have ${availableStock} ${currentItem.unit || 'Pcs'} available.`);
      }
    }

    setSubmitting(true);
    try {
      await recordInventoryMovement({
        ...movementForm,
        itemId: Number(movementForm.itemId) || movementForm.itemId,
        quantity: parseFloat(movementForm.quantity),
        projectId: movementForm.type === 'OUT' ? (Number(movementForm.projectId) || movementForm.projectId) : null
      });
      setIsMovementModalOpen(false);
      setMovementForm({ itemId: '', type: 'IN', quantity: '', projectId: '', date: new Date().toISOString().split('T')[0], notes: '' });
      await loadData();
    } catch (err) {
      alert("Failed to record movement. Check DB connection.");
    }
    setSubmitting(false);
  };

  const openMovementModal = (item = null, forceType = 'OUT') => {
    setMovementForm({ 
      itemId: item ? item.id : '', 
      type: forceType, 
      quantity: '', 
      projectId: '', 
      date: new Date().toISOString().split('T')[0], 
      notes: '' 
    });
    setIsMovementModalOpen(true);
  };

  const filteredItems = items.filter(i => (i.name || i.materialName || '').toLowerCase().includes(searchQuery.toLowerCase()) || (i.category || '').toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredMovements = movements.filter(m => (m.itemName || '').toLowerCase().includes(searchQuery.toLowerCase()) || (m.projectName && m.projectName.toLowerCase().includes(searchQuery.toLowerCase())));

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-inset focus:ring-[#B45309] text-zinc-900 text-sm font-medium transition-all shadow-sm disabled:opacity-75 disabled:cursor-not-allowed";
  const labelClass = "block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 ml-0.5";

  const lowStockCount = items.filter(i => (i.totalStock !== undefined ? i.totalStock : (i.qty || 0)) <= 5 && (i.totalStock !== undefined ? i.totalStock : (i.qty || 0)) > 0).length;
  const outOfStockCount = items.filter(i => (i.totalStock !== undefined ? i.totalStock : (i.qty || 0)) === 0).length;
  const dispatchesThisMonth = movements.filter(m => m.type === 'OUT' && m.date && m.date.startsWith(new Date().toISOString().slice(0, 7))).length;

  return (
    <div className="w-full h-full flex flex-col" style={{ fontFamily: 'Poppins, sans-serif' }}>
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 mb-6 border-b border-zinc-200 shrink-0 gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Material Inventory</h2>
          <p className="text-zinc-500 text-sm mt-0.5 font-medium">Track godown stock and material dispatches to active project sites.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setIsItemModalOpen(true)} className="bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer flex items-center gap-1.5 h-10">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Add Material Type
          </button>
          <button onClick={() => openMovementModal(null, 'OUT')} className="bg-[#B45309] hover:bg-[#92400E] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer flex items-center gap-1.5 h-10">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
            Dispatch to Site
          </button>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6 shrink-0">
        <div className="bg-white border border-zinc-200 p-5 rounded-2xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Total Unique Materials</span>
          <p className="text-xl font-bold text-zinc-900">{items.length}</p>
        </div>
        <div className="bg-white border border-amber-200/80 p-5 rounded-2xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest block mb-1">Low Stock Alerts</span>
          <p className="text-xl font-bold text-amber-600">{lowStockCount}</p>
        </div>
        <div className="bg-white border border-red-200/80 p-5 rounded-2xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest block mb-1">Out of Stock</span>
          <p className="text-xl font-bold text-red-500">{outOfStockCount}</p>
        </div>
        <div className="bg-white border border-zinc-200 p-5 rounded-2xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block mb-1">Dispatches This Month</span>
          <p className="text-xl font-bold text-emerald-600">{dispatchesThisMonth}</p>
        </div>
      </div>

      {/* TABS & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 shrink-0">
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-zinc-200">
          <button onClick={() => setActiveTab('Godown')} className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === 'Godown' ? 'bg-[#B45309] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}>Godown Stock</button>
          <button onClick={() => setActiveTab('Movements')} className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === 'Movements' ? 'bg-[#B45309] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}>Dispatch History</button>
        </div>
        
        <div className="flex items-center h-10 bg-white border border-zinc-200 rounded-xl px-3.5 shadow-sm w-full sm:w-auto">
          <span className="text-sm text-zinc-400">🔍</span>
          <input 
            type="text" 
            placeholder="Search materials..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-transparent border-none text-sm font-medium text-zinc-800 outline-none px-2 w-full sm:w-56 placeholder:text-zinc-400"
          />
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        {loading ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-sm flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-4 border-zinc-200 border-t-[#B45309] rounded-full animate-spin"></div>
            <p>Syncing inventory with cloud database...</p>
          </div>
        ) : activeTab === 'Godown' ? (
          
          /* GODOWN STOCK TABLE */
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-zinc-50/80 text-zinc-500 text-[11px] uppercase tracking-wider border-b border-zinc-200 sticky top-0 bg-zinc-50 z-10">
                  <th className="py-4 px-6 font-semibold w-1/3">Material Name</th>
                  <th className="py-4 px-4 font-semibold">Category</th>
                  <th className="py-4 px-4 font-semibold text-right">In Hand (Godown)</th>
                  <th className="py-4 px-6 font-semibold text-right w-44">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm">
                {filteredItems.length === 0 ? (
                  <tr><td colSpan="4" className="py-12 text-center text-zinc-400 font-medium text-sm">No materials found. Add one above.</td></tr>
                ) : filteredItems.map(item => {
                  const stockVal = item.totalStock !== undefined ? item.totalStock : (item.qty || 0);

                  return (
                    <tr key={item.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="py-4 px-6 font-semibold text-zinc-900">{item.name || item.materialName}</td>
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 bg-amber-50 text-[#B45309] border border-amber-200/60 rounded-md text-[10px] font-semibold uppercase tracking-wider">
                          {item.category || 'General'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className={`font-bold text-sm ${stockVal === 0 ? 'text-red-500' : stockVal <= 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {stockVal}
                        </span>
                        <span className="text-xs text-zinc-400 ml-1 font-medium">{item.unit || 'Pcs'}</span>
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => openMovementModal(item, 'IN')} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 rounded-lg font-semibold cursor-pointer text-[10px] uppercase tracking-wider transition-all">
                            + Stock
                          </button>
                          <button onClick={() => openMovementModal(item, 'OUT')} className="px-3 py-1.5 bg-amber-50 text-[#B45309] hover:bg-[#B45309] hover:text-white border border-amber-200/60 rounded-lg font-semibold cursor-pointer text-[10px] uppercase tracking-wider transition-all">
                            Dispatch
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        ) : (

          /* DISPATCH HISTORY TABLE */
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-zinc-50/80 text-zinc-500 text-[11px] uppercase tracking-wider border-b border-zinc-200 sticky top-0 bg-zinc-50 z-10">
                  <th className="py-4 px-6 font-semibold w-28">Date</th>
                  <th className="py-4 px-4 font-semibold w-28 text-center">Type</th>
                  <th className="py-4 px-4 font-semibold">Material</th>
                  <th className="py-4 px-4 font-semibold text-right w-24">Qty</th>
                  <th className="py-4 px-4 font-semibold w-1/4">Destination Site</th>
                  <th className="py-4 px-6 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm">
                {filteredMovements.length === 0 ? (
                  <tr><td colSpan="6" className="py-12 text-center text-zinc-400 font-medium text-sm">No movement history found.</td></tr>
                ) : filteredMovements.map(mov => (
                  <tr key={mov.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="py-4 px-6 text-sm text-zinc-500 font-medium">{mov.date}</td>
                    <td className="py-4 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                        mov.type === 'IN' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-[#B45309] border-amber-200'
                      }`}>
                        {mov.type === 'IN' ? 'Inward' : 'Dispatch'}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-semibold text-zinc-900">{mov.itemName}</td>
                    <td className="py-4 px-4 text-right font-bold text-sm text-zinc-900">{mov.quantity} <span className="text-xs text-zinc-400 font-normal">{mov.unit}</span></td>
                    <td className="py-4 px-4 text-sm font-semibold text-[#B45309]">{mov.projectName || <span className="text-zinc-400 font-normal italic">Central Godown</span>}</td>
                    <td className="py-4 px-6 text-xs text-zinc-500 truncate max-w-[200px]">{mov.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        )}
      </div>

      {/* --- ADD NEW MATERIAL MODAL --- */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-5 border-b border-zinc-200 flex justify-between items-center bg-zinc-50 shrink-0">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900">Add Material Type</h2>
                <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mt-0.5">Register a new item to master list</p>
              </div>
              <button onClick={() => setIsItemModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <form id="itemForm" onSubmit={handleSaveItem} className="space-y-4">
                <div>
                  <label className={labelClass}>Material Name <span className="text-red-500">*</span></label>
                  <input type="text" required placeholder="e.g. Plywood 18mm" value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} className={inputClass} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Category</label>
                    <select 
                      value={itemForm.category} 
                      onChange={e => setItemForm({...itemForm, category: e.target.value})} 
                      className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
                    >
                      <option value="Hardware">Hardware</option>
                      <option value="Electrical">Electrical</option>
                      <option value="Plumbing">Plumbing</option>
                      <option value="Wood/Board">Wood / Board</option>
                      <option value="Paint">Paint</option>
                      <option value="Miscellaneous">Miscellaneous</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Unit of Measure</label>
                    <select 
                      value={itemForm.unit} 
                      onChange={e => setItemForm({...itemForm, unit: e.target.value})} 
                      className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
                    >
                      <option value="Pcs">Pieces (Pcs)</option>
                      <option value="Bags">Bags</option>
                      <option value="SqFt">SqFt</option>
                      <option value="Sheets">Sheets</option>
                      <option value="Ltrs">Liters</option>
                      <option value="Mtrs">Meters</option>
                    </select>
                  </div>
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-zinc-200 flex justify-end gap-3 bg-zinc-50 shrink-0">
              <button type="button" onClick={() => setIsItemModalOpen(false)} className="px-5 py-2.5 bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-semibold rounded-xl text-sm transition-all cursor-pointer">
                Cancel
              </button>
              <button type="submit" form="itemForm" disabled={submitting} className="px-6 py-2.5 bg-[#B45309] hover:bg-[#92400E] text-white font-medium rounded-xl text-sm shadow-sm transition-all cursor-pointer disabled:opacity-50">
                {submitting ? 'Saving...' : 'Save Item'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* --- RECORD MOVEMENT MODAL --- */}
      {isMovementModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-5 border-b border-zinc-200 flex justify-between items-center bg-zinc-50 shrink-0">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900">
                  {movementForm.type === 'IN' ? 'Add Stock to Godown' : 'Dispatch Material to Site'}
                </h2>
                <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mt-0.5">
                  {movementForm.type === 'IN' ? 'Record materials received at central storage' : 'Move materials from godown to an active project'}
                </p>
              </div>
              <button onClick={() => setIsMovementModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <form id="movementForm" onSubmit={handleRecordMovement} className="space-y-4">
                
                <div className="grid grid-cols-2 gap-2 p-1.5 bg-zinc-100 rounded-xl mb-2">
                  <button type="button" onClick={() => setMovementForm({...movementForm, type: 'IN', projectId: ''})} className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${movementForm.type === 'IN' ? 'bg-white text-emerald-700 shadow-sm' : 'text-zinc-400'}`}>INWARD</button>
                  <button type="button" onClick={() => setMovementForm({...movementForm, type: 'OUT'})} className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${movementForm.type === 'OUT' ? 'bg-white text-[#B45309] shadow-sm' : 'text-zinc-400'}`}>DISPATCH</button>
                </div>

                <div>
                  <label className={labelClass}>Select Material <span className="text-red-500">*</span></label>
                  <select 
                    required 
                    value={movementForm.itemId} 
                    onChange={e => setMovementForm({...movementForm, itemId: e.target.value})} 
                    className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
                  >
                    <option value="" disabled>Choose item...</option>
                    {items.map(i => (
                      <option key={i.id} value={i.id}>
                        {i.name || i.materialName} (Available: {i.totalStock !== undefined ? i.totalStock : (i.qty || 0)} {i.unit || 'Pcs'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Quantity <span className="text-red-500">*</span></label>
                    <input type="number" step="any" required placeholder="0" value={movementForm.quantity} onChange={e => setMovementForm({...movementForm, quantity: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Date</label>
                    <input type="date" required value={movementForm.date} onChange={e => setMovementForm({...movementForm, date: e.target.value})} className={inputClass} />
                  </div>
                </div>

                {movementForm.type === 'OUT' && (
                  <div>
                    <label className={labelClass}>Destination Project Site <span className="text-red-500">*</span></label>
                    <select 
                      required 
                      value={movementForm.projectId} 
                      onChange={e => setMovementForm({...movementForm, projectId: e.target.value})} 
                      className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
                    >
                      <option value="" disabled>Select active project...</option>
                      {projects.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name || p.projectName} ({p.clientName || 'Client'})</option>)}
                    </select>
                  </div>
                )}

                <div>
                  <label className={labelClass}>Notes / Reference</label>
                  <input type="text" placeholder="Challan no, vehicle no, etc." value={movementForm.notes} onChange={e => setMovementForm({...movementForm, notes: e.target.value})} className={inputClass} />
                </div>

              </form>
            </div>

            <div className="px-6 py-4 border-t border-zinc-200 flex justify-end gap-3 bg-zinc-50 shrink-0">
              <button type="button" onClick={() => setIsMovementModalOpen(false)} className="px-5 py-2.5 bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-semibold rounded-xl text-sm transition-all cursor-pointer">
                Cancel
              </button>
              <button type="submit" form="movementForm" disabled={submitting} className={`px-6 py-2.5 text-white font-medium rounded-xl text-sm shadow-sm transition-all cursor-pointer disabled:opacity-50 ${movementForm.type === 'IN' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#B45309] hover:bg-[#92400E]'}`}>
                {submitting ? 'Recording...' : `Confirm ${movementForm.type === 'IN' ? 'Inward' : 'Dispatch'}`}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}