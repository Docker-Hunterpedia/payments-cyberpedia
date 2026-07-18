import {
  BadgeCheck,
  BookOpen,
  Check,
  ChevronRight,
  Gift,
  Search,
  UserPlus,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { useCourses, type CourseListItem } from '@/api/courses';
import {
  fetchEnrollment,
  useCourseDetail,
  useCreateEnrollment,
  useCreatePayment,
  useDiscounts,
  usePaymentMethods,
  type CreatedPayment,
  type EnrollmentResponse,
  type SelectedEnrollment,
} from '@/api/record';
import { useStudents, type StudentListItem } from '@/api/students';
import { PageBody, PageHeader } from '@/components/layout/page';
import { StudentFormDialog } from '@/components/students/student-form-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TextField } from '@/components/ui/input';
import { Money } from '@/components/ui/money';
import {
  minorToMajorString,
  MoneyInput,
  parseMajorToMinor,
} from '@/components/ui/money-input';
import { Select } from '@/components/ui/select';
import { LoadingState } from '@/components/ui/spinner';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { Input, Label } from '@/components/ui/input';
import { api } from '@/lib/api';
import { formatDate, ordinal } from '@/lib/dates';
import { formatMinor } from '@/lib/money';
import { cn } from '@/lib/utils';
import { useDebouncedValue } from '@/lib/use-debounced';

type Step = 'course' | 'student' | 'enroll' | 'payment' | 'done';

function toSelected(enrollment: EnrollmentResponse): SelectedEnrollment {
  return {
    id: enrollment.id,
    isFree: enrollment.isFree,
    student: { id: enrollment.student.id, name: enrollment.student.name },
    course: {
      id: enrollment.course.id,
      name: enrollment.course.name,
      currency: enrollment.course.currency,
    },
    installments: enrollment.installments,
  };
}

const STEP_TITLES: Record<Step, string> = {
  course: 'Which course?',
  student: 'Who is paying?',
  enroll: 'Enroll student',
  payment: 'Payment details',
  done: 'Payment recorded',
};

export function RecordPaymentPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('course');
  const [course, setCourse] = useState<CourseListItem | null>(null);
  const [student, setStudent] = useState<StudentListItem | null>(null);
  const [enrollment, setEnrollment] = useState<SelectedEnrollment | null>(null);
  const [result, setResult] = useState<CreatedPayment | null>(null);
  const [checkingStudent, setCheckingStudent] = useState(false);
  const [prefillLoading, setPrefillLoading] = useState(
    Boolean(searchParams.get('enrollmentId')),
  );

  // ?enrollmentId= jumps straight to the payment step
  const prefillDone = useRef(false);
  useEffect(() => {
    const enrollmentId = searchParams.get('enrollmentId');
    if (!enrollmentId || prefillDone.current) return;
    prefillDone.current = true;
    fetchEnrollment(enrollmentId)
      .then((data) => {
        setEnrollment(toSelected(data));
        setStep('payment');
      })
      .catch(() => toast.error('Could not load that enrollment'))
      .finally(() => setPrefillLoading(false));
  }, [searchParams]);

  const reset = () => {
    setStep('course');
    setCourse(null);
    setStudent(null);
    setEnrollment(null);
    setResult(null);
  };

  const backTarget: Partial<Record<Step, () => void>> = {
    student: () => setStep('course'),
    enroll: () => setStep('student'),
    payment:
      enrollment && !course
        ? undefined
        : () => setStep(course ? 'student' : 'course'),
  };

  const pickStudent = async (picked: StudentListItem) => {
    if (!course) return;
    setStudent(picked);
    setCheckingStudent(true);
    try {
      const detail = await fetchStudentEnrollment(picked.id, course.id);
      if (detail) {
        setEnrollment({
          id: detail.id,
          isFree: detail.isFree,
          student: { id: picked.id, name: picked.name },
          course: {
            id: course.id,
            name: course.name,
            currency: course.currency,
          },
          installments: detail.installments,
        });
        setStep('payment');
      } else {
        setEnrollment(null);
        setStep('enroll');
      }
    } catch {
      toast.error('Could not check this student — try again');
    } finally {
      setCheckingStudent(false);
    }
  };

  if (prefillLoading) {
    return (
      <>
        <PageHeader title="Record payment" />
        <PageBody>
          <LoadingState label="Loading enrollment" />
        </PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={STEP_TITLES[step]}
        subtitle={step === 'done' ? undefined : 'Record a payment'}
        action={
          step !== 'done' && backTarget[step] ? (
            <Button variant="ghost" size="sm" onClick={backTarget[step]}>
              Back
            </Button>
          ) : undefined
        }
      />
      <PageBody className="space-y-4">
        {step === 'course' && (
          <CourseStep
            onPick={(picked) => {
              setCourse(picked);
              setStep('student');
            }}
          />
        )}
        {step === 'student' && course && (
          <StudentStep
            course={course}
            checking={checkingStudent}
            onPick={(picked) => void pickStudent(picked)}
          />
        )}
        {step === 'enroll' && course && student && (
          <EnrollStep
            course={course}
            student={student}
            onEnrolled={(created) => {
              setEnrollment(toSelected(created));
              setStep('payment');
            }}
          />
        )}
        {step === 'payment' && enrollment && (
          <PaymentStep
            enrollment={enrollment}
            onRecorded={(payment) => {
              setResult(payment);
              setStep('done');
            }}
          />
        )}
        {step === 'done' && result && (
          <DoneStep
            payment={result}
            onRecordAnother={reset}
            onViewStudent={() =>
              void navigate(`/students/${result.enrollment.student.id}`)
            }
          />
        )}
      </PageBody>
    </>
  );
}

async function fetchStudentEnrollment(studentId: string, courseId: string) {
  const detail = await api<{
    enrollments: {
      id: string;
      isFree: boolean;
      course: { id: string };
      installments: SelectedEnrollment['installments'];
    }[];
  }>(`/students/${studentId}`);
  return detail.enrollments.find((e) => e.course.id === courseId) ?? null;
}

function CourseStep({ onPick }: { onPick: (course: CourseListItem) => void }) {
  const courses = useCourses();
  if (courses.isPending) return <LoadingState label="Loading courses" />;
  if (courses.isError)
    return <ErrorState onRetry={() => void courses.refetch()} />;

  const active = courses.data.filter((course) => course.status === 'ACTIVE');
  if (active.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="No active courses"
        description="An admin needs to create a course before payments can be recorded."
      />
    );
  }
  return (
    <ul className="space-y-2.5">
      {active.map((course) => (
        <li key={course.id}>
          <button
            type="button"
            onClick={() => onPick(course)}
            className="w-full rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
          >
            <Card className="flex items-center gap-3 p-4 transition-colors hover:border-brand/40 active:bg-paper">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{course.name}</p>
                <p className="text-[13px] text-muted">
                  <Money
                    amountMinor={course.priceMinor}
                    currency={course.currency}
                    className="text-[13px]"
                  />
                  <span> · {course._count.plans} plans</span>
                </p>
              </div>
              <ChevronRight className="size-5 shrink-0 text-faint" />
            </Card>
          </button>
        </li>
      ))}
    </ul>
  );
}

