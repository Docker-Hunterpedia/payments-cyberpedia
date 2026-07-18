import { CompensationType, Role } from '@cyberpedia/shared';
import { Pencil, Plus, Presentation, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useParams } from 'react-router';
import { toast } from 'sonner';
import {
  useCourseFull,
  useCourseSummary,
  useDeletePlan,
  useRemoveTeacher,
  type CourseFull,
  type CourseTeacherRow,
  type PlanRow,
} from '@/api/courses';
import { AssignTeacherDialog } from '@/components/courses/assign-teacher-dialog';
import { CourseFormDialog } from '@/components/courses/course-form-dialog';
import { PlanFormDialog } from '@/components/courses/plan-form-dialog';
import { PageBody, PageHeader } from '@/components/layout/page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/dialog';
import { Money } from '@/components/ui/money';
import { LoadingState } from '@/components/ui/spinner';
import { ErrorState } from '@/components/ui/states';
import { ordinal } from '@/lib/dates';
import { formatMinor, type CurrencyInfo } from '@/lib/money';
import { useAuth } from '@/providers/auth-provider';

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

function compensationLabel(
  row: CourseTeacherRow,
  currency: CurrencyInfo,
  sessionsCount: number,
): string {
  if (row.compensationType === CompensationType.PERCENTAGE) {
    return `${Number(row.percent)}% of collections`;
  }
  const amount = formatMinor(row.amountMinor ?? 0, currency.decimals);
  if (row.compensationType === CompensationType.FIXED_COURSE) {
    return `${amount} ${currency.code} per course`;
  }
  return `${amount} ${currency.code} × ${sessionsCount} sessions`;
}

function PlansSection({
  course,
  isAdmin,
}: {
  course: CourseFull;
  isAdmin: boolean;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanRow | undefined>();
  const [deletingPlan, setDeletingPlan] = useState<PlanRow | undefined>();
  const deletePlan = useDeletePlan(course.id);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-semibold">Payment plans</h2>
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingPlan(undefined);
              setFormOpen(true);
            }}
          >
            <Plus />
            Add plan
          </Button>
        )}
      </div>
      <div className="space-y-2.5">
        {course.plans.map((plan) => (
          <Card key={plan.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{plan.name}</p>
                <ul className="mt-1.5 space-y-0.5">
                  {plan.installments.map((installment) => (
                    <li
                      key={installment.id}
                      className="flex items-baseline justify-between text-[13px]"
                    >
                      <span className="text-muted">
                        {ordinal(installment.seq)} payment
                        {installment.dueDays > 0
                          ? ` · after ${installment.dueDays} days`
                          : ' · on enrollment'}
                      </span>
                      <Money
                        amountMinor={installment.amountMinor}
                        currency={course.currency}
                        className="text-[13px]"
                      />
                    </li>
                  ))}
                </ul>
              </div>
              {isAdmin && (
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    aria-label={`Edit ${plan.name}`}
                    onClick={() => {
                      setEditingPlan(plan);
                      setFormOpen(true);
                    }}
                    className="rounded-lg p-2 text-faint transition-colors hover:bg-line/60 hover:text-ink"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${plan.name}`}
                    onClick={() => setDeletingPlan(plan)}
                    className="rounded-lg p-2 text-faint transition-colors hover:bg-line/60 hover:text-overdue"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {isAdmin && (
        <>
          <PlanFormDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            courseId={course.id}
            currency={course.currency}
            plan={editingPlan}
          />
          <ConfirmDialog
            open={Boolean(deletingPlan)}
            onOpenChange={(open) => !open && setDeletingPlan(undefined)}
            title={`Delete "${deletingPlan?.name}"?`}
            description="Students already enrolled with this plan keep their installments — only the template goes away."
            confirmLabel="Delete plan"
            destructive
            loading={deletePlan.isPending}
            onConfirm={() => {
              if (!deletingPlan) return;
              deletePlan.mutate(deletingPlan.id, {
                onSuccess: () => {
                  toast.success('Plan deleted');
                  setDeletingPlan(undefined);
                },
                onError: (error) => toast.error(error.message),
              });
            }}
          />
        </>
      )}
    </section>
  );
}

function TeachersSection({ course }: { course: CourseFull }) {
  const [assignOpen, setAssignOpen] = useState(false);
  const [editing, setEditing] = useState<CourseTeacherRow | undefined>();
  const [removing, setRemoving] = useState<CourseTeacherRow | undefined>();
  const removeTeacher = useRemoveTeacher(course.id);
  const teachers = course.teachers ?? [];

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-semibold">Teachers</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setEditing(undefined);
            setAssignOpen(true);
          }}
        >
          <Plus />
          Assign
        </Button>
      </div>
      {teachers.length === 0 ? (
        <Card className="p-4 text-center text-sm text-muted">
          No teachers assigned to this course yet.
        </Card>
      ) : (
        <Card className="divide-y divide-line/60">
          {teachers.map((row) => (
            <div key={row.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                <Presentation className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {row.teacher.name}
                </p>
                <p className="text-[13px] text-muted">
                  {compensationLabel(
                    row,
                    course.currency,
                    course.sessionsCount,
                  )}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Edit pay for ${row.teacher.name}`}
                onClick={() => {
                  setEditing(row);
                  setAssignOpen(true);
                }}
                className="rounded-lg p-2 text-faint transition-colors hover:bg-line/60 hover:text-ink"
              >
                <Pencil className="size-4" />
              </button>
              <button
                type="button"
                aria-label={`Remove ${row.teacher.name}`}
                onClick={() => setRemoving(row)}
                className="rounded-lg p-2 text-faint transition-colors hover:bg-line/60 hover:text-overdue"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </Card>
      )}

      <AssignTeacherDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        courseId={course.id}
        currency={course.currency}
        sessionsCount={course.sessionsCount}
        assignment={editing}
        assignedTeacherIds={teachers.map((row) => row.teacherId)}
      />
      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(open) => !open && setRemoving(undefined)}
        title={`Remove ${removing?.teacher.name}?`}
        description="They will no longer earn from this course. Past payouts are kept."
        confirmLabel="Remove"
        destructive
        loading={removeTeacher.isPending}
        onConfirm={() => {
          if (!removing) return;
          removeTeacher.mutate(removing.teacherId, {
            onSuccess: () => {
              toast.success('Teacher removed');
              setRemoving(undefined);
            },
            onError: (error) => toast.error(error.message),
          });
        }}
      />
    </section>
  );
}

