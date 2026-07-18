import { CompensationType } from '@cyberpedia/shared';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  useAssignTeacher,
  useUpdateCourseTeacher,
  type CourseTeacherRow,
} from '@/api/courses';
import { useTeachers } from '@/api/teachers';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label, TextField } from '@/components/ui/input';
import {
  minorToMajorString,
  MoneyInput,
  parseMajorToMinor,
} from '@/components/ui/money-input';
import { Select } from '@/components/ui/select';
import type { CurrencyInfo } from '@/lib/money';

const COMP_LABELS: Record<CompensationType, string> = {
  PERCENTAGE: 'Percentage of collections',
  FIXED_COURSE: 'Fixed amount per course',
  FIXED_SESSION: 'Fixed amount per session',
};

export function AssignTeacherDialog({
  open,
  onOpenChange,
  courseId,
  currency,
  sessionsCount,
  assignment,
  assignedTeacherIds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  currency: CurrencyInfo;
  sessionsCount: number;
  assignment?: CourseTeacherRow;
  assignedTeacherIds: string[];
}) {
  const isEdit = Boolean(assignment);
  const teachers = useTeachers();
  const [teacherId, setTeacherId] = useState('');
  const [type, setType] = useState<CompensationType>(
    CompensationType.PERCENTAGE,
  );
  const [percent, setPercent] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (!open) return;
    setTeacherId(assignment?.teacherId ?? '');
    setType(assignment?.compensationType ?? CompensationType.PERCENTAGE);
    setPercent(assignment?.percent ? String(Number(assignment.percent)) : '');
    setAmount(
      assignment?.amountMinor != null
        ? minorToMajorString(assignment.amountMinor, currency.decimals)
        : '',
    );
  }, [open, assignment, currency.decimals]);

  const availableTeachers = (teachers.data ?? []).filter(
    (teacher) => isEdit || !assignedTeacherIds.includes(teacher.id),
  );

  const assign = useAssignTeacher(courseId);
  const update = useUpdateCourseTeacher(courseId);
  const pending = assign.isPending || update.isPending;

  const submit = () => {
    let percentValue: number | undefined;
    let amountMinor: number | undefined;
    if (type === CompensationType.PERCENTAGE) {
      percentValue = Number(percent);
      if (
        !Number.isFinite(percentValue) ||
        percentValue <= 0 ||
        percentValue > 100
      ) {
        toast.error('Percent must be between 0 and 100');
        return;
      }
    } else {
      amountMinor = parseMajorToMinor(amount, currency.decimals) ?? undefined;
      if (!amountMinor) {
        toast.error('Enter an amount greater than zero');
        return;
      }
    }
    const compensation = {
      compensationType: type,
      percent: percentValue,
      amountMinor,
    };
    const options = {
      onSuccess: () => {
        toast.success(isEdit ? 'Compensation updated' : 'Teacher assigned');
        onOpenChange(false);
      },
      onError: (error: Error) => toast.error(error.message),
    };
    if (isEdit && assignment) {
      update.mutate(
        { teacherId: assignment.teacherId, input: compensation },
        options,
      );
    } else {
      if (!teacherId) {
        toast.error('Pick a teacher');
        return;
      }
      assign.mutate({ teacherId, ...compensation }, options);
    }
  };

  const sessionTotal =
    type === CompensationType.FIXED_SESSION
      ? parseMajorToMinor(amount, currency.decimals)
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>
          {isEdit ? `Edit pay — ${assignment?.teacher.name}` : 'Assign teacher'}
        </DialogTitle>
        <DialogDescription>
          How this teacher is paid for this course.
        </DialogDescription>
        <div className="mt-4 space-y-4">
          {!isEdit && (
            <div className="space-y-1.5">
              <Label>Teacher</Label>
              <Select
                value={teacherId}
                onValueChange={setTeacherId}
                placeholder="Pick a teacher…"
                options={availableTeachers.map((teacher) => ({
                  value: teacher.id,
                  label: teacher.name,
                }))}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Compensation</Label>
            <Select
              value={type}
              onValueChange={(next) => setType(next as CompensationType)}
              options={Object.entries(COMP_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          </div>
          {type === CompensationType.PERCENTAGE ? (
            <TextField
              label="Percent of collections"
              value={percent}
              onChange={(event) => setPercent(event.target.value)}
              inputMode="decimal"
              placeholder="30"
              hint="Share of every payment actually collected for this course"
            />
          ) : (
            <MoneyInput
              label={
                type === CompensationType.FIXED_COURSE
                  ? 'Amount per course'
                  : 'Amount per session'
              }
              value={amount}
              onChange={setAmount}
              currency={currency}
              hint={
                type === CompensationType.FIXED_SESSION && sessionTotal
                  ? `× ${sessionsCount} sessions = ${minorToMajorString(sessionTotal * sessionsCount, currency.decimals)} ${currency.code} total`
                  : undefined
              }
            />
          )}
          <Button className="w-full" onClick={submit} loading={pending}>
            {isEdit ? 'Save changes' : 'Assign teacher'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
