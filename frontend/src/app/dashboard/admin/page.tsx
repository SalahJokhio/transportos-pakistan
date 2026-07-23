'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { FinanceConsole } from '@/components/admin/FinanceConsole';
import { CompaniesConsole } from '@/components/admin/CompaniesConsole';
import { CatalogConsole } from '@/components/admin/CatalogConsole';
import { ComplianceConsole } from '@/components/admin/ComplianceConsole';
import { AccessConsole } from '@/components/admin/AccessConsole';
import { BroadcastConsole } from '@/components/admin/BroadcastConsole';
import { SupportConsole } from '@/components/admin/SupportConsole';
import { SystemConsole } from '@/components/admin/SystemConsole';
import { AutomationConsole } from '@/components/admin/AutomationConsole';
import { WorkflowConsole } from '@/components/admin/WorkflowConsole';
import { CopilotPanel } from '@/components/admin/CopilotPanel';
import { AgentsConsole } from '@/components/admin/AgentsConsole';
import { SimulationConsole } from '@/components/admin/SimulationConsole';
import { PolicyConsole } from '@/components/admin/PolicyConsole';
import { SlaConsole } from '@/components/admin/SlaConsole';
import { KnowledgeConsole } from '@/components/admin/KnowledgeConsole';
import { ReportsConsole } from '@/components/admin/ReportsConsole';
import { StaffAssistantPanel } from '@/components/admin/StaffAssistantPanel';
import {
  Users, ShieldCheck, Bus, TrendingUp, Search, CheckCircle,
  XCircle, ChevronLeft, ChevronRight, AlertCircle, UserCog, Banknote,
  ShieldAlert, Flag,
} from 'lucide-react';

type Tab = 'overview' | 'copilot' | 'agents' | 'simulation' | 'users' | 'operators' | 'companies' | 'catalog' | 'compliance' | 'access' | 'broadcast' | 'support' | 'system' | 'automation' | 'workflows' | 'policies' | 'sla' | 'knowledge' | 'reports' | 'assistants' | 'revenue' | 'settlements' | 'disputes';

const ROLES = [
  'PASSENGER', 'BOOKING_AGENT', 'DRIVER', 'CALL_CENTER_AGENT',
  'FLEET_MANAGER', 'FINANCE_OFFICER', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN',
];

