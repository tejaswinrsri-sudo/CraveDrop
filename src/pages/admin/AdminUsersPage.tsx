import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, ShieldCheck, UserCheck, ShieldAlert, Mail } from 'lucide-react';
import { api } from '../../lib/api';
import { User } from '../../types';
import toast from 'react-hot-toast';

export const AdminUsersPage: React.FC = () => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ users: User[]; total: number }>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await api.get('/admin/users');
      return res.data.data;
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'customer' | 'admin' }) => {
      const res = await api.patch(`/admin/users/${userId}/role`, { role });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User role updated');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update user role');
    },
  });

  const users = data?.users || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">User Role Management</h1>
        <p className="text-xs text-slate-500 mt-1">
          Review customer accounts and grant administrative permissions
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mb-2" />
            <p className="text-xs text-slate-500">Loading user directory...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <Users className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Phone</th>
                  <th className="py-3.5 px-4">Joined Date</th>
                  <th className="py-3.5 px-4">Current Role</th>
                  <th className="py-3.5 px-4 text-right">Role Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-orange-100 text-primary flex items-center justify-center font-bold text-xs">
                          {(u.name || 'U')[0].toUpperCase()}
                        </div>
                        <span className="font-bold text-slate-900">{u.name || 'User'}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{u.email}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      {u.phone || <span className="text-slate-400 italic">None</span>}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString('en-IN', {
                        dateStyle: 'medium',
                      })}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          u.role === 'admin'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {u.role === 'admin' && <ShieldCheck className="w-3 h-3" />}
                        {u.role}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {u.role === 'admin' ? (
                        <button
                          type="button"
                          disabled={updateRoleMutation.isPending}
                          onClick={() =>
                            updateRoleMutation.mutate({ userId: u._id, role: 'customer' })
                          }
                          className="px-3 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-50 rounded-xl transition border border-rose-200"
                        >
                          Demote to Customer
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={updateRoleMutation.isPending}
                          onClick={() =>
                            updateRoleMutation.mutate({ userId: u._id, role: 'admin' })
                          }
                          className="px-3 py-1 text-[11px] font-bold text-amber-700 hover:bg-amber-50 rounded-xl transition border border-amber-300"
                        >
                          Promote to Admin
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
