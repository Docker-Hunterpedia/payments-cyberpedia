import { CompensationType } from '@cyberpedia/shared';
import { Banknote, Pencil, Trash2, Wallet } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import {
  useDeletePayout,
  useDeleteTeacher,
  useTeacherDetail,
  useTeacherEarnings,
  type TeacherEarningsCourse,
  type TeacherPayoutRow,
} from '@/api/teachers';
import { PayoutDialog } from '@/components/teachers/payout-dialog';
import { TeacherFormDialog } from '@/components/teachers/teacher-form-dialog';
import { PageBody, PageHeader } from '@/components/layout/page';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/dialog';
import { Money } from '@/components/ui/money';
import { LoadingState } from '@/components/ui/spinner';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { formatDate } from '@/lib/dates';
import { formatMinor } from '@/lib/money';

function StatTile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-faint">
        {label}
      </p>
      <p className="mt-1.5 text-lg">{children}</p>
    </Card>
  );
}

function courseCompensation(row: TeacherEarningsCourse): string {
  const currency = row.course.currency;
  if (row.compensationType === CompensationType.PERCENTAGE) {
    return `${Number(row.percent)}% of ${formatMinor(row.collectedMinor, currency.decimals)} ${currency.code} collected`;
  }
  const amount = formatMinor(row.amountMinor ?? 0, currency.decimals);
  if (row.compensationType === CompensationType.FIXED_COURSE) {
    return `${amount} ${currency.code} per course`;
  }
  return `${amount} ${currency.code} × ${row.course.sessionsCount} sessions`;
}

function PayoutRow({
  payout,
  onDelete,
}: {
  payout: TeacherPayoutRow;
  onDelete: (payout: TeacherPayoutRow) => void;
}) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {payout.course?.name ?? 'General payout'}
        </p>
        <p className="text-[13px] text-muted">
          {formatDate(payout.date)}
          {payout.note ? ` · ${payout.note}` : ''}
        </p>
      </div>
      <Money
        amountMinor={payout.amountMinor}
        currency={payout.currency}
        className="text-sm"
      />
      <button
        type="button"
        aria-label="Delete payout"
        onClick={() => onDelete(payout)}
        className="rounded-lg p-2 text-faint transition-colors hover:bg-line/60 hover:text-overdue"
      >
        <Trash2 className="size-4" />
      </button>
    </li>
  );
}

