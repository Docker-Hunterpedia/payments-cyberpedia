import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useCurrencies } from '@/api/reference';
import { useCreatePayout, type TeacherEarnings } from '@/api/teachers';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label, TextField } from '@/components/ui/input';
import { MoneyInput, parseMajorToMinor } from '@/components/ui/money-input';
import { Select } from '@/components/ui/select';

export function PayoutDialog({
  open,
  onOpenChange,
  earnings,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  earnings: TeacherEarnings;
}) {
  const currencies = useCurrencies();
  const [courseId, setCourseId] = useState('');
  const [currencyCode, setCurrencyCode] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return;
    setCourseId(earnings.courses[0]?.course.id ?? '');
    setCurrencyCode('');
    setAmount('');
    setNote('');
  }, [open, earnings]);

  const createPayout = useCreatePayout(earnings.teacher.id);

  const selectedCourse = earnings.courses.find(
    (row) => row.course.id === courseId,
  );
  const activeCurrencies = (currencies.data ?? []).filter(
    (currency) => currency.isActive,
  );
  const generalCurrency = activeCurrencies.find(
    (currency) => currency.code === currencyCode,
  );
  const payoutCurrency = selectedCourse
    ? selectedCourse.course.currency
    : generalCurrency
      ? { code: generalCurrency.code, decimals: generalCurrency.decimals }
      : null;

  const submit = () => {
    if (!payoutCurrency) {
      toast.error('Pick a currency for this payout');
      return;
    }
    const amountMinor = parseMajorToMinor(amount, payoutCurrency.decimals);
    if (!amountMinor) {
      toast.error('Enter an amount greater than zero');
      return;
    }
    createPayout.mutate(
      {
        courseId: courseId || undefined,
        currencyCode: courseId ? undefined : payoutCurrency.code,
        amountMinor,
        note: note.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Payout recorded');
          onOpenChange(false);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Record payout</DialogTitle>
        <DialogDescription>
          Money actually paid to {earnings.teacher.name}. It counts as outcome
          on the day it's recorded.
        </DialogDescription>
        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label>For course</Label>
            <Select
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
            >
              {earnings.courses.map((row) => (
                <option key={row.course.id} value={row.course.id}>
                  {row.course.name} ({row.course.currency.code})
                </option>
              ))}
              <option value="">General (not tied to a course)</option>
            </Select>
          </div>
          {!courseId && (
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select
                value={currencyCode}
                onChange={(event) => setCurrencyCode(event.target.value)}
              >
                <option value="">Pick a currency…</option>
                {activeCurrencies.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {payoutCurrency && (
            <MoneyInput
              label="Amount paid"
              value={amount}
              onChange={setAmount}
              currency={payoutCurrency}
            />
          )}
          <TextField
            label="Note (optional)"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="e.g. June payout, bank transfer"
          />
          <Button
            className="w-full"
            onClick={submit}
            loading={createPayout.isPending}
          >
            Record payout
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