function StudentStep({
  course,
  checking,
  onPick,
}: {
  course: CourseListItem;
  checking: boolean;
  onPick: (student: StudentListItem) => void;
}) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim());
  const students = useStudents(debouncedSearch);
  const [createOpen, setCreateOpen] = useState(false);

  if (checking) return <LoadingState label="Checking enrollment" />;

  return (
    <div className="space-y-3">
      <Card className="flex items-center gap-3 border-brand/20 bg-brand-soft/40 px-4 py-3">
        <BookOpen className="size-4 shrink-0 text-brand" />
        <p className="min-w-0 flex-1 truncate text-sm font-medium">
          {course.name}
        </p>
      </Card>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name or phone"
          className="pl-10"
          aria-label="Search students"
          autoFocus
        />
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => setCreateOpen(true)}
      >
        <UserPlus />
        New student
      </Button>

      {students.isPending ? (
        <LoadingState />
      ) : students.isError ? (
        <ErrorState onRetry={() => void students.refetch()} />
      ) : students.data.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No students found"
          description="Try another spelling, or add them as a new student."
        />
      ) : (
        <ul className="space-y-2">
          {students.data.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onPick(item)}
                className="w-full rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
              >
                <Card className="flex items-center gap-3 px-4 py-3 transition-colors hover:border-brand/40 active:bg-paper">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{item.name}</p>
                    <p className="truncate font-mono text-[13px] text-muted">
                      {item.phone}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-faint" />
                </Card>
              </button>
            </li>
          ))}
        </ul>
      )}

      <StudentFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={(saved) =>
          onPick({ ...saved, _count: { enrollments: 0 } } as StudentListItem)
        }
      />
    </div>
  );
}