export function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isAdmin = user?.role === Role.ADMIN;
  const course = useCourseFull(id ?? '');
  const summary = useCourseSummary(id ?? '');
  const [editOpen, setEditOpen] = useState(false);

  if (course.isPending) {
    return (
      <>
        <PageHeader title="Course" back="/courses" />
        <PageBody>
          <LoadingState />
        </PageBody>
      </>
    );
  }
  if (course.isError) {
    return (
      <>
        <PageHeader title="Course" back="/courses" />
        <PageBody>
          <ErrorState onRetry={() => void course.refetch()} />
        </PageBody>
      </>
    );
  }

  const data = course.data;

  return (
    <>
      <PageHeader
        title={data.name}
        back="/courses"
        subtitle={`${formatMinor(data.priceMinor, data.currency.decimals)} ${data.currency.code} · ${data.sessionsCount} sessions${data.status === 'ARCHIVED' ? ' · archived' : ''}`}
        action={
          isAdmin ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
            >
              <Pencil />
              Edit
            </Button>
          ) : undefined
        }
      />
      <PageBody className="space-y-6">
        {data.status === 'ARCHIVED' && (
          <Badge tone="neutral">Archived — new enrollments are blocked</Badge>
        )}

        {summary.data && (
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Students">
              <span className="font-mono font-medium tabular-nums">
                {summary.data.enrollments}
              </span>
              {summary.data.freeEnrollments > 0 && (
                <span className="ml-1.5 text-[13px] text-muted">
                  ({summary.data.freeEnrollments} free)
                </span>
              )}
            </StatTile>
            <StatTile label="Expected">
              <Money
                amountMinor={summary.data.expectedMinor}
                currency={data.currency}
              />
            </StatTile>
            <StatTile label="Collected">
              <Money
                amountMinor={summary.data.collectedMinor}
                currency={data.currency}
                tone="paid"
              />
            </StatTile>
            <StatTile label="Outstanding">
              <Money
                amountMinor={summary.data.outstandingMinor}
                currency={data.currency}
                tone={summary.data.outstandingMinor > 0 ? 'default' : 'muted'}
              />
            </StatTile>
          </div>
        )}

        {data.description && (
          <p className="text-sm text-muted">{data.description}</p>
        )}

        <PlansSection course={data} isAdmin={isAdmin} />
        {isAdmin && <TeachersSection course={data} />}
      </PageBody>

      {isAdmin && (
        <CourseFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          course={data}
        />
      )}
    </>
  );
}
