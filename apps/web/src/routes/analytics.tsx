import { AlarmClock, HelpCircle, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  useAnalyticsSummary,
  useCourseReport,
  useTeacherReport,
  type CourseReportRow,
  type TeacherReportRow,
} from '@/api/analytics';
import { useCourses } from '@/api/courses';
import { useCurrencies } from '@/api/reference';
import type { CurrencyMoney } from '@/api/queries';
import { PageBody, PageHeader } from '@/components/layout/page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataList, type DataListColumn } from '@/components/ui/data-list';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input, Label } from '@/components/ui/input';
import { Money } from '@/components/ui/money';
import { Select } from '@/components/ui/select';
import { LoadingState } from '@/components/ui/spinner';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { cn } from '@/lib/utils';

type PresetKey = 'month' | '30d' | '90d' | 'year' | 'custom';

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: 'month', label: 'This month' },
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
  { key: 'year', label: 'This year' },
  { key: 'custom', label: 'Custom' },
];

function presetRange(key: Exclude<PresetKey, 'custom'>): {
  from: Date;
  to: Date;
} {
  const now = new Date();
  switch (key) {
    case 'month':
      return {
        from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
        to: now,
      };
    case '30d':
      return { from: new Date(now.getTime() - 30 * 86_400_000), to: now };
    case '90d':
      return { from: new Date(now.getTime() - 90 * 86_400_000), to: now };
    case 'year':
      return {
        from: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)),
        to: now,
      };
  }
}

const HELP_ITEMS = [
  {
    title: 'Every currency stays separate',
    body: 'Money is tracked the way you actually hold it — separate cash boxes per currency. Nothing is ever converted; a USD figure is real USD, an SYP figure is real SYP.',
  },
  {
    title: 'Income',
    body: 'Course payments received in that currency, plus any other income you add under Finance (sponsorships and so on).',
  },
  {
    title: 'Outcome',
    body: 'Expenses from Finance plus teacher payouts — counted on the day the money actually left, in the currency it left in.',
  },
  {
    title: 'Net',
    body: 'Income minus outcome for the selected period, per currency. The small arrow compares with the previous period of the same length.',
  },
  {
    title: 'Still to collect & overdue',
    body: 'What students still owe, in each course’s currency. Overdue counts only installments whose due day has already passed.',
  },
  {
    title: 'Paying in another currency',
    body: 'A student can pay a USD course in SYP or EUR: you record what you received and how much it counts as in the course currency. The received cash lands in that currency’s box; the installment is reduced by the counted amount.',
  },
  {
    title: 'By course',
    body: 'Pick a course to see its full picture: expected, collected, still not paid, teacher cost, and net margin — always in that course’s currency. Margin = collected minus what its teachers earned.',
  },
];

function HelpDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>How these numbers work</DialogTitle>
        <DialogDescription>A one-minute guide to this page.</DialogDescription>
        <div className="mt-4 space-y-3.5">
          {HELP_ITEMS.map((item) => (
            <div key={item.title}>
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="mt-0.5 text-sm text-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Delta({
  current,
  previous,
  goodWhenUp,
}: {
  current: number;
  previous: number;
  goodWhenUp: boolean;
}) {
  if (previous === 0) return null;
  const pct = Math.round(((current - previous) / Math.abs(previous)) * 100);
  const up = pct >= 0;
  const good = up === goodWhenUp;
  return (
    <span
      className={cn(
        'ml-2 text-[11px] font-semibold',
        good ? 'text-paid' : 'text-overdue',
      )}
    >
      {up ? '▲' : '▼'} {Math.abs(pct)}%
    </span>
  );
}

function SummaryRow({
  label,
  amountMinor,
  currency,
  tone,
  strong,
  delta,
}: {
  label: string;
  amountMinor: number;
  currency: { code: string; decimals: number };
  tone?: 'paid' | 'overdue' | 'muted';
  strong?: boolean;
  delta?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span
        className={cn(
          'text-sm',
          strong ? 'font-semibold text-ink' : 'text-muted',
        )}
      >
        {label}
        {delta}
      </span>
      <Money
        amountMinor={amountMinor}
        currency={currency}
        tone={tone}
        className={strong ? 'text-base' : 'text-sm'}
      />
    </div>
  );
}

function CurrencySummaryCard({ row }: { row: CurrencyMoney }) {
  return (
    <Card className="space-y-2 p-4">
      <div className="flex items-center justify-between">
        <p className="font-display text-base font-semibold">
          {row.currency.code}
        </p>
        {row.overdueCount > 0 && (
          <Badge tone="overdue">
            <AlarmClock className="mr-1 size-3" />
            {row.overdueCount} overdue
          </Badge>
        )}
      </div>

      <SummaryRow
        label="Course payments"
        amountMinor={row.coursePaymentsMinor}
        currency={row.currency}
      />
      <SummaryRow
        label="Other income (Finance)"
        amountMinor={row.otherIncomeMinor}
        currency={row.currency}
      />
      <SummaryRow
        label="Income"
        amountMinor={row.incomeMinor}
        currency={row.currency}
        tone="paid"
        strong
        delta={
          <Delta
            current={row.incomeMinor}
            previous={row.previousIncomeMinor}
            goodWhenUp
          />
        }
      />

      <div className="border-t border-line/60 pt-2">
        <SummaryRow
          label="Expenses (Finance)"
          amountMinor={row.expensesMinor}
          currency={row.currency}
        />
      </div>
      <SummaryRow
        label="Teacher payouts"
        amountMinor={row.teacherPayoutsMinor}
        currency={row.currency}
      />
      <SummaryRow
        label="Outcome"
        amountMinor={row.outcomeMinor}
        currency={row.currency}
        strong
        delta={
          <Delta
            current={row.outcomeMinor}
            previous={row.previousOutcomeMinor}
            goodWhenUp={false}
          />
        }
      />

      <div className="border-t border-line/60 pt-2">
        <SummaryRow
          label="Net"
          amountMinor={row.netMinor}
          currency={row.currency}
          tone={row.netMinor < 0 ? 'overdue' : 'paid'}
          strong
          delta={
            <Delta
              current={row.netMinor}
              previous={row.previousNetMinor}
              goodWhenUp
            />
          }
        />
      </div>
    </Card>
  );
}

function FocusRow({
  label,
  amountMinor,
  currency,
  tone,
}: {
  label: string;
  amountMinor: number;
  currency: { code: string; decimals: number };
  tone?: 'paid' | 'overdue' | 'muted';
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">
        {label}
      </p>
      <Money
        amountMinor={amountMinor}
        currency={currency}
        tone={tone}
        className="text-[15px]"
      />
    </div>
  );
}

export function AnalyticsPage() {
  const [preset, setPreset] = useState<PresetKey>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [courseId, setCourseId] = useState('');
  const [reportSearch, setReportSearch] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(
    () => localStorage.getItem('cp.analyticsHint') === '1',
  );

  const range = useMemo(() => {
    if (preset !== 'custom') return presetRange(preset);
    if (!customFrom || !customTo) return null;
    const from = new Date(`${customFrom}T00:00:00Z`);
    const to = new Date(`${customTo}T23:59:59Z`);
    if (!(from < to)) return null;
    return { from, to };
  }, [preset, customFrom, customTo]);

  const effectiveRange = range ?? presetRange('month');
  const summary = useAnalyticsSummary(
    effectiveRange.from,
    effectiveRange.to,
    range !== null,
  );
  const courses = useCourses();
  const currencies = useCurrencies();
  const courseReport = useCourseReport();
  const teacherReport = useTeacherReport();

  const decimalsFor = (code: string) =>
    currencies.data?.find((currency) => currency.code === code)?.decimals ?? 2;

  const focusCourse = courseId
    ? (courseReport.data ?? []).find((row) => row.course.id === courseId)
    : undefined;

  const search = reportSearch.trim().toLowerCase();
  const filteredCourses = (courseReport.data ?? []).filter((row) =>
    row.course.name.toLowerCase().includes(search),
  );
  const filteredTeachers = (teacherReport.data ?? []).filter((row) =>
    row.teacher.name.toLowerCase().includes(search),
  );

  const courseColumns: DataListColumn<CourseReportRow>[] = [
    {
      key: 'course',
      header: 'Course',
      render: (row) => (
        <div>
          <p className="font-semibold">{row.course.name}</p>
          <p className="text-[13px] text-muted">
            {row.enrollments} students
            {row.freeEnrollments > 0 ? ` (${row.freeEnrollments} free)` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'collected',
      header: 'Collected',
      align: 'right',
      render: (row) => (
        <Money
          amountMinor={row.collectedMinor}
          currency={row.course.currency}
          tone="paid"
        />
      ),
    },
    {
      key: 'outstanding',
      header: 'Not paid',
      align: 'right',
      render: (row) => (
        <Money
          amountMinor={row.outstandingMinor}
          currency={row.course.currency}
          tone={row.outstandingMinor > 0 ? 'overdue' : 'muted'}
        />
      ),
    },
    {
      key: 'teacherCost',
      header: 'Teacher cost',
      align: 'right',
      render: (row) => (
        <Money
          amountMinor={row.teacherCostMinor}
          currency={row.course.currency}
          tone="muted"
        />
      ),
    },
    {
      key: 'margin',
      header: 'Margin',
      align: 'right',
      render: (row) => (
        <Money
          amountMinor={row.marginMinor}
          currency={row.course.currency}
          tone={row.marginMinor < 0 ? 'overdue' : 'default'}
        />
      ),
    },
  ];

  const amountLines = (
    row: TeacherReportRow,
    field: 'earnedMinor' | 'paidMinor' | 'balanceMinor',
    emphasize = false,
  ) => {
    if (row.byCurrency.length === 0) {
      return <span className="text-faint">—</span>;
    }
    return (
      <div className="space-y-0.5">
        {row.byCurrency.map((balance) => (
          <p key={balance.currencyCode}>
            <Money
              amountMinor={balance[field]}
              currency={{
                code: balance.currencyCode,
                decimals: decimalsFor(balance.currencyCode),
              }}
              tone={
                emphasize ? (balance[field] > 0 ? 'default' : 'muted') : 'muted'
              }
              className="text-sm"
            />
          </p>
        ))}
      </div>
    );
  };

  const teacherColumns: DataListColumn<TeacherReportRow>[] = [
    {
      key: 'teacher',
      header: 'Teacher',
      render: (row) => (
        <div>
          <p className="font-semibold">{row.teacher.name}</p>
          <p className="text-[13px] text-muted">
            {row.courses} {row.courses === 1 ? 'course' : 'courses'}
          </p>
        </div>
      ),
    },
    {
      key: 'earned',
      header: 'Earned',
      align: 'right',
      render: (row) => amountLines(row, 'earnedMinor'),
    },
    {
      key: 'paid',
      header: 'Paid out',
      align: 'right',
      render: (row) => amountLines(row, 'paidMinor'),
    },
    {
      key: 'owed',
      header: 'Owed',
      align: 'right',
      render: (row) => amountLines(row, 'balanceMinor', true),
    },
  ];

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="Every currency counted separately — nothing converted"
        action={
          <Button variant="ghost" size="sm" onClick={() => setHelpOpen(true)}>
            <HelpCircle />
            Help
          </Button>
        }
      />
      <PageBody className="space-y-6">
        {!hintDismissed && (
          <Card className="flex items-center gap-3 border-brand/25 bg-brand-soft/40 px-4 py-3">
            <HelpCircle className="size-5 shrink-0 text-brand" />
            <p className="min-w-0 flex-1 text-sm">
              New to this page?{' '}
              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                className="font-semibold text-brand-strong underline underline-offset-2"
              >
                Read how the numbers work
              </button>{' '}
              — it takes a minute.
            </p>
            <button
              type="button"
              aria-label="Dismiss hint"
              onClick={() => {
                localStorage.setItem('cp.analyticsHint', '1');
                setHintDismissed(true);
              }}
              className="rounded-lg p-1.5 text-faint transition-colors hover:bg-line/60 hover:text-ink"
            >
              <X className="size-4" />
            </button>
          </Card>
        )}

        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {PRESETS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setPreset(option.key)}
              className={cn(
                'shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors',
                preset === option.key
                  ? 'bg-brand text-white'
                  : 'border border-line bg-surface text-muted hover:text-ink',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {preset === 'custom' && (
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1.5">
              <Label htmlFor="analytics-from">From</Label>
              <Input
                id="analytics-from"
                type="date"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="analytics-to">To</Label>
              <Input
                id="analytics-to"
                type="date"
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
              />
            </div>
          </div>
        )}

        {!range ? (
          <EmptyState
            icon={Search}
            title="Pick a start and end date"
            description="Choose both dates (start before end) and the numbers will load."
          />
        ) : summary.isPending ? (
          <LoadingState label="Counting the money" />
        ) : summary.isError ? (
          <ErrorState onRetry={() => void summary.refetch()} />
        ) : (
          <section className="space-y-3">
            <h2 className="font-display text-base font-semibold">
              Money this period
            </h2>
            {summary.data.byCurrency.length === 0 ? (
              <Card className="p-4 text-center text-sm text-muted">
                No money moved in this period.
              </Card>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {summary.data.byCurrency.map((row) => (
                  <CurrencySummaryCard key={row.currency.code} row={row} />
                ))}
              </div>
            )}
          </section>
        )}

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">By course</h2>
          </div>
          <Select
            value={courseId}
            onValueChange={setCourseId}
            ariaLabel="Focus on a course"
            options={[
              { value: '', label: 'Pick a course to zoom in…' },
              ...(courses.data ?? []).map((course) => ({
                value: course.id,
                label: course.name,
              })),
            ]}
          />

          {focusCourse && (
            <Card className="space-y-3 p-4">
              <div>
                <p className="font-display text-base font-semibold">
                  {focusCourse.course.name}
                </p>
                <p className="text-[13px] text-muted">
                  {focusCourse.enrollments} students
                  {focusCourse.freeEnrollments > 0
                    ? ` (${focusCourse.freeEnrollments} free)`
                    : ''}{' '}
                  · all-time, in {focusCourse.course.currency.code}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
                <FocusRow
                  label="Expected"
                  amountMinor={focusCourse.expectedMinor}
                  currency={focusCourse.course.currency}
                />
                <FocusRow
                  label="Collected"
                  amountMinor={focusCourse.collectedMinor}
                  currency={focusCourse.course.currency}
                  tone="paid"
                />
                <FocusRow
                  label="Not paid yet"
                  amountMinor={focusCourse.outstandingMinor}
                  currency={focusCourse.course.currency}
                  tone={focusCourse.outstandingMinor > 0 ? 'overdue' : 'muted'}
                />
                <FocusRow
                  label="Teacher cost"
                  amountMinor={focusCourse.teacherCostMinor}
                  currency={focusCourse.course.currency}
                  tone="muted"
                />
                <FocusRow
                  label="Net margin"
                  amountMinor={focusCourse.marginMinor}
                  currency={focusCourse.course.currency}
                  tone={focusCourse.marginMinor < 0 ? 'overdue' : 'paid'}
                />
              </div>
            </Card>
          )}

          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <Input
              type="search"
              value={reportSearch}
              onChange={(event) => setReportSearch(event.target.value)}
              placeholder="Search courses and teachers"
              className="pl-10"
              aria-label="Search reports"
            />
          </div>

          {courseReport.isPending ? (
            <LoadingState />
          ) : courseReport.isError ? (
            <ErrorState onRetry={() => void courseReport.refetch()} />
          ) : (
            <DataList
              columns={courseColumns}
              rows={filteredCourses}
              rowKey={(row) => row.course.id}
              onRowClick={(row) => setCourseId(row.course.id)}
              renderCard={(row) => (
                <div className="space-y-1.5">
                  <p className="font-semibold">{row.course.name}</p>
                  <div className="flex items-baseline justify-between text-[13px]">
                    <span className="text-muted">Collected</span>
                    <Money
                      amountMinor={row.collectedMinor}
                      currency={row.course.currency}
                      tone="paid"
                      className="text-[13px]"
                    />
                  </div>
                  <div className="flex items-baseline justify-between text-[13px]">
                    <span className="text-muted">Not paid yet</span>
                    <Money
                      amountMinor={row.outstandingMinor}
                      currency={row.course.currency}
                      tone={row.outstandingMinor > 0 ? 'overdue' : 'muted'}
                      className="text-[13px]"
                    />
                  </div>
                  <div className="flex items-baseline justify-between text-[13px]">
                    <span className="text-muted">Margin after teachers</span>
                    <Money
                      amountMinor={row.marginMinor}
                      currency={row.course.currency}
                      tone={row.marginMinor < 0 ? 'overdue' : 'default'}
                      className="text-[13px]"
                    />
                  </div>
                </div>
              )}
              emptyState={
                <Card className="p-4 text-center text-sm text-muted">
                  {search ? 'No course matches.' : 'No courses yet.'}
                </Card>
              }
            />
          )}
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-base font-semibold">By teacher</h2>
          {teacherReport.isPending ? (
            <LoadingState />
          ) : teacherReport.isError ? (
            <ErrorState onRetry={() => void teacherReport.refetch()} />
          ) : (
            <DataList
              columns={teacherColumns}
              rows={filteredTeachers}
              rowKey={(row) => row.teacher.id}
              renderCard={(row) => (
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{row.teacher.name}</p>
                    <p className="text-[13px] text-muted">
                      {row.courses} {row.courses === 1 ? 'course' : 'courses'}
                    </p>
                  </div>
                  <div className="text-right">
                    {amountLines(row, 'balanceMinor', true)}
                    {row.byCurrency.length > 0 && (
                      <p className="text-[11px] text-faint">owed</p>
                    )}
                  </div>
                </div>
              )}
              emptyState={
                <Card className="p-4 text-center text-sm text-muted">
                  {search ? 'No teacher matches.' : 'No teachers yet.'}
                </Card>
              }
            />
          )}
        </section>
      </PageBody>
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  );
}