function EnrollStep({
  course,
  student,
  onEnrolled,
}: {
  course: CourseListItem;
  student: StudentListItem;
  onEnrolled: (enrollment: EnrollmentResponse) => void;
}) {
  const detail = useCourseDetail(course.id, true);
  const discounts = useDiscounts(true);
  const [planId, setPlanId] = useState('');
  const [discountId, setDiscountId] = useState('');
  const enroll = useCreateEnrollment();

  useEffect(() => {
    if (detail.data && !planId && detail.data.plans.length > 0) {
      setPlanId(detail.data.plans[0].id);
    }
  }, [detail.data, planId]);

  if (detail.isPending) return <LoadingState label="Loading plans" />;
  if (detail.isError)
    return <ErrorState onRetry={() => void detail.refetch()} />;

  const usableDiscounts = (discounts.data ?? []).filter(
    (discount) =>
      discount.isActive && discount.currencyCode === course.currency.code,
  );

  const submit = () => {
    enroll.mutate(
      {
        studentId: student.id,
        courseId: course.id,
        planTemplateId: planId,
        discountId: discountId || undefined,
      },
      {
        onSuccess: (created) => {
          toast.success(`${student.name} enrolled`);
          onEnrolled(created);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <div className="space-y-4">
      <Card className="px-4 py-3">
        <p className="text-sm">
          <span className="font-semibold">{student.name}</span>
          <span className="text-muted"> is not enrolled in </span>
          <span className="font-semibold">{course.name}</span>
          <span className="text-muted"> yet. Pick a plan to enroll them.</span>
        </p>
      </Card>

      <div className="space-y-2">
        <Label>Payment plan</Label>
        {detail.data.plans.map((plan) => (
          <button
            key={plan.id}
            type="button"
            onClick={() => setPlanId(plan.id)}
            className={cn(
              'w-full rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
              planId === plan.id
                ? 'border-brand bg-brand-soft/50'
                : 'border-line bg-surface hover:border-brand/40',
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">{plan.name}</p>
              {planId === plan.id && <Check className="size-4 text-brand" />}
            </div>
            <p className="mt-1 font-mono text-[13px] tabular-nums text-muted">
              {plan.installments
                .map((installment) =>
                  formatMinor(
                    installment.amountMinor,
                    course.currency.decimals,
                  ),
                )
                .join(' + ')}{' '}
              <span className="font-sans">{course.currency.code}</span>
            </p>
          </button>
        ))}
      </div>

      {usableDiscounts.length > 0 && (
        <div className="space-y-1.5">
          <Label>Discount (optional)</Label>
          <Select
            value={discountId}
            onChange={(event) => setDiscountId(event.target.value)}
          >
            <option value="">No discount</option>
            {usableDiscounts.map((discount) => (
              <option key={discount.id} value={discount.id}>
                {discount.name} (−
                {formatMinor(
                  discount.amountMinor,
                  course.currency.decimals,
                )}{' '}
                {course.currency.code})
              </option>
            ))}
          </Select>
        </div>
      )}

      <Button
        className="w-full"
        size="lg"
        onClick={submit}
        loading={enroll.isPending}
        disabled={!planId}
      >
        Enroll {student.name.split(' ')[0]}
      </Button>
    </div>
  );
}

function PaymentStep({
  enrollment,
  onRecorded,
}: {
  enrollment: SelectedEnrollment;
  onRecorded: (payment: CreatedPayment) => void;
}) {
  const currency = enrollment.course.currency;
  const open = enrollment.installments.filter(
    (installment) => installment.remainingMinor > 0,
  );
  const methods = usePaymentMethods();
  const createPayment = useCreatePayment();

  const [installmentId, setInstallmentId] = useState(open[0]?.id ?? '');
  const [amount, setAmount] = useState(
    open[0]
      ? minorToMajorString(open[0].remainingMinor, currency.decimals)
      : '',
  );
  const [amountTouched, setAmountTouched] = useState(false);
  const [methodId, setMethodId] = useState('');
  const [note, setNote] = useState('');
  const [amountError, setAmountError] = useState<string>();

  const activeMethods = (methods.data ?? []).filter(
    (method) => method.isActive,
  );
  useEffect(() => {
    if (!methodId && activeMethods.length > 0) setMethodId(activeMethods[0].id);
  }, [methodId, activeMethods]);

  const selected = open.find((installment) => installment.id === installmentId);

  if (enrollment.isFree) {
    return (
      <EmptyState
        icon={Gift}
        title="This enrollment is free"
        description={`${enrollment.student.name} has the full-free badge for ${enrollment.course.name} — there is nothing to pay.`}
      />
    );
  }
  if (open.length === 0) {
    return (
      <EmptyState
        icon={BadgeCheck}
        title="Fully paid"
        description={`${enrollment.student.name} has no open installments in ${enrollment.course.name}.`}
        action={
          <Link
            to={`/students/${enrollment.student.id}`}
            className="text-sm font-semibold text-brand hover:underline"
          >
            View student
          </Link>
        }
      />
    );
  }

  const pickInstallment = (id: string) => {
    setInstallmentId(id);
    const picked = open.find((installment) => installment.id === id);
    if (picked && !amountTouched) {
      setAmount(minorToMajorString(picked.remainingMinor, currency.decimals));
    }
    setAmountError(undefined);
  };

  const submit = () => {
    if (!selected) return;
    const amountMinor = parseMajorToMinor(amount, currency.decimals);
    if (!amountMinor) {
      setAmountError('Enter an amount greater than zero');
      return;
    }
    if (amountMinor > selected.remainingMinor) {
      setAmountError(
        `This installment only has ${formatMinor(selected.remainingMinor, currency.decimals)} ${currency.code} remaining`,
      );
      return;
    }
    createPayment.mutate(
      {
        enrollmentId: enrollment.id,
        installmentId: selected.id,
        amountMinor,
        methodId,
        note: note.trim() || undefined,
      },
      {
        onSuccess: (payment) => {
          toast.success('Payment recorded');
          onRecorded(payment);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const amountMinorPreview = parseMajorToMinor(amount, currency.decimals);

  return (
    <div className="space-y-4">
      <Card className="px-4 py-3">
        <p className="truncate text-sm font-semibold">
          {enrollment.student.name}
        </p>
        <p className="truncate text-[13px] text-muted">
          {enrollment.course.name}
        </p>
      </Card>

      <div className="space-y-2">
        <Label>Installment</Label>
        {open.map((installment) => (
          <button
            key={installment.id}
            type="button"
            onClick={() => pickInstallment(installment.id)}
            className={cn(
              'flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
              installmentId === installment.id
                ? 'border-brand bg-brand-soft/50'
                : 'border-line bg-surface hover:border-brand/40',
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {ordinal(installment.seq)} payment
              </p>
              <p
                className={cn(
                  'text-[13px]',
                  installment.status === 'OVERDUE'
                    ? 'font-medium text-overdue'
                    : 'text-muted',
                )}
              >
                due {formatDate(installment.dueDate)}
              </p>
            </div>
            <Money
              amountMinor={installment.remainingMinor}
              currency={currency}
              className="text-sm"
            />
            {installmentId === installment.id && (
              <Check className="size-4 shrink-0 text-brand" />
            )}
          </button>
        ))}
      </div>

      <MoneyInput
        label="Amount received"
        value={amount}
        onChange={(value) => {
          setAmount(value);
          setAmountTouched(true);
          setAmountError(undefined);
        }}
        currency={currency}
        error={amountError}
        hint={
          selected
            ? `${formatMinor(selected.remainingMinor, currency.decimals)} ${currency.code} remaining on this installment`
            : undefined
        }
      />

      <div className="space-y-1.5">
        <Label>Payment method</Label>
        <Select
          value={methodId}
          onChange={(event) => setMethodId(event.target.value)}
        >
          {activeMethods.map((method) => (
            <option key={method.id} value={method.id}>
              {method.name}
            </option>
          ))}
        </Select>
      </div>

      <TextField
        label="Note (optional)"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="e.g. paid at front desk"
      />

      <Button
        className="w-full"
        size="lg"
        onClick={submit}
        loading={createPayment.isPending}
        disabled={!methodId}
      >
        Record{' '}
        {amountMinorPreview
          ? `${formatMinor(amountMinorPreview, currency.decimals)} ${currency.code}`
          : 'payment'}
      </Button>
    </div>
  );
}

function DoneStep({
  payment,
  onRecordAnother,
  onViewStudent,
}: {
  payment: CreatedPayment;
  onRecordAnother: () => void;
  onViewStudent: () => void;
}) {
  const currency = payment.enrollment.course.currency;
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-paid-soft text-paid">
        <Check className="size-8" />
      </div>
      <p className="font-display text-xl font-semibold">
        <Money
          amountMinor={payment.amountMinor}
          currency={currency}
          className="text-xl"
        />
      </p>
      <p className="mt-1 text-sm text-muted">
        {payment.enrollment.student.name} · {payment.enrollment.course.name} ·{' '}
        {ordinal(payment.installment.seq)} payment
      </p>
      <p className="mt-2 text-sm">
        {payment.installmentRemainingMinor === 0 ? (
          <span className="font-semibold text-paid">Installment settled</span>
        ) : (
          <span className="text-muted">
            <Money
              amountMinor={payment.installmentRemainingMinor}
              currency={currency}
              className="text-sm"
            />{' '}
            still remaining on this installment
          </span>
        )}
      </p>
      <div className="mt-8 grid w-full max-w-sm grid-cols-2 gap-3">
        <Button variant="outline" onClick={onViewStudent}>
          View student
        </Button>
        <Button onClick={onRecordAnother}>Record another</Button>
      </div>
    </div>
  );
}
