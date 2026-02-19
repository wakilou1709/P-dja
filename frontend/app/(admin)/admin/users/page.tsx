'use client';

import { useEffect, useState } from 'react';
import { Edit, Ban, Users, Search } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { DataTable, Column, Action } from '@/components/admin/DataTable';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

export default function UsersManagement() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [newRole, setNewRole] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const filters: any = { page, limit: 10 };
      if (search) filters.search = search;
      if (roleFilter !== 'ALL') filters.role = roleFilter;
      if (statusFilter !== 'ALL') filters.status = statusFilter;
      const response = await adminApi.getUsers(filters);
      setUsers(response.users);
      setTotalPages(response.totalPages);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [page, search, roleFilter, statusFilter]);

  const handleEditUser = (user: any) => {
    setSelectedUser(user); setNewRole(user.role); setModalOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedUser || !newRole) return;
    try {
      await adminApi.updateUserRole(selectedUser.id, newRole);
      setModalOpen(false); fetchUsers();
    } catch (error) { console.error('Failed to update user role:', error); }
  };

  const handleSuspendUser = async (user: any) => {
    const newStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await adminApi.updateUserStatus(user.id, newStatus); fetchUsers();
    } catch (error) { console.error('Failed to update user status:', error); }
  };

  const columns: Column[] = [
    { key: 'email', label: 'Email', sortable: true },
    { key: 'firstName', label: 'Prénom', sortable: true },
    { key: 'lastName', label: 'Nom', sortable: true },
    {
      key: 'role', label: 'Rôle', sortable: true,
      render: (value) => (
        <span className={`neo-badge ${
          value === 'ADMIN' ? '' : value === 'MODERATOR' ? 'neo-badge-cyan' : 'neo-badge-green'
        }`}>
          {value}
        </span>
      ),
    },
    {
      key: 'status', label: 'Statut', sortable: true,
      render: (value) => (
        <span className={`neo-badge ${value === 'ACTIVE' ? 'neo-badge-green' : 'neo-badge-red'}`}>
          {value}
        </span>
      ),
    },
    {
      key: 'createdAt', label: 'Date création',
      render: (value) => new Date(value).toLocaleDateString('fr-FR'),
    },
  ];

  const actions: Action[] = [
    { label: 'Modifier', onClick: handleEditUser, variant: 'outline', icon: <Edit className="w-3.5 h-3.5" /> },
    { label: 'Suspendre', onClick: handleSuspendUser, variant: 'destructive', icon: <Ban className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse-glow" />
          <span className="text-xs text-slate-400 uppercase tracking-wider">Administration</span>
        </div>
        <h1 className="text-3xl font-bold text-white">Gestion des Utilisateurs</h1>
        <p className="text-slate-400 text-sm mt-1">Gérer les utilisateurs, rôles et permissions</p>
      </div>

      {/* Filters */}
      <div className="neo-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="icon-box-cyan w-7 h-7">
            <Search className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <span className="text-sm font-medium text-slate-300">Filtres</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-slate-400 uppercase tracking-wider mb-2">Rechercher</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-purple-400/50" />
              <input
                placeholder="Email, nom, prénom..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="neo-input w-full pl-9 pr-3 py-2.5 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 uppercase tracking-wider mb-2">Rôle</label>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="bg-[#151b30] border border-purple-500/15 text-slate-300 h-10">
                <SelectValue placeholder="Tous les rôles" />
              </SelectTrigger>
              <SelectContent className="bg-[#222840] border-purple-500/20">
                <SelectItem value="ALL">Tous les rôles</SelectItem>
                <SelectItem value="STUDENT">STUDENT</SelectItem>
                <SelectItem value="ADMIN">ADMIN</SelectItem>
                <SelectItem value="MODERATOR">MODERATOR</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 uppercase tracking-wider mb-2">Statut</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-[#151b30] border border-purple-500/15 text-slate-300 h-10">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent className="bg-[#222840] border-purple-500/20">
                <SelectItem value="ALL">Tous les statuts</SelectItem>
                <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                <SelectItem value="SUSPENDED">SUSPENDED</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <DataTable
        data={users}
        columns={columns}
        actions={actions}
        loading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      {/* Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-[#1c2136] border border-purple-500/20 shadow-neo-glow">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              Modifier l'utilisateur
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-xs text-slate-400 uppercase tracking-wider mb-2">Email</label>
              <input
                value={selectedUser?.email || ''}
                disabled
                className="neo-input w-full px-3 py-2.5 text-sm opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 uppercase tracking-wider mb-2">Rôle</label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="bg-[#151b30] border border-purple-500/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#222840] border-purple-500/20">
                  <SelectItem value="STUDENT">STUDENT</SelectItem>
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                  <SelectItem value="MODERATOR">MODERATOR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <button onClick={() => setModalOpen(false)} className="btn-ghost px-4 py-2 text-sm">Annuler</button>
            <button onClick={handleUpdateRole} className="btn-primary px-4 py-2 text-sm">Enregistrer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
