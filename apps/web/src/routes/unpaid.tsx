import { InstallmentStatus } from '@cyberpedia/shared';
import { CheckCircle2, Phone, Search } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useUnpaidInstallments, type UnpaidRow } from '@/api/queries';
import { useCourses } from '@/api/courses';
import { PageBody, PageHeader } from '@/components/layout/page';
import { StatusBadge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Money } from '@/components/ui/money';
import { Select } from '@/components/ui/select';
import { LoadingState } from '@/components/ui/spinner';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { formatDate, ordinal } from '@/lib/dates';
import { formatMinor } from '@/lib/money';
import { cn } from '@/lib/utils';
import { useDebouncedValue } from '@/lib/use-debounced';

const STATUS_FILTERS: { value: InstallmentStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: InstallmentStatus.OVERDUE, label: 'Overdue' },
  { value: InstallmentStatus.UNPAID, label: 'Unpaid' },
  { value: InstallmentStatus.PARTIAL, label: 'Partial' },
];

function UnpaidCard({ row }: { row: UnpaidRow }) {
  const navigate = useNavigate();
  return (
    <Card className="flex items-center gap-3 p-4">
      <button
        type="button"
        onClick={() => void navigate(`/students/${row.student.id}`)}
        className="min-w-0 flex-1 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
      >
        <p className="truncate font-semibold">{row.student.name}</p>
        <p className="truncate text-[13px] text-muted">
          {row.course.name} · {ordinal(row.seq)} payment
        </p>
        <p
          className={cn(
            'text-[13px]',
            row.status === InstallmentStatus.OVERDUE
              ? 'font-medium text-overdue'
              : 'text-muted',
          )}
        >
          due {formatDate(row.dueDate)}
        </p>
      </button>
      <div className="text-right">
        <Money
          amountMinor={row.remainingMinor}
          currency={row.course.currency}
        />
        <div className="mt-1">
          <StatusBadge status={row.status} />
        </div>
      </div>
      <a
        href={`tel:${row.student.phone}`}
        aria-label={`Call ${row.student.name}`}
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand transition-colors hover:bg-brand/15 active:scale-95"
      >
        <Phone className="size-5" />
      </a>
    </Card>
  );
}

export function UnpaidPage() {
  const [status, setStatus] = useState<InstallmentStatus | ''>('');
  const [courseId, setCourseId] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim());

  const courses = useCourses();
  const unpaid = useUnpaidInstallments({
    status: status || undefined,
    courseId: courseId || undefined,
    search: debouncedSearch || undefined,
  });

  const totalsByCurrency = new Map<
    string,
    { total: number; decimals: number }
  >();
  for (const row of unpaid.data ?? []) {
    const existing = totalsByCurrency.get(row.course.currency.code);
    totalsByCurrency.set(row.course.currency.code, {
      total: (existing?.total ?? 0) + row.remainingMinor,
      decimals: row.course.currency.decimals,
    });
  }
  const summary = [...totalsByCurrency.entries()]
    .map(
      ([code, { total, decimals }]) =>
        `${formatMinor(total, decimals)} ${code}`,
    )
    .join(' + ');

  return (
    <>
      <PageHeader
        title="Unpaid"
        subtitle={
          unpaid.data
            ? `${unpaid.data.length} installment${unpaid.data.length === 1 ? '' : 's'}${summary ? ` · ${summary} remaining` : ''}`
            : undefined
        }
      />
      <PageBody className="space-y-4">
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.label}
              type="button"
              onClick={() => setStatus(filter.value)}
              className={cn(
                'shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors',
                status === filter.value
                  ? 'bg-brand text-white'
                  : 'bg-surface text-muted border border-line hover:text-ink',
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search student name or phone"
              className="pl-10"
              aria-label="Search unpaid installments"
            />
          </div>
          <Select
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
            aria-label="Filter by course"
          >
            <option value="">All courses</option>
            {courses.data?.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </Select>
        </div>

        {unpaid.isPending ? (
          <LoadingState label="Finding who still owes" />
        ) : unpaid.isError ? (
          <ErrorState onRetry={() => void unpaid.refetch()} />
        ) : unpaid.data.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="All caught up"
            description={
              status || courseId || debouncedSearch
                ? 'Nothing matches these filters. Clear them to see every open installment.'
                : 'Every installment has been collected — nothing is waiting.'
            }
          />
        ) : (
          <ul className="space-y-2.5">
            {unpaid.data.map((row) => (
              <li key={row.id}>
                <UnpaidCard row={row} />
              </li>
            ))}
          </ul>
        )}
      </PageBody>
    </>
  );
}
