import { LedgerEntryType } from '@cyberpedia/shared';
import { FolderCog, Plus, Trash2, Wallet } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  useDeleteEntry,
  useLedgerEntries,
  type LedgerEntryRow,
} from '@/api/finance';
import { CategoriesDialog } from '@/components/finance/categories-dialog';
import { EntryFormDialog } from '@/components/finance/entry-form-dialog';
import { PageBody, PageHeader } from '@/components/layout/page';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/dialog';
import { Money } from '@/components/ui/money';
import { LoadingState } from '@/components/ui/spinner';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { formatDate } from '@/lib/dates';
import { cn } from '@/lib/utils';

const TYPE_FILTERS: { value: LedgerEntryType | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: LedgerEntryType.INCOME, label: 'Income' },
  { value: LedgerEntryType.EXPENSE, label: 'Expenses' },
];

function EntryRow({
  entry,
  onEdit,
  onDelete,
}: {
  entry: LedgerEntryRow;
  onEdit: (entry: LedgerEntryRow) => void;
  onDelete: (entry: LedgerEntryRow) => void;
}) {
  const isIncome = entry.type === LedgerEntryType.INCOME;
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <button
        type="button"
        onClick={() => onEdit(entry)}
        className="min-w-0 flex-1 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
      >
        <p className="truncate text-sm font-semibold">{entry.category.name}</p>
        <p className="truncate text-[13px] text-muted">
          {formatDate(entry.date)}
          {entry.note ? ` · ${entry.note}` : ''}
        </p>
      </button>
      <span
        className={cn(
          'font-mono text-sm font-medium tabular-nums',
          isIncome ? 'text-paid' : 'text-ink',
        )}
      >
        {isIncome ? '+' : '−'}
        <Money
          amountMinor={entry.amountMinor}
          currency={entry.currency}
          className={cn('text-sm', isIncome && 'text-paid')}
        />
      </span>
      <button
        type="button"
        aria-label="Delete entry"
        onClick={() => onDelete(entry)}
        className="rounded-lg p-2 text-faint transition-colors hover:bg-line/60 hover:text-overdue"
      >
        <Trash2 className="size-4" />
      </button>
    </li>
  );
}

export function FinancePage() {
  const [type, setType] = useState<LedgerEntryType | ''>('');
  const entries = useLedgerEntries(type || undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LedgerEntryRow>();
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [deletingEntry, setDeletingEntry] = useState<LedgerEntryRow>();
  const deleteEntry = useDeleteEntry();

  return (
    <>
      <PageHeader
        title="Finance"
        subtitle="Income and expenses outside courses"
        action={
          <Button
            size="sm"
            onClick={() => {
              setEditingEntry(undefined);
              setFormOpen(true);
            }}
          >
            <Plus />
            Add
          </Button>
        }
      />
      <PageBody className="space-y-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {TYPE_FILTERS.map((filter) => (
            <button
              key={filter.label}
              type="button"
              onClick={() => setType(filter.value)}
              className={cn(
                'shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors',
                type === filter.value
                  ? 'bg-brand text-white'
                  : 'border border-line bg-surface text-muted hover:text-ink',
              )}
            >
              {filter.label}
            </button>
          ))}
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCategoriesOpen(true)}
            className="shrink-0"
          >
            <FolderCog />
            Categories
          </Button>
        </div>

        {entries.isPending ? (
          <LoadingState label="Loading the ledger" />
        ) : entries.isError ? (
          <ErrorState onRetry={() => void entries.refetch()} />
        ) : entries.data.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No entries yet"
            description="Track rent, salaries, sponsorships, and anything else that isn't course money."
            action={
              <Button
                onClick={() => {
                  setEditingEntry(undefined);
                  setFormOpen(true);
                }}
              >
                <Plus />
                Add entry
              </Button>
            }
          />
        ) : (
          <Card>
            <ul className="divide-y divide-line/60">
              {entries.data.map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  onEdit={(row) => {
                    setEditingEntry(row);
                    setFormOpen(true);
                  }}
                  onDelete={setDeletingEntry}
                />
              ))}
            </ul>
          </Card>
        )}
      </PageBody>

      <EntryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        entry={editingEntry}
      />
      <CategoriesDialog
        open={categoriesOpen}
        onOpenChange={setCategoriesOpen}
      />
      <ConfirmDialog
        open={Boolean(deletingEntry)}
        onOpenChange={(open) => !open && setDeletingEntry(undefined)}
        title="Delete this entry?"
        description={`${deletingEntry?.category.name} · ${deletingEntry ? formatDate(deletingEntry.date) : ''} — it will leave the analytics immediately.`}
        confirmLabel="Delete entry"
        destructive
        loading={deleteEntry.isPending}
        onConfirm={() => {
          if (!deletingEntry) return;
          deleteEntry.mutate(deletingEntry.id, {
            onSuccess: () => {
              toast.success('Entry deleted');
              setDeletingEntry(undefined);
            },
            onError: (error) => toast.error(error.message),
          });
        }}
      />
    </>
  );
}