const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-700',
  COMPANY_ADMIN: 'bg-purple-100 text-purple-700',
  COMPANY_MANAGER: 'bg-violet-100 text-violet-700',
  FLEET_MANAGER: 'bg-blue-100 text-blue-700',
  FINANCE_OFFICER: 'bg-teal-100 text-teal-700',
  BOOKING_AGENT: 'bg-cyan-100 text-cyan-700',
  CALL_CENTER_AGENT: 'bg-sky-100 text-sky-700',
  DRIVER: 'bg-orange-100 text-orange-700',
  PASSENGER: 'bg-gray-100 text-gray-600',
};

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [editRoleUserId, setEditRoleUserId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState('');
  const qc = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: adminApi.getStats,
    staleTime: 30000,
  });

  const { data: usersRes, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users', page, roleFilter, search],
    queryFn: () =>
      adminApi.listUsers({ page, limit: 15, role: roleFilter || undefined, search: search || undefined }),
    enabled: activeTab === 'users',
    placeholderData: (prev) => prev,
  });

  const { data: revenueData, isLoading: revLoading } = useQuery({
    queryKey: ['admin-revenue'],
    queryFn: adminApi.getRevenue,
    enabled: activeTab === 'revenue',
    staleTime: 30000,
  });

  const { data: operators, isLoading: opsLoading } = useQuery({
    queryKey: ['admin-operators'],
    queryFn: adminApi.getOperators,
    enabled: activeTab === 'operators',
  });

  const deactivateMut = useMutation({
    mutationFn: adminApi.deactivateUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const activateMut = useMutation({
    mutationFn: adminApi.activateUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const updateRoleMut = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => adminApi.updateRole(id, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-operators'] });
      setEditRoleUserId(null);
    },
  });

  const approveOpMut = useMutation({
    mutationFn: adminApi.approveOperator,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-operators'] }),
  });

  const { data: disputesRes, isLoading: dispLoading } = useQuery({
    queryKey: ['admin-disputes'],
    queryFn: () => adminApi.getDisputes(),
    enabled: activeTab === 'disputes',
  });

  const { data: fraudRes, isLoading: fraudLoading } = useQuery({
    queryKey: ['admin-fraud'],
    queryFn: adminApi.getFraudSignals,
    enabled: activeTab === 'disputes',
  });

  const resolveDisputeMut = useMutation({
    mutationFn: ({ id, status, resolution }: { id: string; status: string; resolution?: string }) =>
      adminApi.resolveDispute(id, status, resolution),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-disputes'] }),
  });

  const s = stats?.users;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Super Admin Dashboard</h1>
            <p className="text-xs text-gray-500">TransportOS Platform Control</p>
          </div>
        </div>

        {/* Tabs — horizontally scrollable so the 13 tabs never overflow the page */}
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 border-t overflow-x-auto">
            {(['overview', 'copilot', 'agents', 'simulation', 'users', 'operators', 'companies', 'catalog', 'compliance', 'access', 'broadcast', 'support', 'system', 'automation', 'workflows', 'policies', 'sla', 'knowledge', 'reports', 'assistants', 'revenue', 'settlements', 'disputes'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`shrink-0 whitespace-nowrap px-4 py-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {statsLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white rounded-xl p-5 border animate-pulse h-28" />
                ))}
              </div>
            ) : (
              <>
                {/* Stat cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    icon={<Users className="h-5 w-5 text-blue-600" />}
                    bg="bg-blue-50"
                    label="Total Users"
                    value={s?.total?.toLocaleString() ?? '—'}
                    sub={`${s?.active ?? 0} active`}
                  />
                  <StatCard
                    icon={<TrendingUp className="h-5 w-5 text-green-600" />}
                    bg="bg-green-50"
                    label="New This Month"
                    value={s?.newThisMonth?.toLocaleString() ?? '—'}
                    sub={`${s?.newLastMonth ?? 0} last month`}
                  />
                  <StatCard
                    icon={<Bus className="h-5 w-5 text-orange-600" />}
                    bg="bg-orange-50"
                    label="Operators"
                    value={String(s?.byRole?.['COMPANY_ADMIN'] ?? 0)}
                    sub="Company admins"
                  />
                  <StatCard
                    icon={<UserCog className="h-5 w-5 text-purple-600" />}
                    bg="bg-purple-50"
                    label="Drivers"
                    value={String(s?.byRole?.['DRIVER'] ?? 0)}
                    sub="Registered drivers"
                  />
                </div>

                {/* Role breakdown table */}
                <div className="bg-white rounded-xl border shadow-sm">
                  <div className="px-5 py-4 border-b">
                    <h2 className="font-semibold text-gray-800">Users by Role</h2>
                  </div>
                  <div className="divide-y">
                    {ROLES.map((role) => {
                      const count = s?.byRole?.[role] ?? 0;
                      const pct = s?.total ? Math.round((count / s.total) * 100) : 0;
                      return (
                        <div key={role} className="flex items-center px-5 py-3 gap-4">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_BADGE[role] ?? 'bg-gray-100 text-gray-600'}`}>
                            {role.replace(/_/g, ' ')}
                          </span>
                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-orange-400 transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-700 font-medium w-12 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── USERS TAB ── */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search name, phone, email…"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-200 outline-none"
              >
                <option value="">All Roles</option>
                {ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
              </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="text-left px-5 py-3">User</th>
                    <th className="text-left px-4 py-3">Phone</th>
                    <th className="text-left px-4 py-3">Role</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Joined</th>
                    <th className="text-right px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {usersLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 6 }).map((__, j) => (
                          <td key={j} className="px-5 py-3">
                            <div className="h-4 bg-gray-100 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : usersRes?.data?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-gray-400">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        No users found
                      </td>
                    </tr>
                  ) : (
                    usersRes?.data?.map((user: any) => (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="font-medium text-gray-800">
                            {user.firstName || user.lastName
                              ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
                              : <span className="text-gray-400 italic">No name</span>}
                          </div>
                          <div className="text-xs text-gray-400">{user.email || '—'}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 font-mono text-xs">{user.phone}</td>
                        <td className="px-4 py-3">
                          {editRoleUserId === user.id ? (
                            <div className="flex gap-2 items-center">
                              <select
                                value={newRole}
                                onChange={(e) => setNewRole(e.target.value)}
                                className="border rounded px-2 py-1 text-xs"
                              >
                                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                              </select>
                              <button
                                onClick={() => updateRoleMut.mutate({ id: user.id, role: newRole })}
                                disabled={updateRoleMut.isPending}
                                className="text-xs bg-orange-500 text-white px-2 py-1 rounded hover:bg-orange-600"
                              >
                                Save
                              </button>
                              <button onClick={() => setEditRoleUserId(null)} className="text-xs text-gray-400 hover:text-gray-600">
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setEditRoleUserId(user.id); setNewRole(user.role); }}
                              className={`text-xs font-semibold px-2 py-0.5 rounded-full hover:opacity-80 ${ROLE_BADGE[user.role] ?? 'bg-gray-100 text-gray-600'}`}
                            >
                              {user.role?.replace(/_/g, ' ')}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {new Date(user.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-5 py-3 text-right">
                          {user.isActive ? (
                            <button
                              onClick={() => deactivateMut.mutate(user.id)}
                              disabled={deactivateMut.isPending}
                              className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 ml-auto"
                            >
                              <XCircle className="h-3.5 w-3.5" /> Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => activateMut.mutate(user.id)}
                              disabled={activateMut.isPending}
                              className="text-xs text-green-600 hover:text-green-800 flex items-center gap-1 ml-auto"
                            >
                              <CheckCircle className="h-3.5 w-3.5" /> Activate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              {usersRes && usersRes.totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t bg-gray-50">
                  <span className="text-xs text-gray-500">
                    Showing {((page - 1) * 15) + 1}–{Math.min(page * 15, usersRes.total)} of {usersRes.total} users
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => p - 1)}
                      disabled={page === 1}
                      className="p-1.5 rounded border hover:bg-white disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="px-3 py-1 text-xs font-medium">{page} / {usersRes.totalPages}</span>
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page >= usersRes.totalPages}
                      className="p-1.5 rounded border hover:bg-white disabled:opacity-40"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── REVENUE TAB ── */}
        {activeTab === 'revenue' && (
          <div className="space-y-5">
            {revLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => <div key={i} className="bg-white rounded-xl p-5 border animate-pulse h-28" />)}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard icon={<Banknote className="h-5 w-5 text-green-600" />} bg="bg-green-50" label="Total Revenue" value={`Rs ${(revenueData?.revenue?.total ?? 0).toLocaleString()}`} sub="All time confirmed" />
                  <StatCard icon={<TrendingUp className="h-5 w-5 text-blue-600" />} bg="bg-blue-50" label="This Month" value={`Rs ${(revenueData?.revenue?.thisMonth ?? 0).toLocaleString()}`} sub={`Rs ${(revenueData?.revenue?.lastMonth ?? 0).toLocaleString()} last month`} />
                  <StatCard icon={<CheckCircle className="h-5 w-5 text-green-600" />} bg="bg-green-50" label="Confirmed Bookings" value={String(revenueData?.bookings?.confirmed ?? 0)} sub={`${revenueData?.bookings?.total ?? 0} total`} />
                  <StatCard icon={<XCircle className="h-5 w-5 text-red-500" />} bg="bg-red-50" label="Cancelled" value={String(revenueData?.bookings?.cancelled ?? 0)} sub={`${revenueData?.bookings?.pending ?? 0} pending`} />
                </div>

                <div className="bg-white rounded-xl border shadow-sm">
                  <div className="px-5 py-4 border-b"><h2 className="font-semibold text-gray-800">Recent Bookings</h2></div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                        <tr>
                          <th className="text-left px-5 py-3">PNR</th>
                          <th className="text-left px-4 py-3">Status</th>
                          <th className="text-left px-4 py-3">Amount</th>
                          <th className="text-left px-4 py-3">Seats</th>
                          <th className="text-left px-4 py-3">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {revenueData?.recent?.map((b: any) => (
                          <tr key={b.id} className="hover:bg-gray-50">
                            <td className="px-5 py-3 font-mono text-xs text-orange-600 font-bold">{b.pnr}</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                b.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                                b.status === 'CANCELLED' ? 'bg-red-100 text-red-600' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>{b.status?.replace('_', ' ')}</span>
                            </td>
                            <td className="px-4 py-3 font-medium">Rs {Number(b.finalAmount || b.totalAmount || 0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{b.seatNumbers?.join(', ')}</td>
                            <td className="px-4 py-3 text-gray-400 text-xs">
                              {new Date(b.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── OPERATORS TAB ── */}
        {activeTab === 'operators' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <h2 className="font-semibold text-gray-800">Registered Operators</h2>
                <span className="text-sm text-gray-500">
                  {opsLoading ? '…' : `${operators?.length ?? 0} total`}
                </span>
              </div>

              {opsLoading ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-50 rounded-lg animate-pulse" />)}
                </div>
              ) : operators?.length === 0 ? (
                <div className="py-16 text-center text-gray-400">
                  <Bus className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>No operators registered yet</p>
                </div>
              ) : (
                <div className="divide-y">
                  {operators?.map((op: any) => (
                    <div key={op.id} className="flex items-center gap-4 px-5 py-4">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm flex-shrink-0">
                        {(op.firstName?.[0] ?? op.email?.[0] ?? 'O').toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-800">
                          {op.firstName || op.lastName
                            ? `${op.firstName ?? ''} ${op.lastName ?? ''}`.trim()
                            : op.email || 'Unknown'}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {op.phone} · {op.email || 'No email'}
                          {op.companyId && ` · Company: ${op.companyId}`}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 hidden sm:block">
                        {new Date(op.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${op.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {op.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {!op.isActive && (
                        <button
                          onClick={() => approveOpMut.mutate(op.id)}
                          disabled={approveOpMut.isPending}
                          className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          Approve
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── COMPANIES (multi-tenant) TAB ── */}
        {activeTab === 'companies' && <CompaniesConsole />}

        {/* ── CATALOG / CMS TAB ── */}
        {activeTab === 'catalog' && <CatalogConsole />}

        {/* ── COMPLIANCE / KYC TAB ── */}
        {activeTab === 'compliance' && <ComplianceConsole />}

        {/* ── ACCESS (audit + RBAC) TAB ── */}
        {activeTab === 'access' && <AccessConsole />}

        {/* ── BROADCAST TAB ── */}
        {activeTab === 'broadcast' && <BroadcastConsole />}

        {/* ── SUPPORT / TICKETING TAB ── */}
        {activeTab === 'support' && <SupportConsole />}

        {/* ── SYSTEM (health / fraud / exports) TAB ── */}
        {activeTab === 'system' && <SystemConsole />}

        {activeTab === 'automation' && <AutomationConsole />}

        {activeTab === 'workflows' && <WorkflowConsole />}

        {activeTab === 'copilot' && <CopilotPanel />}

        {activeTab === 'agents' && <AgentsConsole />}

        {activeTab === 'simulation' && <SimulationConsole />}

        {activeTab === 'policies' && <PolicyConsole />}

        {activeTab === 'sla' && <SlaConsole />}

        {activeTab === 'knowledge' && <KnowledgeConsole />}

        {activeTab === 'reports' && <ReportsConsole />}

        {activeTab === 'assistants' && <StaffAssistantPanel />}

        {/* ── SETTLEMENTS / REFUNDS TAB ── */}
        {activeTab === 'settlements' && <FinanceConsole />}

        {/* ── DISPUTES / FRAUD TAB ── */}
        {activeTab === 'disputes' && (
          <div className="space-y-6">
            {/* Fraud signals */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-500" />
                <h2 className="font-semibold text-gray-800">Fraud Signals</h2>
                <span className="text-xs text-gray-400 ml-1">
                  {fraudLoading ? '…' : `${fraudRes?.flagged ?? 0} flagged`}
                </span>
              </div>
              {fraudLoading ? (
                <div className="p-6 space-y-3">{[1, 2].map((i) => <div key={i} className="h-12 bg-gray-50 rounded-lg animate-pulse" />)}</div>
              ) : (fraudRes?.signals?.length ?? 0) === 0 ? (
                <div className="py-10 text-center text-gray-400 text-sm">
                  <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No suspicious activity detected
                </div>
              ) : (
                <div className="divide-y">
                  {fraudRes?.signals?.map((sig: any) => (
                    <div key={sig.userId} className="flex items-center gap-3 px-5 py-3">
                      <Flag className="h-4 w-4 text-red-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-800 text-sm">{sig.name}</div>
                        <div className="text-xs text-gray-400 font-mono">{sig.phone ?? '—'}</div>
                      </div>
                      <span className="text-xs text-red-600 font-medium">{sig.cancellations} cancellations</span>
                      <span className="text-xs text-gray-400 hidden sm:inline">· {sig.reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Disputes queue */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <h2 className="font-semibold text-gray-800">Disputes & Refund Requests</h2>
                <span className="text-sm text-gray-500">
                  {dispLoading ? '…' : `${disputesRes?.open ?? 0} open · ${disputesRes?.total ?? 0} total`}
                </span>
              </div>
              {dispLoading ? (
                <div className="p-6 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-50 rounded-lg animate-pulse" />)}</div>
              ) : (disputesRes?.disputes?.length ?? 0) === 0 ? (
                <div className="py-16 text-center text-gray-400">
                  <CheckCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>No disputes — all clear</p>
                </div>
              ) : (
                <div className="divide-y">
                  {disputesRes?.disputes?.map((d: any) => (
                    <div key={d.id} className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              d.type === 'FRAUD' ? 'bg-red-100 text-red-700' :
                              d.type === 'REFUND_REQUEST' ? 'bg-amber-100 text-amber-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>{d.type?.replace(/_/g, ' ')}</span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              d.status === 'OPEN' ? 'bg-yellow-100 text-yellow-700' :
                              d.status === 'RESOLVED' ? 'bg-green-100 text-green-700' :
                              'bg-gray-100 text-gray-500'
                            }`}>{d.status}</span>
                            {d.pnr && <span className="text-xs font-mono text-orange-600">{d.pnr}</span>}
                          </div>
                          <div className="font-medium text-gray-800 mt-1.5">{d.subject}</div>
                          {d.description && <div className="text-sm text-gray-500 mt-0.5">{d.description}</div>}
                          <div className="text-xs text-gray-400 mt-1">
                            {d.userName || 'User'} · {new Date(d.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                          {d.resolution && (
                            <div className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-1.5 mt-2">
                              ✔ {d.resolution}
                            </div>
                          )}
                        </div>
                        {d.status === 'OPEN' && (
                          <div className="flex flex-col gap-2 flex-shrink-0">
                            <button
                              onClick={() => {
                                const res = window.prompt('Resolution note (e.g. "Rs 500 refunded to wallet"):', '');
                                if (res !== null) resolveDisputeMut.mutate({ id: d.id, status: 'RESOLVED', resolution: res || 'Resolved' });
                              }}
                              disabled={resolveDisputeMut.isPending}
                              className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 flex items-center gap-1"
                            >
                              <CheckCircle className="h-3.5 w-3.5" /> Resolve
                            </button>
                            <button
                              onClick={() => resolveDisputeMut.mutate({ id: d.id, status: 'REJECTED', resolution: 'Rejected' })}
                              disabled={resolveDisputeMut.isPending}
                              className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 flex items-center gap-1"
                            >
                              <XCircle className="h-3.5 w-3.5" /> Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon, bg, label, value, sub,
}: {
  icon: React.ReactNode;
  bg: string;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-5">
      <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>{icon}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm font-medium text-gray-600 mt-0.5">{label}</div>
      <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
    </div>
  );
}
