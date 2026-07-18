import {
  Banknote,
  BookOpen,
  Gift,
  Mail,
  Pencil,
  Phone,
  Receipt,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  useStudent,
  useStudentPayments,
  type EnrollmentView,
  type PaymentView,
} from '@/api/students';
import { PageBody, PageHeader } from '@/components/layout/page';
import { StudentFormDialog } from '@/components/students/student-form-dialog';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Money } from '@/components/ui/money';
import { LoadingState } from '@/components/ui/spinner';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { formatDate, ordinal } from '@/lib/dates';

function ContactRow({
  icon: Icon,
  value,
  href,
}: {
  icon: typeof Phone;
  value: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-paper active:bg-paper"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
        <Icon className="size-4" />
      </div>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {value}
      </span>
    </a>
  );
}

function EnrollmentCard({ enrollment }: { enrollment: EnrollmentView }) {
  const currency = enrollment.course.currency;
  const totalDue = enrollment.installments.reduce(
    (sum, installment) => sum + installment.amountDueMinor,
    0,
  );
  const totalPaid = enrollment.installments.reduce(
    (sum, installment) => sum + installment.amountPaidMinor,
    0,
  );
  const progress =
    totalDue > 0 ? Math.min(100, (totalPaid / totalDue) * 100) : 100;

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line/70 px-4 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold">{enrollment.course.name}</p>
            <p className="text-[13px] text-muted">
              {enrollment.planTemplate?.name ?? 'Custom plan'} · enrolled{' '}
              {formatDate(enrollment.enrolledAt)}
            </p>
          </div>
          {enrollment.isFree ? (
            <Badge tone="brand">
              <Gift className="mr-1 size-3" />
              Free
            </Badge>
          ) : (
            enrollment.discount && (
              <Badge tone="brand">{enrollment.discount.name}</Badge>
            )
          )}
        </div>
        {!enrollment.isFree && (
          <div className="mt-3 space-y-1.5">
            <div className="flex items-baseline justify-between text-[13px]">
              <span className="text-muted">
                Paid{' '}
                <Money
                  amountMinor={totalPaid}
                  currency={currency}
                  className="text-[13px]"
                />
              </span>
              <span className="text-muted">
                of{' '}
                <Money
                  amountMinor={totalDue}
                  currency={currency}
                  className="text-[13px]"
                />
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-paid transition-[width]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <ul className="divide-y divide-line/60">
        {enrollment.installments.map((installment) => (
          <li
            key={installment.id}
            className="flex items-center gap-3 px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {ordinal(installment.seq)} payment
              </p>
              <p className="text-[13px] text-muted">
                due {formatDate(installment.dueDate)}
              </p>
            </div>
            <div className="text-right">
              <Money
                amountMinor={
                  installment.status === 'PARTIAL'
                    ? installment.remainingMinor
                    : installment.amountDueMinor
                }
                currency={currency}
                className="text-sm"
              />
              {installment.status === 'PARTIAL' && (
                <p className="text-[11px] text-muted">remaining</p>
              )}
            </div>
            <StatusBadge status={installment.status} />
          </li>
        ))}
      </ul>

      {!enrollment.isFree && totalPaid < totalDue && (
        <div className="border-t border-line/70 p-3">
          <Link
            to={`/record?enrollmentId=${enrollment.id}`}
            className="flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-soft text-sm font-semibold text-brand-strong transition-colors hover:bg-brand/15"
          >
            <Banknote className="size-4" />
            Record payment
          </Link>
        </div>
      )}
    </Card>
  );
}

function PaymentRow({ payment }: { payment: PaymentView }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {payment.enrollment.course.name}
          <span className="text-muted">
            {' '}
            · {ordinal(payment.installment.seq)}
          </span>
        </p>
        <p className="text-[13px] text-muted">
          {formatDate(payment.paidAt)} · {payment.method.name}
        </p>
      </div>
      <div className="text-right">
        <Money
          amountMinor={payment.amountMinor}
          currency={payment.enrollment.course.currency}
          className="text-sm"
          tone={payment.voidedAt ? 'muted' : 'default'}
        />
        {payment.voidedAt && <Badge tone="overdue">Voided</Badge>}
      </div>
    </li>
  );
}

export function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const student = useStudent(id ?? '');
  const payments = useStudentPayments(id ?? '');
  const [editOpen, setEditOpen] = useState(false);

  if (student.isPending) {
    return (
      <>
        <PageHeader title="Student" back="/students" />
        <PageBody>
          <LoadingState />
        </PageBody>
      </>
    );
  }
  if (student.isError) {
    return (
      <>
        <PageHeader title="Student" back="/students" />
        <PageBody>
          <ErrorState onRetry={() => void student.refetch()} />
        </PageBody>
      </>
    );
  }

  const data = student.data;

  return (
    <>
      <PageHeader
        title={data.name}
        back="/students"
        action={
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil />
            Edit
          </Button>
        }
      />
      <PageBody className="space-y-5">
        <Card className="divide-y divide-line/60 overflow-hidden">
          <ContactRow
            icon={Phone}
            value={data.phone}
            href={`tel:${data.phone}`}
          />
          <ContactRow
            icon={Mail}
            value={data.email}
            href={`mailto:${data.email}`}
          />
        </Card>

        <section className="space-y-3">
          <h2 className="font-display text-base font-semibold">Enrollments</h2>
          {data.enrollments.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="Not enrolled yet"
              description="Enroll this student in a course from the Record payment flow."
            />
          ) : (
            data.enrollments.map((enrollment) => (
              <EnrollmentCard key={enrollment.id} enrollment={enrollment} />
            ))
          )}
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-base font-semibold">
            Payment history
          </h2>
          {payments.isPending ? (
            <LoadingState />
          ) : payments.isError ? (
            <ErrorState onRetry={() => void payments.refetch()} />
          ) : payments.data.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No payments yet"
              description="Payments recorded for this student will show up here."
            />
          ) : (
            <Card>
              <ul className="divide-y divide-line/60">
                {payments.data.map((payment) => (
                  <PaymentRow key={payment.id} payment={payment} />
                ))}
              </ul>
            </Card>
          )}
        </section>
      </PageBody>

      <StudentFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        student={data}
      />
    </>
  );
}
