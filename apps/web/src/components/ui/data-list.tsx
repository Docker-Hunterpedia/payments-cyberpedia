import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card } from './card';

export interface DataListColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'right';
  className?: string;
  render: (row: T) => ReactNode;
}

// Table on desktop, tappable cards on phones.
export function DataList<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  renderCard,
  emptyState,
}: {
  columns: DataListColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  renderCard: (row: T) => ReactNode;
  emptyState?: ReactNode;
}) {
  if (rows.length === 0 && emptyState) return <>{emptyState}</>;

  return (
    <>
      <Card className="hidden overflow-hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-paper/60">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-faint',
                    column.align === 'right' && 'text-right',
                    column.className,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'border-b border-line/60 last:border-b-0',
                  onRowClick &&
                    'cursor-pointer transition-colors hover:bg-paper/70',
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'px-4 py-3',
                      column.align === 'right' && 'text-right',
                      column.className,
                    )}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <ul className="space-y-2.5 md:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)}>
            {onRowClick ? (
              <button
                type="button"
                onClick={() => onRowClick(row)}
                className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 rounded-2xl"
              >
                <Card className="p-4 transition-colors active:bg-paper">
                  {renderCard(row)}
                </Card>
              </button>
            ) : (
              <Card className="p-4">{renderCard(row)}</Card>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
