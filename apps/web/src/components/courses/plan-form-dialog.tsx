import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAddPlan, useReplacePlan, type PlanRow } from '@/api/courses';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input, Label, TextField } from '@/components/ui/input';
import {
  minorToMajorString,
  parseMajorToMinor,
} from '@/components/ui/money-input';
import type { CurrencyInfo } from '@/lib/money';
import { ordinal } from '@/lib/dates';

interface RowState {
  amount: string;
  dueDays: string;
}

export function PlanFormDialog({
  open,
  onOpenChange,
  courseId,
  currency,
  plan,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  currency: CurrencyInfo;
  plan?: PlanRow;
}) {
  const isEdit = Boolean(plan);
  const [name, setName] = useState('');
  const [rows, setRows] = useState<RowState[]>([{ amount: '', dueDays: '0' }]);

  useEffect(() => {
    if (!open) return;
    setName(plan?.name ?? '');
    setRows(
      plan
        ? plan.installments.map((installment) => ({
            amount: minorToMajorString(
              installment.amountMinor,
              currency.decimals,
            ),
            dueDays: String(installment.dueDays),
          }))
        : [{ amount: '', dueDays: '0' }],
    );
  }, [open, plan, currency.decimals]);

  const addPlan = useAddPlan(courseId);
  const replacePlan = useReplacePlan(courseId);
  const pending = addPlan.isPending || replacePlan.isPending;

  const setRow = (index: number, patch: Partial<RowState>) => {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

  const submit = () => {
    if (!name.trim()) {
      toast.error('Give the plan a name');
      return;
    }
    const installments: { amountMinor: number; dueDays: number }[] = [];
    for (const [index, row] of rows.entries()) {
      const amountMinor = parseMajorToMinor(row.amount, currency.decimals);
      const dueDays = Number(row.dueDays);
      if (!amountMinor) {
        toast.error(`Enter an amount for the ${ordinal(index + 1)} payment`);
        return;
      }
      if (!Number.isInteger(dueDays) || dueDays < 0) {
        toast.error(
          `Due days for the ${ordinal(index + 1)} payment must be 0 or more`,
        );
        return;
      }
      installments.push({ amountMinor, dueDays });
    }
    const input = { name: name.trim(), installments };
    const options = {
      onSuccess: () => {
        toast.success(isEdit ? 'Plan updated' : 'Plan added');
        onOpenChange(false);
      },
      onError: (error: Error) => toast.error(error.message),
    };
    if (isEdit && plan) {
      replacePlan.mutate({ planId: plan.id, input }, options);
    } else {
      addPlan.mutate(input, options);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{isEdit ? 'Edit plan' : 'New plan'}</DialogTitle>
        <DialogDescription>
          Amounts are in {currency.code}. Due days count from the day the
          student enrolls (0 = due immediately).
        </DialogDescription>
        <div className="mt-4 space-y-4">
          <TextField
            label="Plan name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="3 installments"
          />
          <div className="space-y-2">
            <Label>Installments</Label>
            {rows.map((row, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="w-9 shrink-0 text-[13px] font-semibold text-faint">
                  {ordinal(index + 1)}
                </span>
                <Input
                  value={row.amount}
                  onChange={(event) =>
                    setRow(index, { amount: event.target.value })
                  }
                  inputMode="decimal"
                  placeholder="Amount"
                  aria-label={`Amount for payment ${index + 1}`}
                  className="font-mono tabular-nums"
                />
                <Input
                  value={row.dueDays}
                  onChange={(event) =>
                    setRow(index, { dueDays: event.target.value })
                  }
                  inputMode="numeric"
                  placeholder="Days"
                  aria-label={`Due days for payment ${index + 1}`}
                  className="w-24 shrink-0"
                />
                <button
                  type="button"
                  onClick={() =>
                    setRows((current) => current.filter((_, i) => i !== index))
                  }
                  disabled={rows.length === 1}
                  aria-label={`Remove payment ${index + 1}`}
                  className="rounded-lg p-2 text-faint transition-colors hover:bg-line/60 hover:text-overdue disabled:opacity-30"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
            <p className="text-[11px] text-faint">Amount · due after N days</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setRows((current) => [
                  ...current,
                  { amount: '', dueDays: '30' },
                ])
              }
            >
              <Plus />
              Add installment
            </Button>
          </div>
          <Button className="w-full" onClick={submit} loading={pending}>
            {isEdit ? 'Save plan' : 'Add plan'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
