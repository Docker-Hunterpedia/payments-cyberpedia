import { ScrollText, Search } from 'lucide-react';
import { useState } from 'react';
import { useAuditLog, type AuditRow } from '@/api/audit';
import { PageBody, PageHeader } from '@/components/layout/page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataList, type DataListColumn } from '@/components/ui/data-list';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { LoadingState } from '@/components/ui/spinner';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { useDebouncedValue } from '@/lib/use-debounced';

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// The method already shows as a badge, so the label is just the path;
// auth events keep their own names.
function actionLabel(row: AuditRow): string {
  if (row.action.startsWith('auth.')) {
    return row.action.replace('auth.', 'Sign-in: ').replace('_', ' ');
  }
  return row.path;
}

function statusTone(status: number): 'paid' | 'overdue' | 'neutral' {
  if (status >= 400) return 'overdue';
  if (status >= 200 && status < 300) return 'paid';
  return 'neutral';
}

function methodTone(method: string): 'brand' | 'partial' | 'overdue' {
  if (method === 'DELETE') return 'overdue';
  if (method === 'PATCH' || method === 'PUT') return 'partial';
  return 'brand';
}

const columns: DataListColumn<AuditRow>[] = [
  {
    key: 'when',
    header: 'When',
    render: (row) => (
      <span className="whitespace-nowrap font-mono text-[13px]">
        {formatDateTime(row.createdAt)}
      </span>
    ),
  },
  {
    key: 'who',
    header: 'Who',
    render: (row) => (
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">
          {row.user?.name ?? row.userEmail}
        </p>
        <p className="truncate text-[13px] text-muted">{row.userEmail}</p>
      </div>
    ),
  },
  {
    key: 'action',
    header: 'Action',
    render: (row) => (
      <div className="flex min-w-0 items-center gap-2">
        <Badge tone={methodTone(row.method)}>{row.method}</Badge>
        <span className="truncate font-mono text-[13px]">
          {actionLabel(row)}
        </span>
      </div>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    align: 'right',
    render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge>,
  },
];

function DetailDialog({
  row,
  onClose,
}: {
  row?: AuditRow;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(row)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogTitle>Audit entry</DialogTitle>
        <DialogDescription>
          {row ? formatDateTime(row.createdAt) : ''} · {row?.userEmail}
        </DialogDescription>
        {row && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Badge tone={methodTone(row.method)}>{row.method}</Badge>
              <span className="font-mono text-[13px]">{row.path}</span>
              <Badge tone={statusTone(row.status)}>{row.status}</Badge>
            </div>
            {row.entityId && (
              <p className="text-[13px] text-muted">
                Record: <span className="font-mono">{row.entityId}</span>
              </p>
            )}
            {row.ip && (
              <p className="text-[13px] text-muted">
                From IP: <span className="font-mono">{row.ip}</span>
              </p>
            )}
            {row.meta && Object.keys(row.meta).length > 0 && (
              <pre className="max-h-64 overflow-auto rounded-xl bg-paper p-3 font-mono text-[12px] leading-relaxed">
                {JSON.stringify(row.meta, null, 2)}
              </pre>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function AuditPage() {
  const [search, setSearch] = useState('');
  const [method, setMethod] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim());
  const log = useAuditLog(debouncedSearch, method);
  const rows = log.data?.pages.flat() ?? [];
  const [selected, setSelected] = useState<AuditRow>();

  return (
    <>
      <PageHeader
        title="Audit log"
        subtitle="Every change, who made it, and when"
      />
      <PageBody className="space-y-4">
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by user, action, or record id"
              className="pl-10"
              aria-label="Search audit log"
            />
          </div>
          <Select
            value={method}
            onValueChange={setMethod}
            ariaLabel="Filter by action type"
            className="sm:w-44"
            options={[
              { value: '', label: 'All actions' },
              { value: 'POST', label: 'Created / actions' },
              { value: 'PATCH', label: 'Edited' },
              { value: 'DELETE', label: 'Deleted' },
            ]}
          />
        </div>

        {log.isPending ? (
          <LoadingState label="Loading audit log" />
        ) : log.isError ? (
          <ErrorState onRetry={() => void log.refetch()} />
        ) : (
          <DataList
            columns={columns}
            rows={rows}
            rowKey={(row) => row.id}
            onRowClick={setSelected}
            renderCard={(row) => (
              <div className="flex items-center gap-3">
                <Badge tone={methodTone(row.method)}>{row.method}</Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-[13px] font-semibold">
                    {actionLabel(row)}
                  </p>
                  <p className="truncate text-[13px] text-muted">
                    {row.user?.name ?? row.userEmail} ·{' '}
                    {formatDateTime(row.createdAt)}
                  </p>
                </div>
                <Badge tone={statusTone(row.status)}>{row.status}</Badge>
              </div>
            )}
            emptyState={
              <EmptyState
                icon={ScrollText}
                title="Nothing recorded yet"
                description={
                  debouncedSearch || method
                    ? 'No entries match these filters.'
                    : 'Every change made in the app will show up here.'
                }
              />
            }
          />
        )}

        {log.hasNextPage && (
          <Button
            variant="outline"
            className="w-full"
            disabled={log.isFetchingNextPage}
            onClick={() => void log.fetchNextPage()}
          >
            {log.isFetchingNextPage ? 'Loading…' : 'Load more'}
          </Button>
        )}
      </PageBody>

      <DetailDialog row={selected} onClose={() => setSelected(undefined)} />
    </>
  );
}
