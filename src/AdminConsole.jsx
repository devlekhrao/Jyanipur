import React, { useState, useEffect } from 'react';

const AVAILABLE_PERMISSIONS = [
  { id: 'manage_users', label: 'Manage Personnel Directory' },
  { id: 'manage_roles', label: 'Create & Edit Roles' },
  { id: 'manage_sites', label: 'Manage Active Site Commands' },
  { id: 'view_fleet', label: 'View Heavy Fleet Deployment' },
  { id: 'approve_expenses', label: 'Approve Financial Expenses & Payouts' },
  { id: 'manage_invoices', label: 'Generate & Collect Invoices' }
];

export default function AdminConsole({ isOpen, onClose }) {
  const [activeSection, setActiveSection] = useState('ROLES'); 
  
  // Database States
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [isNewRoleModalOpen, setIsNewRoleModalOpen] = useState(false);

  // Form States
  const [newUser, setNewUser] = useState({ name: '', phone: '', role: '' });
  const [newRole, setNewRole] = useState({ name: '', permissions: [] });

  // --- FETCH DATA FROM BACKEND ON LOAD ---
  useEffect(() => {
    if (isOpen) {
      fetchRoles();
      fetchUsers();
    }
  }, [isOpen]);

  const fetchRoles = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/admin/roles');
      const data = await res.json();
      setRoles(data);
    } catch (err) { console.error("Failed to fetch roles", err); }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/admin/users');
      const data = await res.json();
      setUsers(data);
    } catch (err) { console.error("Failed to fetch personnel", err); }
  };

  if (!isOpen) return null;

  // --- SECURE API HANDLERS ---
  const handleCreateRole = async (e) => {
    e.preventDefault();
    if (!newRole.name.trim()) return alert('Role name is required.');
    
    const rolePayload = {
      id: `ROLE-${(roles.length + 1).toString().padStart(2, '0')}`,
      name: newRole.name,
      permissions: newRole.permissions
    };

    try {
      const res = await fetch('http://localhost:5000/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rolePayload)
      });
      if (res.ok) {
        fetchRoles();
        setNewRole({ name: '', permissions: [] });
        setIsNewRoleModalOpen(false);
      }
    } catch (err) { alert('Failed to connect to backend fortress.'); }
  };

  const handleTogglePermission = (permId) => {
    setNewRole(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permId) 
        ? prev.permissions.filter(p => p !== permId) 
        : [...prev.permissions, permId]
    }));
  };

  const handleRegisterUser = async (e) => {
    e.preventDefault();
    if (!newUser.name || !newUser.phone || newUser.phone.length !== 10 || !newUser.role) return alert('Fill all details.');
    
    const userPayload = {
      id: `JYN-USR-${(users.length + 1).toString().padStart(3, '0')}`,
      name: newUser.name,
      email: `${newUser.name.toLowerCase().replace(/\s+/g, '.')}@jyanipur.in`,
      phone: `+91 ${newUser.phone}`,
      role: newUser.role,
      site: 'UNASSIGNED' // Sites are managed in the main portal now
    };

    try {
      const res = await fetch('http://localhost:5000/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userPayload)
      });
      if (res.ok) {
        fetchUsers();
        setNewUser({ name: '', phone: '', role: '' });
        setIsNewUserModalOpen(false);
      }
    } catch (err) { alert('Failed to connect to backend fortress.'); }
  };

  const handleRevokeUser = async (userId) => {
    if(!window.confirm("Revoke this user's access?")) return;
    try { await fetch(`http://localhost:5000/api/admin/users/${userId}`, { method: 'DELETE' }); fetchUsers(); } 
    catch (err) { console.error(err); }
  };

  const handleDeleteRole = async (roleId) => {
    if(!window.confirm("Delete this custom role?")) return;
    try {
      const res = await fetch(`http://localhost:5000/api/admin/roles/${roleId}`, { method: 'DELETE' });
      if(res.ok) fetchRoles(); else alert("Cannot delete role. Users are assigned to it.");
    } catch (err) { console.error(err); }
  };

  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.phone.includes(searchQuery));

  return (
    <div className="fixed inset-0 z-[10000] bg-[#FDFBF7] text-[#1C1917] font-['Poppins'] flex flex-col overflow-hidden selection:bg-[#B45309] selection:text-white">
      
      {/* TOP COMMAND BAR */}
      <header className="h-16 bg-white border-b border-zinc-200 px-6 flex items-center justify-between shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#B45309] flex items-center justify-center shadow-md">
              <img src="/jyanipur.png" alt="J" className="h-5 brightness-0 invert" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-widest uppercase text-zinc-900">Workspace Admin</span>
              <span className="text-[10px] text-zinc-500 block font-mono">admin.jyanipur.in</span>
            </div>
          </div>
          <div className="h-6 w-[1px] bg-zinc-200 hidden md:block"></div>
          <div className="relative w-72 lg:w-96 hidden md:block">
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search directory..." className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 pl-10 pr-4 text-xs text-zinc-900 focus:bg-white focus:border-[#B45309] focus:outline-none transition-all font-mono shadow-inner" />
            <span className="absolute left-3 top-2.5 text-zinc-400 text-sm">🔍</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] px-3 py-1.5 rounded-full bg-[#B45309]/10 text-[#B45309] font-bold border border-[#B45309]/20 uppercase tracking-widest">Master Key Active</span>
          <button onClick={onClose} className="px-5 py-2 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-bold uppercase tracking-widest rounded-xl transition-colors cursor-pointer">Close Admin</button>
        </div>
      </header>

      {/* MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT NAV DRAWER - STRICTLY IAM */}
        <aside className="w-64 bg-white border-r border-zinc-200 p-4 flex flex-col justify-between shrink-0 z-10">
          <div className="space-y-6 overflow-y-auto">
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-zinc-400 uppercase px-3 py-2 tracking-widest">Identity & Access</div>
              <button onClick={() => setActiveSection('ROLES')} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer ${activeSection === 'ROLES' ? 'bg-[#B45309] text-white shadow-md' : 'text-zinc-600 hover:bg-zinc-50'}`}>🛡️ Roles Builder</button>
              <button onClick={() => setActiveSection('USERS')} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer ${activeSection === 'USERS' ? 'bg-[#B45309] text-white shadow-md' : 'text-zinc-600 hover:bg-zinc-50'}`}>👤 Directory</button>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-zinc-400 uppercase px-3 py-2 tracking-widest">Security</div>
              <button onClick={() => setActiveSection('SECURITY')} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer ${activeSection === 'SECURITY' ? 'bg-[#B45309] text-white shadow-md' : 'text-zinc-600 hover:bg-zinc-50'}`}>🔒 Mobile Policies</button>
            </div>
          </div>
        </aside>

        {/* RIGHT CONTENT WORKSPACE */}
        <main className="flex-1 overflow-y-auto p-8 lg:p-12 bg-[#FDFBF7] relative">
          <div className="flex justify-between items-end mb-10 relative z-10">
            <div>
              <h1 className="text-3xl font-light text-zinc-900 tracking-tight">
                {activeSection === 'ROLES' && 'Roles & Permissions Builder'}
                {activeSection === 'USERS' && 'Personnel Directory'}
                {activeSection === 'SECURITY' && 'Enterprise Security Policies'}
              </h1>
            </div>
            {activeSection === 'ROLES' && <button onClick={() => setIsNewRoleModalOpen(true)} className="px-6 py-3 bg-[#B45309] hover:bg-[#92400E] text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-lg transition-all cursor-pointer">+ Create Role</button>}
            {activeSection === 'USERS' && <button onClick={() => setIsNewUserModalOpen(true)} className="px-6 py-3 bg-[#B45309] hover:bg-[#92400E] text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-lg transition-all cursor-pointer">+ Register Personnel</button>}
          </div>

          <div className="relative z-10">
            {/* ROLES BUILDER */}
            {activeSection === 'ROLES' && (
              <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase tracking-widest text-[10px]">
                    <tr><th className="p-5 font-bold">Role Name</th><th className="p-5 font-bold">Granted Permissions</th><th className="p-5 font-bold text-right">Action</th></tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-zinc-800">
                    {roles.length === 0 && <tr><td colSpan="3" className="p-8 text-center text-zinc-400 font-mono italic">No roles configured.</td></tr>}
                    {roles.map((r) => (
                      <tr key={r.id} className="hover:bg-zinc-50 transition-colors">
                        <td className="p-5 font-bold text-zinc-900 text-sm">{r.name}</td>
                        <td className="p-5">
                          <div className="flex flex-wrap gap-2">
                            {r.permissions.map(perm => (
                              <span key={perm} className="px-2 py-1 bg-zinc-100 border border-zinc-200 rounded-md text-[9px] uppercase tracking-widest text-zinc-600">{perm.replace('_', ' ')}</span>
                            ))}
                          </div>
                        </td>
                        <td className="p-5 text-right">
                          {!r.isSystem && <button onClick={() => handleDeleteRole(r.id)} className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer">Delete</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* USERS DIRECTORY */}
            {activeSection === 'USERS' && (
              <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase tracking-widest text-[10px]">
                    <tr><th className="p-5 font-bold">Personnel Details</th><th className="p-5 font-bold">Registered Mobile</th><th className="p-5 font-bold">Assigned Role</th><th className="p-5 font-bold text-right">Access</th></tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-zinc-800 font-mono">
                    {users.length === 0 && <tr><td colSpan="4" className="p-8 text-center text-zinc-400 italic">No personnel registered.</td></tr>}
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-zinc-50 transition-colors">
                        <td className="p-5"><div className="font-bold text-zinc-900 font-sans text-sm">{u.name}</div></td>
                        <td className="p-5 text-[#B45309] font-bold">{u.phone}</td>
                        <td className="p-5"><span className="px-3 py-1.5 rounded-full font-bold text-[9px] uppercase tracking-widest bg-zinc-100 text-zinc-700 border border-zinc-200">{u.role}</span></td>
                        <td className="p-5 text-right"><button onClick={() => handleRevokeUser(u.id)} className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer">Revoke</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* SECURITY POLICIES */}
            {activeSection === 'SECURITY' && (
              <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8 max-w-3xl">
                <div className="flex items-center justify-between p-5 bg-zinc-50 rounded-xl border border-zinc-200">
                  <div>
                    <div className="font-bold text-zinc-900 text-sm">Enforce SMS OTP Logins</div>
                    <div className="text-xs text-zinc-500 mt-1">Require mobile OTP for all non-admin portal logins.</div>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#B45309] cursor-pointer" />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* MODALS */}
      {isNewRoleModalOpen && (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm z-[10001] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200 w-full max-w-lg p-8 relative">
            <button onClick={() => setIsNewRoleModalOpen(false)} className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-800 cursor-pointer font-mono text-xs uppercase font-bold">✕</button>
            <h3 className="text-xl font-light text-zinc-900 mb-6 font-sans">Create Custom Role</h3>
            <form onSubmit={handleCreateRole} className="space-y-6 font-sans text-xs">
              <div>
                <label className="block text-zinc-500 font-bold uppercase tracking-widest mb-2 text-[10px]">Role Title</label>
                <input type="text" value={newRole.name} onChange={(e) => setNewRole({ ...newRole, name: e.target.value })} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:outline-none focus:border-[#B45309]" required />
              </div>
              <div>
                <label className="block text-zinc-500 font-bold uppercase tracking-widest mb-3 text-[10px]">Assign Access Permissions</label>
                <div className="space-y-2">
                  {AVAILABLE_PERMISSIONS.map(perm => (
                    <label key={perm.id} className="flex items-center gap-3 p-3 bg-white border border-zinc-200 rounded-xl cursor-pointer hover:border-[#B45309]/50 transition-colors shadow-sm">
                      <input type="checkbox" checked={newRole.permissions.includes(perm.id)} onChange={() => handleTogglePermission(perm.id)} className="w-4 h-4 accent-[#B45309]" />
                      <span className="text-zinc-700 font-medium">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button type="submit" className="w-full py-4 bg-[#B45309] hover:bg-[#92400E] text-white font-bold uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-lg">Save Role</button>
            </form>
          </div>
        </div>
      )}

      {isNewUserModalOpen && (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm z-[10001] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200 w-full max-w-md p-8 relative">
            <button onClick={() => setIsNewUserModalOpen(false)} className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-800 cursor-pointer font-mono text-xs uppercase font-bold">✕</button>
            <h3 className="text-xl font-light text-zinc-900 mb-6 font-sans">Register User</h3>
            <form onSubmit={handleRegisterUser} className="space-y-4 font-mono text-xs">
              <div><label className="block text-zinc-500 uppercase tracking-widest mb-2 font-bold text-[10px]">Full Name</label><input type="text" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3" required /></div>
              <div><label className="block text-zinc-500 uppercase tracking-widest mb-2 font-bold text-[10px]">Mobile Number</label><input type="tel" maxLength="10" value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 px-4" required /></div>
              <div>
                <label className="block text-zinc-500 uppercase tracking-widest mb-2 font-bold text-[10px]">Assign Role</label>
                <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3" required>
                  <option value="" disabled>Select a role...</option>
                  {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                </select>
              </div>
              <button type="submit" className="w-full py-4 mt-4 bg-[#B45309] text-white font-bold uppercase tracking-widest rounded-xl">Authorize Personnel</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}