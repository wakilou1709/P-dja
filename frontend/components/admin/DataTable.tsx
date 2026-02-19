'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';

export interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

export interface Action {
  label: string;
  onClick: (row: any) => void;
  variant?: 'default' | 'destructive' | 'outline';
  icon?: React.ReactNode;
}

interface DataTableProps {
  data: any[];
  columns: Column[];
  actions?: Action[];
  loading?: boolean;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

export function DataTable({
  data,
  columns,
  actions,
  loading = false,
  page = 1,
  totalPages = 1,
  onPageChange,
}: DataTableProps) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    if (sortKey === key) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortOrder('asc'); }
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortKey) return 0;
    const av = a[sortKey], bv = b[sortKey];
    if (av < bv) return sortOrder === 'asc' ? -1 : 1;
    if (av > bv) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  if (loading) {
    return (
      <div className="neo-card p-12 text-center">
        <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-3" />
        <div className="text-slate-400 text-sm">Chargement...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="neo-card p-12 text-center">
        <div className="text-slate-400 text-sm">Aucune donnée disponible</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className="overflow-hidden rounded-xl"
        style={{
          background: '#1c2136',
          boxShadow: '-5px -5px 12px rgba(168,150,255,0.04), 5px 5px 15px rgba(0,0,0,0.65), inset 0 0 0 1px rgba(139,92,246,0.08)',
        }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(139,92,246,0.1)', background: 'rgba(0,0,0,0.2)' }}>
              {columns.map((column) => (
                <th key={column.key} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {column.sortable ? (
                    <button
                      onClick={() => handleSort(column.key)}
                      className="flex items-center gap-1.5 hover:text-purple-400 transition-colors"
                    >
                      {column.label}
                      <ArrowUpDown className={`w-3.5 h-3.5 ${sortKey === column.key ? 'text-purple-400' : ''}`} />
                    </button>
                  ) : column.label}
                </th>
              ))}
              {actions && actions.length > 0 && (
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, index) => (
              <tr
                key={index}
                className="transition-colors hover:bg-purple-500/3"
                style={{ borderBottom: '1px solid rgba(139,92,246,0.06)' }}
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 text-slate-200 text-sm">
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
                {actions && actions.length > 0 && (
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {actions.map((action, ai) => (
                        <button
                          key={ai}
                          onClick={() => action.onClick(row)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            action.variant === 'destructive'
                              ? 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/40'
                              : 'bg-purple-500/8 border border-purple-500/15 text-purple-400 hover:bg-purple-500/15 hover:border-purple-500/30'
                          }`}
                        >
                          {action.icon}
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {onPageChange && totalPages > 1 && (
        <div className="flex items-center justify-between py-2">
          <div className="text-xs text-slate-500">
            Page {page} sur {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="neo-btn flex items-center gap-1.5 px-3 py-2 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Précédent
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="neo-btn flex items-center gap-1.5 px-3 py-2 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Suivant
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