export function TeacherDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const detail = useTeacherDetail(id ?? '');
  const earnings = useTeacherEarnings(id ?? '');
  const [editOpen, setEditOpen] = useState(false);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [deletingPayout, setDeletingPayout] = useState<TeacherPayoutRow>();
  const [deleteTeacherOpen, setDeleteTeacherOpen] = useState(false);
  const deletePayout = useDeletePayout(id ?? '');
  const deleteTeacher = useDeleteTeacher();

  if (earnings.isPending || detail.isPending) {
    return (
      <>
        <PageHeader title="Teacher" back="/teachers" />
        <PageBody>
          <LoadingState />
        </PageBody>
      </>
    );
  }
  if (earnings.isError || detail.isError) {
    return (
      <>
        <PageHeader title="Teacher" back="/teachers" />
        <PageBody>
          <ErrorState
            onRetry={() => {
              void earnings.refetch();
              void detail.refetch();
            }}
          />
        </PageBody>
      </>
    );
  }

  const data = earnings.data;
  const byCurrency = data.totals.byCurrency;
  const single = byCurrency.length === 1 ? byCurrency[0] : null;

  return (
    <>
      <PageHeader
        title={data.teacher.name}
        back="/teachers"
        subtitle={detail.data.phone ?? undefined}
        action={
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil />
            Edit
          </Button>
        }
      />
      <PageBody className="space-y-6">
        {single ? (
          <div className="grid grid-cols-3 gap-3">
            <StatTile label="Earned">
              <Money
                amountMinor={single.earnedMinor}
                currency={single.currency}
              />
            </StatTile>
            <StatTile label="Paid out">
              <Money
                amountMinor={single.paidMinor}
                currency={single.currency}
              />
            </StatTile>
            <StatTile label="Balance">
              <Money
                amountMinor={single.balanceMinor}
                currency={single.currency}
                tone={single.balanceMinor > 0 ? 'default' : 'paid'}
              />
            </StatTile>
          </div>
        ) : byCurrency.length > 1 ? (
          <Card className="divide-y divide-line/60">
            {byCurrency.map((row) => (
              <div
                key={row.currencyCode}
                className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
              >
                <span className="font-semibold">{row.currencyCode}</span>
                <span className="text-muted">
                  earned {formatMinor(row.earnedMinor, row.currency.decimals)} ·
                  paid {formatMinor(row.paidMinor, row.currency.decimals)} ·
                  owed{' '}
                  <span className="font-medium text-ink">
                    {formatMinor(row.balanceMinor, row.currency.decimals)}
                  </span>
                </span>
              </div>
            ))}
          </Card>
        ) : null}

        <section className="space-y-3">
          <h2 className="font-display text-base font-semibold">Courses</h2>
          {data.courses.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="Not teaching yet"
              description="Assign this teacher to a course to start tracking earnings."
            />
          ) : (
            <Card className="divide-y divide-line/60">
              {data.courses.map((row) => (
                <Link
                  key={row.course.id}
                  to={`/courses/${row.course.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-paper"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {row.course.name}
                    </p>
                    <p className="text-[13px] text-muted">
                      {courseCompensation(row)}
                    </p>
                  </div>
                  <div className="text-right">
                    <Money
                      amountMinor={row.earnedMinor}
                      currency={row.course.currency}
                      className="text-sm"
                    />
                    <p className="text-[11px] text-muted">earned</p>
                  </div>
                </Link>
              ))}
            </Card>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Payouts</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPayoutOpen(true)}
            >
              <Banknote />
              Record payout
            </Button>
          </div>
          {data.payouts.length === 0 ? (
            <Card className="p-4 text-center text-sm text-muted">
              Nothing paid out yet.
            </Card>
          ) : (
            <Card>
              <ul className="divide-y divide-line/60">
                {data.payouts.map((payout) => (
                  <PayoutRow
                    key={payout.id}
                    payout={payout}
                    onDelete={setDeletingPayout}
                  />
                ))}
              </ul>
            </Card>
          )}
        </section>

        <Button
          variant="ghost"
          className="w-full text-overdue hover:text-overdue"
          onClick={() => setDeleteTeacherOpen(true)}
        >
          <Trash2 />
          Delete teacher
        </Button>
      </PageBody>

      <TeacherFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        teacher={detail.data}
      />
      <PayoutDialog
        open={payoutOpen}
        onOpenChange={setPayoutOpen}
        earnings={data}
      />
      <ConfirmDialog
        open={Boolean(deletingPayout)}
        onOpenChange={(open) => !open && setDeletingPayout(undefined)}
        title="Delete this payout?"
        description="The amount goes back into the teacher's balance and leaves the outcome numbers."
        confirmLabel="Delete payout"
        destructive
        loading={deletePayout.isPending}
        onConfirm={() => {
          if (!deletingPayout) return;
          deletePayout.mutate(deletingPayout.id, {
            onSuccess: () => {
              toast.success('Payout deleted');
              setDeletingPayout(undefined);
            },
            onError: (error) => toast.error(error.message),
          });
        }}
      />
      <ConfirmDialog
        open={deleteTeacherOpen}
        onOpenChange={setDeleteTeacherOpen}
        title={`Delete ${data.teacher.name}?`}
        description="Only possible while they are not assigned to any course."
        confirmLabel="Delete teacher"
        destructive
        loading={deleteTeacher.isPending}
        onConfirm={() => {
          deleteTeacher.mutate(data.teacher.id, {
            onSuccess: () => {
              toast.success('Teacher deleted');
              void navigate('/teachers');
            },
            onError: (error) => {
              toast.error(error.message);
              setDeleteTeacherOpen(false);
            },
          });
        }}
      />
    </>
  );
}
