import React, { useState, useEffect } from 'react';
import { getTasks, saveTask, updateTaskStatus, deleteTask, getProjects, getEmployees } from '../db';
import { exportToCSV } from '../utils';

export default function TaskBoard() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    projectId: '', title: '', description: '', status: 'To Do', dueDate: new Date().toISOString().split('T')[0], assignedTo: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [t, p, e] = await Promise.all([getTasks(), getProjects(), getEmployees()]);
      setTasks(t || []);
      setProjects((p || []).filter(proj => proj.status !== 'Completed'));
      setEmployees((e || []).filter(emp => emp.status === 'Active'));
    } catch (err) {
      console.warn("Ensure task functions exist in db.js");
      setTasks([]);
      setProjects([]);
      setEmployees([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    await saveTask(formData);
    setIsModalOpen(false);
    setFormData({ projectId: '', title: '', description: '', status: 'To Do', dueDate: new Date().toISOString().split('T')[0], assignedTo: '' });
    await loadData();
  };

  const handleStatusMove = async (id, newStatus) => {
    await updateTaskStatus(id, newStatus);
    await loadData();
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this task?")) {
      await deleteTask(id);
      await loadData();
    }
  };

  const handleExport = () => {
    const exportData = tasks.map(t => ({
      'Task': t.title,
      'Project': t.projectName || 'General Office',
      'Status': t.status,
      'Due Date': t.dueDate,
      'Assignee': t.assignedTo || 'Unassigned'
    }));
    exportToCSV('Jyanipur_Tasks', exportData);
  };

  const columns = ['To Do', 'In Progress', 'Done'];

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-inset focus:ring-[#B45309] text-zinc-900 text-sm font-medium transition-all shadow-sm";
  const labelClass = "block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 ml-0.5";

  return (
    <div className="w-full h-full flex flex-col">
      
      {/* HEADER CONTROLS */}
      <div className="flex justify-between items-center pb-5 mb-6 border-b border-zinc-200 shrink-0 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Project Task Board</h2>
          <p className="text-zinc-500 text-sm mt-0.5 font-medium">Assign work, set deadlines, and track completion across sites.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => window.print()} className="bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm cursor-pointer flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0v-2.25a2.25 2.25 0 012.25-2.25h6a2.25 2.25 0 012.25 2.25v2.25z" />
            </svg>
            <span className="hidden sm:inline">Save PDF</span>
          </button>
          <button onClick={handleExport} className="bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm cursor-pointer flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <button onClick={() => setIsModalOpen(true)} className="bg-[#B45309] hover:bg-[#92400E] text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm cursor-pointer flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Task
          </button>
        </div>
      </div>

      {/* KANBAN BOARD */}
      {loading ? (
        <div className="py-20 text-center text-zinc-400 font-medium text-xs flex-1 flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-4 border-zinc-200 border-t-[#B45309] rounded-full animate-spin"></div>
          <p>Loading board...</p>
        </div>
      ) : (
        <div className="flex w-full gap-5 flex-1 min-h-0 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] print:block">
          {columns.map(col => (
            <div key={col} className="flex-1 min-w-[300px] flex flex-col bg-zinc-50/50 border border-zinc-200/80 rounded-2xl shadow-sm overflow-hidden print:w-full print:mb-8 print:border-none print:shadow-none">
              
              {/* Column Header */}
              <div className="px-4 py-3.5 border-b border-zinc-200 bg-white flex justify-between items-center shrink-0">
                <h3 className="text-[11px] font-bold text-zinc-800 uppercase tracking-widest flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    col === 'Done' ? 'bg-emerald-500' : 
                    col === 'In Progress' ? 'bg-blue-500' : 'bg-amber-500'
                  }`}></span>
                  {col}
                </h3>
                <span className="bg-zinc-100 text-zinc-500 text-[10px] font-bold px-2 py-0.5 rounded-md">
                  {tasks.filter(t => t.status === col).length}
                </span>
              </div>
              
              {/* Column Body */}
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {tasks.filter(t => t.status === col).map(task => {
                  const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'Done';
                  
                  return (
                    <div key={task.id} className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-[#B45309]/30 transition-all group relative print:border-b print:shadow-none print:rounded-none print:p-2 flex flex-col">
                      
                      {/* Tags & Delete */}
                      <div className="flex justify-between items-start mb-2">
                        <span className="inline-block bg-zinc-100 text-zinc-600 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                          {task.projectName || 'General Office'}
                        </span>
                        <button onClick={() => handleDelete(task.id)} className="text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer print:hidden">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                      
                      {/* Content */}
                      <h4 className="font-semibold text-zinc-900 text-sm mb-1.5 leading-snug">{task.title}</h4>
                      {task.description && <p className="text-xs text-zinc-500 mb-4 line-clamp-2 leading-relaxed">{task.description}</p>}
                      
                      {/* Footer Metadata & Status */}
                      <div className="flex justify-between items-end mt-auto pt-3 border-t border-zinc-100">
                        <div className="flex flex-col gap-1.5">
                          <span className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded w-fit ${
                            isOverdue ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-zinc-50 text-zinc-500 border border-zinc-100'
                          }`}>
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            {task.dueDate}
                          </span>
                          <span className="text-[10px] font-medium text-zinc-500 flex items-center gap-1.5 px-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            {task.assignedTo || 'Unassigned'}
                          </span>
                        </div>
                        
                        <select 
                          value={task.status} 
                          onChange={(e) => handleStatusMove(task.id, e.target.value)}
                          className={`appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23A1A1AA%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%223%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.4rem_center] bg-[length:0.6rem_0.6rem] pr-6 pl-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider border outline-none cursor-pointer transition-all print:hidden ${
                            task.status === 'Done' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                            task.status === 'In Progress' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                            'bg-zinc-50 border-zinc-200 text-zinc-700'
                          }`}
                        >
                          {columns.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD TASK MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-zinc-200 flex justify-between items-center bg-zinc-50 shrink-0">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900">New Task</h2>
                <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mt-0.5">Assign task to site or office</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <form id="taskForm" onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className={labelClass}>Project Site</label>
                  <select value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value})} className={`${inputClass} appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}>
                    <option value="">Office / General Admin</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Task Title <span className="text-red-500">*</span></label>
                  <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className={inputClass} placeholder="e.g. Select laminates with client" />
                </div>
                <div>
                  <label className={labelClass}>Details</label>
                  <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className={`${inputClass} resize-y min-h-[80px]`} placeholder="Add specific task instructions..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Due Date <span className="text-red-500">*</span></label>
                    <input type="date" required value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Assign To</label>
                    <select value={formData.assignedTo} onChange={e => setFormData({...formData, assignedTo: e.target.value})} className={`${inputClass} appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}>
                      <option value="">Select Staff...</option>
                      {employees.map(emp => <option key={emp.id} value={emp.fullName}>{emp.fullName}</option>)}
                    </select>
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-zinc-200 flex justify-end gap-3 bg-zinc-50 shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-semibold rounded-xl text-sm transition-all cursor-pointer">
                Cancel
              </button>
              <button type="submit" form="taskForm" className="px-6 py-2.5 bg-[#B45309] hover:bg-[#92400E] text-white font-medium rounded-xl text-sm shadow-sm transition-all cursor-pointer">
                Save Task
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}