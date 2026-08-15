import React, { useState, useEffect } from 'react';
import { getProjects, getInventoryItems, getInventoryMovements, saveInventoryItem, recordInventoryMovement } from '..../db';

export default function MobileInventory() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Godown'); // 'Godown' or 'Movements'
  
  const [items, setItems] = useState([]);
  const [movements, setMovements] = useState([]);
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals / Bottom Sheets
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
      console.warn("Ensure inventory functions exist in db.js");
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
    try {
      await saveInventoryItem(itemForm);
      setIsItemModalOpen(false);
      setItemForm({ name: '', category: 'Electrical', unit: 'Pcs' });
      await loadData();
    } catch (err) {
      alert("Failed to save item.");
    }
  };

  const handleRecordMovement = async (e) => {
    e.preventDefault();
    if (!movementForm.itemId || !movementForm.quantity) return alert("Item and Quantity required.");
    if (movementForm.type === 'OUT' && !movementForm.projectId) return alert("Project Site is required for dispatches.");
    
    if (movementForm.type === 'OUT') {
      const currentItem = items.find(i => i.id === parseInt(movementForm.itemId));
      if (currentItem && parseFloat(movementForm.quantity) > currentItem.totalStock) {
        return alert(`Insufficient stock in Godown. You only have ${currentItem.totalStock} ${currentItem.unit} available.`);
      }
    }

    try {
      await recordInventoryMovement({
        ...movementForm,
        quantity: parseFloat(movementForm.quantity),
        projectId: movementForm.type === 'OUT' ? parseInt(movementForm.projectId) : null
      });
      setIsMovementModalOpen(false);
      setMovementForm({ itemId: '', type: 'IN', quantity: '', projectId: '', date: new Date().toISOString().split('T')[0], notes: '' });
      await loadData();
    } catch (err) {
      alert("Failed to record movement.");
    }
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

  const filteredItems = items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()) || i.category.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredMovements = movements.filter(m => m.itemName.toLowerCase().includes(searchQuery.toLowerCase()) || (m.projectName && m.projectName.toLowerCase().includes(searchQuery.toLowerCase())));

  const inputClass = "w-full px-4 py-3.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-zinc-900 text-sm font-medium transition-all shadow-sm";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1";

  const lowStockCount = items.filter(i => i.totalStock <= 5 && i.totalStock > 0).length;
  const outOfStockCount = items.filter(i => i.totalStock === 0).length;

  return (
    <div className="w-full h-full flex flex-col font-['Poppins']">
      
      {/* HEADER SECTION */}
      <div className="mb-3 shrink-0">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Godown & Stock</h2>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Material Dispatches</p>
          </div>
          
          <div className="flex gap-1.5">
            <button 
              onClick={() => setIsItemModalOpen(true)}
              className="bg-white border border-zinc-200 text-zinc-800 font-extrabold px-3 py-2 rounded-xl text-[10px] uppercase tracking-wider shadow-sm active:scale-95"
            >
              + Item
            </button>
            <button 
              onClick={() => openMovementModal(null, 'OUT')}
              className="bg-[#1E3A8A] text-white font-black px-3.5 py-2 rounded-xl text-[10px] uppercase tracking-wider shadow-md active:scale-95"
            >
              Dispatch
            </button>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="bg-white border border-zinc-200 rounded-2xl px-3 py-2 shadow-sm flex items-center mb-2">
          <span className="text-xs text-zinc-400 mr-2">🔍</span>
          <input 
            type="text" 
            placeholder="Search materials or sites..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs font-medium text-zinc-800 outline-none placeholder:text-zinc-400"
          />
        </div>

        {/* VIEW SEGMENTED CONTROL */}
        <div className="flex bg-zinc-200/80 p-1 rounded-2xl gap-1">
          <button
            onClick={() => setActiveTab('Godown')}
            className={`flex-1 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all ${
              activeTab === 'Godown' ? 'bg-white text-[#1E3A8A] shadow-sm' : 'text-zinc-500'
            }`}
          >
            Godown Stock ({items.length})
          </button>
          <button
            onClick={() => setActiveTab('Movements')}
            className={`flex-1 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all ${
              activeTab === 'Movements' ? 'bg-white text-[#1E3A8A] shadow-sm' : 'text-zinc-500'
            }`}
          >
            Dispatches ({movements.length})
          </button>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="grid grid-cols-2 gap-2 mb-3 shrink-0">
        <div className="bg-white p-3 rounded-2xl border border-amber-200 shadow-sm flex justify-between items-center">
          <div>
            <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest block">Low Stock Alerts</span>
            <p className="text-lg font-black text-amber-700">{lowStockCount}</p>
          </div>
          <span className="text-xl">⚠️</span>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-red-200 shadow-sm flex justify-between items-center">
          <div>
            <span className="text-[8px] font-black text-red-500 uppercase tracking-widest block">Out of Stock</span>
            <p className="text-lg font-black text-red-600">{outOfStockCount}</p>
          </div>
          <span className="text-xl">🚫</span>
        </div>
      </div>

      {/* CONTENT LIST */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {loading ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-xs">Loading inventory data...</div>
        ) : activeTab === 'Godown' ? (
          filteredItems.length === 0 ? (
            <div className="text-center py-12 bg-white/50 border border-zinc-200 border-dashed rounded-3xl mt-2">
              <span className="text-3xl mb-2 block">📦</span>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">No materials found in godown</p>
            </div>
          ) : (
            filteredItems.map(item => (
              <div key={item.id} className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-3 active:scale-[0.99] transition-transform">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="bg-zinc-100 text-zinc-700 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                      {item.category}
                    </span>
                    <h4 className="font-extrabold text-zinc-900 text-sm mt-1">{item.name}</h4>
                  </div>

                  <div className="text-right">
                    <span className={`text-base font-black ${item.totalStock === 0 ? 'text-red-500' : item.totalStock <= 5 ? 'text-amber-500' : 'text-emerald-600'}`}>
                      {item.totalStock}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-bold ml-1">{item.unit}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-zinc-100">
                  <button 
                    onClick={() => openMovementModal(item, 'IN')}
                    className="flex-1 py-2 bg-emerald-50 text-emerald-700 font-black rounded-xl text-[10px] uppercase tracking-wider active:scale-95 transition-transform"
                  >
                    + Stock In
                  </button>
                  <button 
                    onClick={() => openMovementModal(item, 'OUT')}
                    className="flex-1 py-2 bg-blue-50 text-[#1E3A8A] font-black rounded-xl text-[10px] uppercase tracking-wider active:scale-95 transition-transform"
                  >
                    Dispatch Out
                  </button>
                </div>
              </div>
            ))
          )
        ) : (
          filteredMovements.length === 0 ? (
            <div className="text-center py-12 bg-white/50 border border-zinc-200 border-dashed rounded-3xl mt-2">
              <span className="text-3xl mb-2 block">🚚</span>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">No dispatch history recorded</p>
            </div>
          ) : (
            filteredMovements.map(mov => (
              <div key={mov.id} className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-2 active:scale-[0.99] transition-transform">
                <div className="flex justify-between items-start">
                  <div>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                      mov.type === 'IN' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-[#1E3A8A]'
                    }`}>
                      {mov.type === 'IN' ? 'INWARD' : 'DISPATCH'}
                    </span>
                    <h4 className="font-extrabold text-zinc-900 text-sm mt-1">{mov.itemName}</h4>
                  </div>
                  <p className="text-sm font-black text-zinc-900">{mov.quantity} <span className="text-[10px] text-zinc-400 font-bold">{mov.unit}</span></p>
                </div>

                <div className="pt-2 border-t border-zinc-100 flex justify-between items-center text-[10px]">
                  <span className="font-bold text-zinc-500">{mov.projectName || 'Central Godown'}</span>
                  <span className="text-zinc-400 font-semibold">{mov.date}</span>
                </div>

                {mov.notes && (
                  <p className="text-xs text-zinc-500 bg-zinc-50 p-2 rounded-xl border border-zinc-100">
                    Ref: {mov.notes}
                  </p>
                )}
              </div>
            ))
          )
        )}
      </div>

      {/* MODAL 1: ADD MATERIAL ITEM SHEET */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full rounded-t-[2.5rem] shadow-2xl p-6 flex flex-col animate-in slide-in-from-bottom-full duration-300">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3 mb-4">
              <div>
                <h2 className="text-xl font-extrabold text-zinc-900">Add Material Type</h2>
                <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest">Register to Master Catalog</p>
              </div>
              <button onClick={() => setIsItemModalOpen(false)} className="text-zinc-400 font-bold text-sm">✕</button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4 pb-6">
              <div>
                <label className={labelClass}>Material Name <span className="text-red-500">*</span></label>
                <input type="text" required placeholder="e.g. Plywood 18mm Commercial" value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} className={inputClass} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Category</label>
                  <select value={itemForm.category} onChange={e => setItemForm({...itemForm, category: e.target.value})} className={inputClass}>
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
                  <select value={itemForm.unit} onChange={e => setItemForm({...itemForm, unit: e.target.value})} className={inputClass}>
                    <option value="Pcs">Pieces (Pcs)</option>
                    <option value="Bags">Bags</option>
                    <option value="SqFt">SqFt</option>
                    <option value="Sheets">Sheets</option>
                    <option value="Ltrs">Liters</option>
                    <option value="Mtrs">Meters</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="w-full py-4 bg-[#1E3A8A] text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-lg active:scale-[0.98] transition-transform mt-2">
                Save Material Master
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DISPATCH / STOCK MOVEMENT SHEET */}
      {isMovementModalOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full h-[85vh] rounded-t-[2.5rem] shadow-2xl flex flex-col animate-in slide-in-from-bottom-full duration-300">
            <div className="px-6 pt-6 pb-4 border-b border-zinc-100 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-extrabold text-zinc-900">
                  {movementForm.type === 'IN' ? 'Stock Inward' : 'Dispatch to Site'}
                </h2>
                <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest">Inventory Log</p>
              </div>
              <button onClick={() => setIsMovementModalOpen(false)} className="w-8 h-8 flex items-center justify-center bg-zinc-100 text-zinc-600 rounded-full font-bold active:bg-zinc-200">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <form id="movementForm" onSubmit={handleRecordMovement} className="space-y-4 pb-20">
                
                <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 rounded-2xl">
                  <button type="button" onClick={() => setMovementForm({...movementForm, type: 'IN', projectId: ''})} className={`py-2 rounded-xl text-xs font-extrabold transition-all ${movementForm.type === 'IN' ? 'bg-white text-emerald-600 shadow-sm' : 'text-zinc-400'}`}>INWARD</button>
                  <button type="button" onClick={() => setMovementForm({...movementForm, type: 'OUT'})} className={`py-2 rounded-xl text-xs font-extrabold transition-all ${movementForm.type === 'OUT' ? 'bg-white text-[#1E3A8A] shadow-sm' : 'text-zinc-400'}`}>DISPATCH</button>
                </div>

                <div>
                  <label className={labelClass}>Material <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select required value={movementForm.itemId} onChange={e => setMovementForm({...movementForm, itemId: e.target.value})} className={`${inputClass} appearance-none font-bold`}>
                      <option value="" disabled>Choose material...</option>
                      {items.map(i => <option key={i.id} value={i.id}>{i.name} (Available: {i.totalStock} {i.unit})</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">▼</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Quantity <span className="text-red-500">*</span></label>
                    <input type="number" step="any" inputMode="decimal" required placeholder="0" value={movementForm.quantity} onChange={e => setMovementForm({...movementForm, quantity: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Date</label>
                    <input type="date" required value={movementForm.date} onChange={e => setMovementForm({...movementForm, date: e.target.value})} className={inputClass} />
                  </div>
                </div>

                {movementForm.type === 'OUT' && (
                  <div>
                    <label className={labelClass}>Destination Project Site <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <select required value={movementForm.projectId} onChange={e => setMovementForm({...movementForm, projectId: e.target.value})} className={`${inputClass} appearance-none font-bold`}>
                        <option value="" disabled>Select destination project...</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name} ({p.clientName})</option>)}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">▼</div>
                    </div>
                  </div>
                )}

                <div>
                  <label className={labelClass}>Notes / Vehicle Ref</label>
                  <input type="text" placeholder="Challan / Vehicle number..." value={movementForm.notes} onChange={e => setMovementForm({...movementForm, notes: e.target.value})} className={inputClass} />
                </div>

              </form>
            </div>

            <div className="px-6 py-4 pb-[calc(env(safe-area-inset-bottom,20px)+16px)] border-t border-zinc-100 bg-white shrink-0">
              <button 
                type="submit" 
                form="movementForm"
                className={`w-full py-4 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-lg active:scale-[0.98] transition-transform ${
                  movementForm.type === 'IN' ? 'bg-emerald-600' : 'bg-[#1E3A8A]'
                }`}
              >
                Confirm {movementForm.type === 'IN' ? 'Inward Stock' : 'Dispatch Out'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}