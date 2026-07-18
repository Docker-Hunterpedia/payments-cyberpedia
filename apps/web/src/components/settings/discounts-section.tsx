import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { DiscountItem } from '@/api/record';
import {
  useCreateDiscount,
  useCurrencies,
  useDiscountsList,
  useUpdateDiscount,
} from '@/api/reference';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import { LoadingState } from '@/components/ui/spinner';
import { formatMinor } from '@/lib/money';

function DiscountDialog({
  open,
  onOpenChange,
  discount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  discount?: DiscountItem;
}) {
  const isEdit = Boolean(discount);
  const currencies = useCurrencies();
  const [name, setName] = useState('');
  const [currencyCode, setCurrencyCode] = useState('');
  const [amount, setAmount] = useState('');
  const [active, setActive] = useState(true);

  const activeCurrencies = (currencies.data ?? []).filter(
    (currency) => currency.isActive,
  );

  useEffect(() => {
    if (!open) return;
    setName(discount?.name ?? '');
    setCurrencyCode(discount?.currencyCode ?? '');
    setAmount(
      discount
        ? minorToMajorString(discount.amountMinor, discount.currency.decimals)
        : '',
    );
    setActive(discount?.isActive ?? true);
  }, [open, discount]);

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

  const create = useCreateDiscount();
  const update = useUpdateDiscount(discount?.id ?? '');
  const mutation = isEdit ? update : create;

  const submit = () => {
    if (!name.trim()) {
      toast.error('Give the discount a name');
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
        name: name.trim(),
        amountMinor,
        currencyCode: selectedCurrency.code,
        ...(isEdit ? { isActive: active } : {}),
      },
      {
        onSuccess: () => {
          toast.success(isEdit ? 'Discount updated' : 'Discount added');
          onOpenChange(false);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{isEdit ? 'Edit discount' : 'New discount'}</DialogTitle>
        <DialogDescription>
          A fixed amount taken off an enrollment — it can only be applied to
          courses in the same currency.
        </DialogDescription>
        <div className="mt-4 space-y-4">
          <TextField
            label="Name / reason"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Early bird"
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select
                value={currencyCode}
                onValueChange={setCurrencyCode}
                options={activeCurrencies.map((currency) => ({
                  value: currency.code,
                  label: currency.code,
                }))}
              />
            </div>
            {isEdit && (
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={active ? 'active' : 'disabled'}
                  onValueChange={(next) => setActive(next === 'active')}
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'disabled', label: 'Disabled' },
                  ]}
                />
              </div>
            )}
          </div>
          {selectedCurrency && (
            <MoneyInput
              label="Discount amount"
              value={amount}
              onChange={setAmount}
              currency={selectedCurrency}
            />
          )}
          <Button
            className="w-full"
            onClick={submit}
            loading={mutation.isPending}
          >
            {isEdit ? 'Save changes' : 'Add discount'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DiscountsSection() {
  const discounts = useDiscountsList();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DiscountItem>();

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-semibold">Discounts</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setEditing(undefined);
            setDialogOpen(true);
          }}
        >
          <Plus />
          Add
        </Button>
      </div>
      {discounts.isPending ? (
        <LoadingState />
      ) : (discounts.data ?? []).length === 0 ? (
        <Card className="p-4 text-center text-sm text-muted">
          No discounts defined yet.
        </Card>
      ) : (
        <Card className="divide-y divide-line/60">
          {(discounts.data ?? []).map((discount) => (
            <button
              key={discount.id}
              type="button"
              onClick={() => {
                setEditing(discount);
                setDialogOpen(true);
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-paper"
            >
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {discount.name}
              </span>
              <span className="font-mono text-sm tabular-nums text-muted">
                −{formatMinor(discount.amountMinor, discount.currency.decimals)}{' '}
                {discount.currencyCode}
              </span>
              {!discount.isActive && <Badge tone="neutral">Off</Badge>}
            </button>
          ))}
        </Card>
      )}
      <DiscountDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        discount={editing}
      />
    </section>
  );
}
