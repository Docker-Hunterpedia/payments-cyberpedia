import {
  AlarmClock,
  ChartNoAxesColumn,
  HelpCircle,
  Search,
  X,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  useAnalyticsSummary,
  useCourseReport,
  useTeacherReport,
  useTimeseries,
  type TimeBucket,
} from '@/api/analytics';
import { useCourses } from '@/api/courses';
import { usePaymentMethodsList, useCurrencies } from '@/api/reference';
import { PageBody, PageHeader } from '@/components/layout/page';
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
import { formatMinor, type CurrencyInfo } from '@/lib/money';
import { cn } from '@/lib/utils';
import type { CourseReportRow, TeacherReportRow } from '@/api/analytics';

// Chart series colors — validated with the dataviz palette checker
// (lightness band, chroma floor, CVD separation, contrast on white).
const INCOME_COLOR = '#0e8ba6';
const OUTCOME_COLOR = '#c2703e';
const NET_COLOR = '#16232e';
const GRID_COLOR = '#e1e8ea';
const TICK_COLOR = '#8fa0a8';

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
  granularity: 'day' | 'week' | 'month';
} {
  const now = new Date();
  switch (key) {
    case 'month':
      return {
        from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
        to: now,
        granularity: 'day',
      };
    case '30d':
      return {
        from: new Date(now.getTime() - 30 * 86_400_000),
        to: now,
        granularity: 'day',
      };
    case '90d':
      return {
        from: new Date(now.getTime() - 90 * 86_400_000),
        to: now,
        granularity: 'week',
      };
    case 'year':
      return {
        from: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)),
        to: now,
        granularity: 'month',
      };
  }
}

function bucketLabel(
  bucket: string,
  granularity: 'day' | 'week' | 'month',
): string {
  const date = new Date(`${bucket}T00:00:00Z`);
  if (granularity === 'month') {
    return date.toLocaleDateString('en-GB', { month: 'short' });
  }
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function compactMajor(minor: number, decimals: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(minor / 10 ** decimals);
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
  if (previous === 0) {
    return <p className="mt-1 text-[11px] text-faint">vs previous — no data</p>;
  }
  const pct = Math.round(((current - previous) / Math.abs(previous)) * 100);
  const up = pct >= 0;
  const good = up === goodWhenUp;
  return (
    <p
      className={cn(
        'mt-1 text-[11px] font-semibold',
        good ? 'text-paid' : 'text-overdue',
      )}
    >
      {up ? '▲' : '▼'} {Math.abs(pct)}%{' '}
      <span className="font-normal text-faint">vs previous</span>
    </p>
  );
}

function KpiTile({
  label,
  children,
  delta,
}: {
  label: string;
  children: ReactNode;
  delta?: ReactNode;
}) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-faint">
        {label}
      </p>
      <p className="mt-1.5 text-lg lg:text-xl">{children}</p>
      {delta}
    </Card>
  );
}

