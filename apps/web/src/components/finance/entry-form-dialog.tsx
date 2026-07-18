import { LedgerEntryType } from '@cyberpedia/shared';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  useCreateEntry,
  useLedgerCategories,
  useUpdateEntry,
  type LedgerEntryRow,
} from '@/api/finance';
import { useCurrencies } from '@/api/reference';
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
  MoneyInput,
  parseMajorToMinor,
} from '@/components/ui/money-input';
import { Select } from '@/components/ui/select';

function toDateInput(value: string | Date): string {
  return new Date(value).toISOString().slice(0, 10);
}

export function EntryFormDialog({
  open,
  onOpenChange,
  entry,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: LedgerEntryRow;
}) {
  const isEdit = Boolean(entry);
  const categories = useLedgerCategories();
  const currencies = useCurrencies();

  const [categoryId, setCategoryId] = useState('');
  const [currencyCode, setCurrencyCode] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(toDateInput(new Date()));
  const [note, setNote] = useState('');

  const activeCategories = (categories.data ?? []).filter(
    (category) => category.isActive,
  );
  const activeCurrencies = (currencies.data ?? []).filter(
    (currency) => currency.isActive,
  );

  useEffect(() => {
    if (!open) return;
    setCategoryId(entry?.category.id ?? '');
    setCurrencyCode(entry?.currencyCode ?? '');
    setAmount(
      entry
        ? minorToMajorString(entry.amountMinor, entry.currency.decimals)
        : '',
    );
    setDate(toDateInput(entry?.date ?? new Date()));
    setNote(entry?.note ?? '');
  }, [open, entry]);

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
  const selectedCategory = activeCategories.find(
    (category) => category.id === categoryId,
  );

  const create = useCreateEntry();
  const update = useUpdateEntry(entry?.id ?? '');
  const mutation = isEdit ? update : create;

  const submit = () => {
    if (!categoryId) {
      toast.error('Pick a category');
      return;
    }
    if (!selectedCurrency) {
      toast.error('Pick a currency');
      return;
    }
    const amountMinor = parseMajorToMinor(amount, selectedCurrency.decimals);
    if (!amountMinor) {
      toast.error('Enter an amount greater than zero');
      return;
    }
    mutation.mutate(
      {
        categoryId,
        amountMinor,
        currencyCode: selectedCurrency.code,
        date: new Date(`${date}T12:00:00Z`),
        note: note.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success(isEdit ? 'Entry updated' : 'Entry added');
          onOpenChange(false);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const incomeCategories = activeCategories.filter(
    (category) => category.type === LedgerEntryType.INCOME,
  );
  const expenseCategories = activeCategories.filter(
    (category) => category.type === LedgerEntryType.EXPENSE,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{isEdit ? 'Edit entry' : 'Add entry'}</DialogTitle>
        <DialogDescription>
          General money in or out, not tied to a course — rent, salaries,
          sponsorships…
        </DialogDescription>
        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              <option value="">Pick a category…</option>
              {expenseCategories.length > 0 && (
                <optgroup label="Expenses">
                  {expenseCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {incomeCategories.length > 0 && (
                <optgroup label="Income">
                  {incomeCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </Select>
            {selectedCategory && (
              <p className="text-[13px] text-faint">
                Counts as{' '}
                {selectedCategory.type === LedgerEntryType.INCOME
                  ? 'income'
                  : 'an expense'}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select
                value={currencyCode}
                onChange={(event) => setCurrencyCode(event.target.value)}
              >
                {activeCurrencies.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
          </div>
          {selectedCurrency && (
            <MoneyInput
              label="Amount"
              value={amount}
              onChange={setAmount}
              currency={selectedCurrency}
            />
          )}
          <TextField
            label="Note (optional)"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="e.g. office rent for July"
          />
          <Button
            className="w-full"
            onClick={submit}
            loading={mutation.isPending}
          >
            {isEdit ? 'Save changes' : 'Add entry'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
