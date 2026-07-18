import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  useCreateCourse,
  useUpdateCourse,
  type CourseFull,
} from '@/api/courses';
import { useCurrencies } from '@/api/reference';
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

export function CourseFormDialog({
  open,
  onOpenChange,
  course,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course?: CourseFull;
  onSaved?: (course: CourseFull) => void;
}) {
  const isEdit = Boolean(course);
  const currencies = useCurrencies();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [currencyCode, setCurrencyCode] = useState('');
  const [price, setPrice] = useState('');
  const [sessions, setSessions] = useState('0');
  const [status, setStatus] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');

  useEffect(() => {
    if (!open) return;
    setName(course?.name ?? '');
    setDescription(course?.description ?? '');
    setCurrencyCode(course?.currency.code ?? '');
    setPrice(
      course
        ? minorToMajorString(course.priceMinor, course.currency.decimals)
        : '',
    );
    setSessions(String(course?.sessionsCount ?? 0));
    setStatus(course?.status ?? 'ACTIVE');
  }, [open, course]);

  const activeCurrencies = (currencies.data ?? []).filter(
    (currency) => currency.isActive,
  );
  useEffect(() => {
    if (open && !currencyCode && activeCurrencies.length > 0) {
      setCurrencyCode(
        activeCurrencies.find((currency) => currency.isBase)?.code ??
          activeCurrencies[0].code,
      );
    }
  }, [open, currencyCode, activeCurrencies]);

  const selectedCurrency = activeCurrencies.find(
    (currency) => currency.code === currencyCode,
  );

  const create = useCreateCourse();
  const update = useUpdateCourse(course?.id ?? '');
  const mutation = isEdit ? update : create;

  const submit = () => {
    if (!name.trim()) {
      toast.error('Give the course a name');
      return;
    }
    if (!selectedCurrency) {
      toast.error('Pick a currency');
      return;
    }
    const priceMinor = parseMajorToMinor(price, selectedCurrency.decimals);
    if (!priceMinor) {
      toast.error('Enter a price greater than zero');
      return;
    }
    const sessionsCount = Number(sessions);
    if (!Number.isInteger(sessionsCount) || sessionsCount < 0) {
      toast.error('Sessions must be a whole number');
      return;
    }
    const base = {
      name: name.trim(),
      description: description.trim() || undefined,
      priceMinor,
      currencyCode: selectedCurrency.code,
      sessionsCount,
    };
    mutation.mutate(isEdit ? { ...base, status } : base, {
      onSuccess: (saved) => {
        toast.success(isEdit ? 'Course updated' : 'Course created');
        onOpenChange(false);
        onSaved?.(saved);
      },
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{isEdit ? 'Edit course' : 'New course'}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? 'Update the course details. Plans and teachers are managed on the course page.'
            : 'A "Full payment" plan is created automatically — add more plans after.'}
        </DialogDescription>
        <div className="mt-4 space-y-4">
          <TextField
            label="Course name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ethical Hacking 101"
          />
          <TextField
            label="Description (optional)"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Short summary shown to your team"
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select
                value={currencyCode}
                onChange={(event) => setCurrencyCode(event.target.value)}
                disabled={isEdit}
              >
                {activeCurrencies.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code}
                  </option>
                ))}
              </Select>
            </div>
            <TextField
              label="Sessions"
              type="number"
              inputMode="numeric"
              min={0}
              value={sessions}
              onChange={(event) => setSessions(event.target.value)}
              hint="Used for per-session teacher pay"
            />
          </div>
          {selectedCurrency && (
            <MoneyInput
              label="Course price"
              value={price}
              onChange={setPrice}
              currency={selectedCurrency}
            />
          )}
          {isEdit && (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as 'ACTIVE' | 'ARCHIVED')
                }
              >
                <option value="ACTIVE">Active</option>
                <option value="ARCHIVED">Archived</option>
              </Select>
            </div>
          )}
          <Button
            className="w-full"
            onClick={submit}
            loading={mutation.isPending}
          >
            {isEdit ? 'Save changes' : 'Create course'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