function LegendChip({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted">
      <span
        className="size-2.5 rounded-[3px]"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

interface ChartRow extends TimeBucket {
  label: string;
}

const HELP_ITEMS = [
  {
    title: 'One currency for everything',
    body: 'Cards and charts convert every amount into the base currency. Each payment keeps the exchange rate from the day it happened, so history never shifts when you update rates — only Outstanding uses today’s rates.',
  },
  {
    title: 'Income',
    body: 'Course payments plus any income you add under Finance (sponsorships and so on).',
  },
  {
    title: 'Outcome',
    body: 'Finance expenses plus teacher payouts — counted on the day the money actually left.',
  },
  {
    title: 'Net profit',
    body: 'Income minus outcome for the selected period. The small arrow compares it with the previous period of the same length.',
  },
  {
    title: 'Outstanding & overdue',
    body: 'Outstanding is everything students still owe. Overdue only counts installments whose due day has already passed.',
  },
  {
    title: 'Margin (by course)',
    body: 'What a course collected minus what its teachers earned from it — shown in the course’s own currency.',
  },
  {
    title: 'What the filters touch',
    body: 'The period chips drive the cards and charts. The course / method / currency selects shape the charts only; the reports below always show all-time totals.',
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

function ChartTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean;
  payload?: { dataKey: string; value: number; color?: string }[];
  label?: string;
  currency: CurrencyInfo;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const names: Record<string, string> = {
    incomeMinor: 'Income',
    outcomeMinor: 'Outcome',
    netMinor: 'Net',
  };
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 shadow-raised">
      <p className="text-xs font-semibold text-muted">{label}</p>
      {payload.map((entry) => (
        <p
          key={entry.dataKey}
          className="mt-0.5 flex items-center gap-1.5 text-[13px]"
        >
          <span
            className="size-2 rounded-[2px]"
            style={{ backgroundColor: entry.color ?? NET_COLOR }}
          />
          <span className="text-muted">
            {names[entry.dataKey] ?? entry.dataKey}
          </span>
          <span className="font-mono font-medium tabular-nums">
            {formatMinor(entry.value, currency.decimals)} {currency.code}
          </span>
        </p>
      ))}
    </div>
  );
}

export function AnalyticsPage() {
  const [preset, setPreset] = useState<PresetKey>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [courseId, setCourseId] = useState('');
  const [methodId, setMethodId] = useState('');
  const [currencyCode, setCurrencyCode] = useState('');
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
    const spanDays = (to.getTime() - from.getTime()) / 86_400_000;
    return {
      from,
      to,
      granularity: (spanDays <= 35
        ? 'day'
        : spanDays <= 190
          ? 'week'
          : 'month') as 'day' | 'week' | 'month',
    };
  }, [preset, customFrom, customTo]);

  const effectiveRange = range ?? presetRange('month');
  const summary = useAnalyticsSummary(
    effectiveRange.from,
    effectiveRange.to,
    range !== null,
  );
  const series = useTimeseries(
    effectiveRange.from,
    effectiveRange.to,
    effectiveRange.granularity,
    {
      courseId: courseId || undefined,
      methodId: methodId || undefined,
      currencyCode: currencyCode || undefined,
    },
    range !== null,
  );
  const courses = useCourses();
  const methods = usePaymentMethodsList();
  const currencies = useCurrencies();
  const courseReport = useCourseReport();
  const teacherReport = useTeacherReport();

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

  const chartData: ChartRow[] = useMemo(
    () =>
      (series.data?.buckets ?? []).map((bucket) => ({
        ...bucket,
        label: bucketLabel(bucket.bucket, series.data?.granularity ?? 'day'),
      })),
    [series.data],
  );

  const courseColumns: DataListColumn<CourseReportRow>[] = [
    {
      key: 'course',
      header: 'Course',
      render: (row) => <p className="font-semibold">{row.course.name}</p>,
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
      header: 'Outstanding',
      align: 'right',
      render: (row) => (
        <Money
          amountMinor={row.outstandingMinor}
          currency={row.course.currency}
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

  const teacherColumns: DataListColumn<TeacherReportRow>[] = [
    {
      key: 'teacher',
      header: 'Teacher',
      render: (row) => <p className="font-semibold">{row.teacher.name}</p>,
    },
    {
      key: 'earned',
      header: 'Earned',
      align: 'right',
      render: (row) =>
        summary.data && (
          <Money
            amountMinor={row.earnedBaseMinor}
            currency={summary.data.baseCurrency}
          />
        ),
    },
    {
      key: 'paid',
      header: 'Paid out',
      align: 'right',
      render: (row) =>
        summary.data && (
          <Money
            amountMinor={row.paidBaseMinor}
            currency={summary.data.baseCurrency}
            tone="muted"
          />
        ),
    },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right',
      render: (row) =>
        summary.data && (
          <Money
            amountMinor={row.balanceBaseMinor}
            currency={summary.data.baseCurrency}
            tone={row.balanceBaseMinor > 0 ? 'default' : 'paid'}
          />
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="All figures converted to the base currency"
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
            icon={ChartNoAxesColumn}
            title="Pick a start and end date"
            description="Choose both dates (start before end) and the numbers will load."
          />
        ) : (
          <>
            {summary.isPending ? (
              <LoadingState label="Crunching the numbers" />
            ) : summary.isError ? (
              <ErrorState onRetry={() => void summary.refetch()} />
            ) : (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <KpiTile
                  label="Income"
                  delta={
                    <>
                      <Delta
                        current={summary.data.income.totalMinor}
                        previous={summary.data.income.previousTotalMinor}
                        goodWhenUp
                      />
                      <p className="mt-0.5 text-[11px] text-faint">
                        courses{' '}
                        {compactMajor(
                          summary.data.income.coursePaymentsMinor,
                          summary.data.baseCurrency.decimals,
                        )}{' '}
                        · other{' '}
                        {compactMajor(
                          summary.data.income.otherIncomeMinor,
                          summary.data.baseCurrency.decimals,
                        )}
                      </p>
                    </>
                  }
                >
                  <Money
                    amountMinor={summary.data.income.totalMinor}
                    currency={summary.data.baseCurrency}
                  />
                </KpiTile>
                <KpiTile
                  label="Outcome"
                  delta={
                    <>
                      <Delta
                        current={summary.data.outcome.totalMinor}
                        previous={summary.data.outcome.previousTotalMinor}
                        goodWhenUp={false}
                      />
                      <p className="mt-0.5 text-[11px] text-faint">
                        expenses{' '}
                        {compactMajor(
                          summary.data.outcome.expensesMinor,
                          summary.data.baseCurrency.decimals,
                        )}{' '}
                        · payouts{' '}
                        {compactMajor(
                          summary.data.outcome.teacherPayoutsMinor,
                          summary.data.baseCurrency.decimals,
                        )}
                      </p>
                    </>
                  }
                >
                  <Money
                    amountMinor={summary.data.outcome.totalMinor}
                    currency={summary.data.baseCurrency}
                  />
                </KpiTile>
                <KpiTile
                  label="Net profit"
                  delta={
                    <Delta
                      current={summary.data.netMinor}
                      previous={summary.data.previousNetMinor}
                      goodWhenUp
                    />
                  }
                >
                  <Money
                    amountMinor={summary.data.netMinor}
                    currency={summary.data.baseCurrency}
                    tone={summary.data.netMinor < 0 ? 'overdue' : 'paid'}
                  />
                </KpiTile>
                <KpiTile
                  label="Outstanding"
                  delta={
                    summary.data.overdueCount > 0 ? (
                      <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-overdue">
                        <AlarmClock className="size-3" />
                        {summary.data.overdueCount} overdue
                      </p>
                    ) : undefined
                  }
                >
                  <Money
                    amountMinor={summary.data.outstandingMinor}
                    currency={summary.data.baseCurrency}
                  />
                </KpiTile>
              </div>
            )}

            <section className="space-y-3">
              <div className="grid gap-2.5 sm:grid-cols-3">
                <Select
                  value={courseId}
                  onValueChange={setCourseId}
                  ariaLabel="Filter charts by course"
                  options={[
                    { value: '', label: 'All courses' },
                    ...(courses.data ?? []).map((course) => ({
                      value: course.id,
                      label: course.name,
                    })),
                  ]}
                />
                <Select
                  value={methodId}
                  onValueChange={setMethodId}
                  ariaLabel="Filter charts by payment method"
                  options={[
                    { value: '', label: 'All methods' },
                    ...(methods.data ?? []).map((method) => ({
                      value: method.id,
                      label: method.name,
                    })),
                  ]}
                />
                <Select
                  value={currencyCode}
                  onValueChange={setCurrencyCode}
                  ariaLabel="Filter charts by currency"
                  options={[
                    { value: '', label: 'All currencies' },
                    ...(currencies.data ?? []).map((currency) => ({
                      value: currency.code,
                      label: currency.code,
                    })),
                  ]}
                />
              </div>

              {focusCourse && (
                <Card className="space-y-3 p-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-faint">
                      Course focus
                    </p>
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
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">
                        Expected
                      </p>
                      <Money
                        amountMinor={focusCourse.expectedMinor}
                        currency={focusCourse.course.currency}
                        className="text-[15px]"
                      />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">
                        Collected
                      </p>
                      <Money
                        amountMinor={focusCourse.collectedMinor}
                        currency={focusCourse.course.currency}
                        tone="paid"
                        className="text-[15px]"
                      />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">
                        Not paid yet
                      </p>
                      <Money
                        amountMinor={focusCourse.outstandingMinor}
                        currency={focusCourse.course.currency}
                        tone={
                          focusCourse.outstandingMinor > 0 ? 'overdue' : 'muted'
                        }
                        className="text-[15px]"
                      />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">
                        Teacher cost
                      </p>
                      <Money
                        amountMinor={focusCourse.teacherCostMinor}
                        currency={focusCourse.course.currency}
                        tone="muted"
                        className="text-[15px]"
                      />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">
                        Net margin
                      </p>
                      <Money
                        amountMinor={focusCourse.marginMinor}
                        currency={focusCourse.course.currency}
                        tone={focusCourse.marginMinor < 0 ? 'overdue' : 'paid'}
                        className="text-[15px]"
                      />
                    </div>
                  </div>
                </Card>
              )}

              {series.isPending ? (
                <LoadingState label="Drawing the charts" />
              ) : series.isError ? (
                <ErrorState onRetry={() => void series.refetch()} />
              ) : chartData.length === 0 ? (
                <EmptyState
                  icon={ChartNoAxesColumn}
                  title="No money moved in this period"
                  description="Try a longer period, or clear the filters."
                />
              ) : (
                <>
                  <Card className="p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="font-display text-base font-semibold">
                        Income vs outcome
                      </h2>
                      <div className="flex gap-3">
                        <LegendChip color={INCOME_COLOR} label="Income" />
                        <LegendChip color={OUTCOME_COLOR} label="Outcome" />
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={chartData} barGap={2}>
                        <CartesianGrid stroke={GRID_COLOR} vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11, fill: TICK_COLOR }}
                          tickLine={false}
                          axisLine={false}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: TICK_COLOR }}
                          tickLine={false}
                          axisLine={false}
                          width={44}
                          tickFormatter={(value: number) =>
                            compactMajor(
                              value,
                              series.data.baseCurrency.decimals,
                            )
                          }
                        />
                        <Tooltip
                          cursor={{ fill: 'rgba(20, 96, 107, 0.06)' }}
                          content={
                            <ChartTooltip currency={series.data.baseCurrency} />
                          }
                        />
                        <Bar
                          dataKey="incomeMinor"
                          fill={INCOME_COLOR}
                          radius={[3, 3, 0, 0]}
                          maxBarSize={28}
                        />
                        <Bar
                          dataKey="outcomeMinor"
                          fill={OUTCOME_COLOR}
                          radius={[3, 3, 0, 0]}
                          maxBarSize={28}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>

                  <Card className="p-4">
                    <h2 className="mb-3 font-display text-base font-semibold">
                      Net profit trend
                    </h2>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={chartData}>
                        <CartesianGrid stroke={GRID_COLOR} vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11, fill: TICK_COLOR }}
                          tickLine={false}
                          axisLine={false}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: TICK_COLOR }}
                          tickLine={false}
                          axisLine={false}
                          width={44}
                          tickFormatter={(value: number) =>
                            compactMajor(
                              value,
                              series.data.baseCurrency.decimals,
                            )
                          }
                        />
                        <ReferenceLine
                          y={0}
                          stroke={TICK_COLOR}
                          strokeDasharray="4 4"
                        />
                        <Tooltip
                          cursor={{ stroke: GRID_COLOR }}
                          content={
                            <ChartTooltip currency={series.data.baseCurrency} />
                          }
                        />
                        <Line
                          type="monotone"
                          dataKey="netMinor"
                          stroke={NET_COLOR}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>
                </>
              )}
            </section>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
              <Input
                type="search"
                value={reportSearch}
                onChange={(event) => setReportSearch(event.target.value)}
                placeholder="Search the reports by course or teacher"
                className="pl-10"
                aria-label="Search reports"
              />
            </div>

            <section className="space-y-3">
              <h2 className="font-display text-base font-semibold">
                By course
              </h2>
              {courseReport.isPending ? (
                <LoadingState />
              ) : courseReport.isError ? (
                <ErrorState onRetry={() => void courseReport.refetch()} />
              ) : (
                <DataList
                  columns={courseColumns}
                  rows={filteredCourses}
                  rowKey={(row) => row.course.id}
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
                        <span className="text-muted">Outstanding</span>
                        <Money
                          amountMinor={row.outstandingMinor}
                          currency={row.course.currency}
                          className="text-[13px]"
                        />
                      </div>
                      <div className="flex items-baseline justify-between text-[13px]">
                        <span className="text-muted">
                          Margin after teachers
                        </span>
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
                      No courses yet.
                    </Card>
                  }
                />
              )}
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-base font-semibold">
                By teacher
              </h2>
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
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">
                          {row.teacher.name}
                        </p>
                        <p className="text-[13px] text-muted">
                          {row.courses}{' '}
                          {row.courses === 1 ? 'course' : 'courses'}
                        </p>
                      </div>
                      {summary.data && (
                        <div className="text-right">
                          <Money
                            amountMinor={row.balanceBaseMinor}
                            currency={summary.data.baseCurrency}
                            className="text-sm"
                          />
                          <p className="text-[11px] text-muted">balance owed</p>
                        </div>
                      )}
                    </div>
                  )}
                  emptyState={
                    <Card className="p-4 text-center text-sm text-muted">
                      No teachers yet.
                    </Card>
                  }
                />
              )}
            </section>
          </>
        )}
      </PageBody>
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  );
}
