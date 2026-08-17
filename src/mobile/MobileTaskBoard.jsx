import React, { useState, useEffect } from 'react';
import { getTasks, saveTask, updateTaskStatus, deleteTask, getProjects, getEmployees } from '../db';
import { exportToCSV } from '../utils';

export default function MobileTaskBoard() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [activeColumn, setActiveColumn] = useState('To Do');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    projectId: '', title: '', description: '', status: 'To Do', dueDate: new Date().toISOString().split('T')[0], assignedTo: ''
  });

  const columns = ['To Do', 'In Progress', 'Done'];

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
    if (!formData.title) {
      alert("Task title is required.");
      return;
    }
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
      'Project': t.projectName,
      'Status': t.status,
      'Due Date': t.dueDate,
      'Assignee': t.assignedTo
    }));
    exportToCSV('Jyanipur_Tasks', exportData);
  };

  const inputClass = "w-full px-4 py-3.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-zinc-900 text-sm font-medium transition-all shadow-sm";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1";

  const columnTasks = tasks.filter(t => t.status === activeColumn);

  return (
    <div className="w-full h-full flex flex-col font-sans">
      
      {/* HEADER SECTION */}
      <div className="mb-3 shrink-0">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Task Board</h2>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Project Action Items</p>
          </div>
          
          <div className="flex gap-1.5">
            <button 
              onClick={handleExport}
              className="bg-white border border-zinc-200 text-zinc-800 font-bold px-3 py-2 rounded-xl text-[10px] uppercase tracking-wider shadow-sm active:scale-95"
            >
              📥 CSV
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-[#1E3A8A] text-white font-semibold text-[11px] px-3.5 py-2 rounded-xl text-[10px] uppercase tracking-wider shadow-md active:scale-95"
            >
              + Add Task
            </button>
          </div>
        </div>

        {/* SWIPEABLE COLUMN SEGMENTED CONTROL */}
        <div className="flex bg-zinc-200/80 p-1 rounded-2xl gap-1">
          {columns.map(col => {
            const count = tasks.filter(t => t.status === col).length;
            const isActive = activeColumn === col;

            return (
              <button
                key={col}
                onClick={() => setActiveColumn(col)}
                className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                  isActive ? 'bg-white text-[#1E3A8A] shadow-sm' : 'text-zinc-500'
                }`}
              >
                <span>{col}</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[8px] font-semibold text-[11px] ${
                  isActive ? 'bg-blue-50 text-[#1E3A8A]' : 'bg-zinc-300 text-zinc-600'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TASK CARDS STREAM */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {loading ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-xs">Loading task board...</div>
        ) : columnTasks.length === 0 ? (
          <div className="text-center py-12 bg-white/50 border border-zinc-200 border-dashed rounded-3xl mt-2">
            <span className="text-3xl mb-2 block">📋</span>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">No tasks in "{activeColumn}"</p>
          </div>
        ) : (
          columnTasks.map(task => {
            const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'Done';

            return (
              <div 
                key={task.id} 
                className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-3 active:scale-[0.99] transition-transform"
              >
                {/* CARD HEADER */}
                <div className="flex justify-between items-start">
                  <div>
                    <span className="bg-blue-50 text-[#1E3A8A] text-[8px] font-semibold text-[11px] px-2 py-0.5 rounded uppercase tracking-wider">
                      {task.projectName || 'General Office'}
                    </span>
                    <h4 className="font-bold text-zinc-900 text-sm mt-1">{task.title}</h4>
                  </div>

                  <button 
                    onClick={() => handleDelete(task.id)}
                    className="text-zinc-300 hover:text-red-500 text-xs font-bold p-1"
                  >
                    ✕
                  </button>
                </div>

                {/* DESCRIPTION */}
                {task.description && (
                  <p className="text-xs text-zinc-600 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100 leading-relaxed">
                    {task.description}
                  </p>
                )}

                {/* METRICS & MOVE CONTROL */}
                <div className="pt-2 border-t border-zinc-100 flex justify-between items-center text-xs">
                  <span className={`text-[9px] font-semibold text-[11px] px-2 py-0.5 rounded-md ${
                    isOverdue ? 'bg-red-100 text-red-600' : 'bg-zinc-100 text-zinc-600'
                  }`}>
                    Due: {task.dueDate}
                  </span>

                  <span className="text-[10px] font-bold text-zinc-500">
                    🧑 {task.assignedTo || 'Unassigned'}
                  </span>
                </div>

                {/* STATUS MOVE SELECTOR */}
                <div className="relative pt-1">
                  <select 
                    value={task.status} 
                    onChange={(e) => handleStatusMove(task.id, e.target.value)}
                    className="w-full bg-zinc-100 border border-zinc-200 text-zinc-800 text-[10px] font-bold uppercase tracking-wider rounded-xl py-2 px-3 outline-none appearance-none pr-8"
                  >
                    {columns.map(c => <option key={c} value={c}>Move to: {c}</option>)}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400 text-xs pt-1">▼</div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* CREATE TASK BOTTOM SHEET */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full h-[85vh] rounded-t-[2.5rem] shadow-2xl flex flex-col animate-in slide-in-from-bottom-full duration-300">
            
            {/* Modal Header */}
            <div className="px-6 pt-6 pb-4 border-b border-zinc-100 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">Create New Task</h2>
                <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest mt-0.5">Assign Work & Deadline</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center bg-zinc-100 text-zinc-600 rounded-full font-bold active:bg-zinc-200"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <form id="taskForm" onSubmit={handleSave} className="space-y-4 pb-20">
                
                <div>
                  <label className={labelClass}>Project Site</label>
                  <div className="relative">
                    <select 
                      value={formData.projectId} 
                      onChange={e => setFormData({...formData, projectId: e.target.value})} 
                      className={`${inputClass} appearance-none font-bold`}
                    >
                      <option value="">Office / General Admin</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">▼</div>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Task Title <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Select laminate samples with client" 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})} 
                    className={inputClass} 
                  />
                </div>

                <div>
                  <label className={labelClass}>Task Details</label>
                  <textarea 
                    placeholder="Add specific instructions or notes..." 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                    className={`${inputClass} min-h-[90px] resize-none`} 
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>Due Date <span className="text-red-500">*</span></label>
                    <input 
                      type="date" 
                      required 
                      value={formData.dueDate} 
                      onChange={e => setFormData({...formData, dueDate: e.target.value})} 
                      className={inputClass} 
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Assign Staff</label>
                    <div className="relative">
                      <select 
                        value={formData.assignedTo} 
                        onChange={e => setFormData({...formData, assignedTo: e.target.value})} 
                        className={`${inputClass} appearance-none`}
                      >
                        <option value="">Select Staff...</option>
                        {employees.map(emp => <option key={emp.id} value={emp.fullName}>{emp.fullName}</option>)}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">▼</div>
                    </div>
                  </div>
                </div>

              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 pb-[calc(env(safe-area-inset-bottom,20px)+16px)] border-t border-zinc-100 bg-white shrink-0">
              <button 
                type="submit" 
                form="taskForm"
                className="w-full py-4 bg-[#1E3A8A] text-white font-semibold text-[11px] rounded-xl text-xs uppercase tracking-wider shadow-lg active:scale-[0.98] transition-transform"
              >
                Save Task
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}