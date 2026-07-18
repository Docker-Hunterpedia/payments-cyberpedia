import { Plus, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  useCreateCurrency,
  useCurrencies,
  useUpdateCurrency,
  type CurrencyRow,
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
import { Select } from '@/components/ui/select';
import { LoadingState } from '@/components/ui/spinner';

function CurrencyDialog({
  open,
  onOpenChange,
  currency,
  baseCode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency?: CurrencyRow;
  baseCode: string | undefined;
}) {
  const isEdit = Boolean(currency);
  const isBase = Boolean(currency?.isBase);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [decimals, setDecimals] = useState('2');
  const [rate, setRate] = useState('');
  const [makeBase, setMakeBase] = useState(false);
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    setCode(currency?.code ?? '');
    setName(currency?.name ?? '');
    setSymbol(currency?.symbol ?? '');
    setDecimals(String(currency?.decimals ?? 2));
    setRate(currency ? String(Number(currency.ratePerBase)) : '');
    setMakeBase(false);
    setActive(currency?.isActive ?? true);
  }, [open, currency]);

  const create = useCreateCurrency();
  const update = useUpdateCurrency(currency?.code ?? '');
  const mutation = isEdit ? update : create;

  const submit = () => {
    const decimalsValue = Number(decimals);
    const rateValue = Number(rate);
    if (!isEdit && !/^[A-Za-z]{3}$/.test(code.trim())) {
      toast.error('Code must be 3 letters, like USD or SYP');
      return;
    }
    if (!name.trim() || !symbol.trim()) {
      toast.error('Name and symbol are required');
      return;
    }
    if (
      !Number.isInteger(decimalsValue) ||
      decimalsValue < 0 ||
      decimalsValue > 4
    ) {
      toast.error('Decimals must be between 0 and 4');
      return;
    }
    if (
      !isBase &&
      !makeBase &&
      (!Number.isFinite(rateValue) || rateValue <= 0)
    ) {
      toast.error(
        `Enter the rate: how many ${code.toUpperCase() || 'units'} equal 1 ${baseCode ?? 'base'}`,
      );
      return;
    }
    const shared = {
      name: name.trim(),
      symbol: symbol.trim(),
      decimals: decimalsValue,
    };
    const options = {
      onSuccess: () => {
        toast.success(isEdit ? 'Currency updated' : 'Currency added');
        onOpenChange(false);
      },
      onError: (error: Error) => toast.error(error.message),
    };
    if (isEdit) {
      update.mutate(
        {
          ...shared,
          ...(isBase
            ? {}
            : makeBase
              ? { isBase: true }
              : { ratePerBase: rateValue, isActive: active }),
        },
        options,
      );
    } else {
      create.mutate(
        { code: code.trim().toUpperCase(), ...shared, ratePerBase: rateValue },
        options,
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>
          {isEdit ? `Edit ${currency?.code}` : 'New currency'}
        </DialogTitle>
        <DialogDescription>
          {isBase
            ? 'This is the base currency — every report converts into it. Its rate is always 1.'
            : `Rate = how many units equal 1 ${baseCode ?? 'base unit'}.`}
        </DialogDescription>
        <div className="mt-4 space-y-4">
          {!isEdit && (
            <TextField
              label="Code"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="SYP"
              maxLength={3}
              className="font-mono uppercase"
            />
          )}
          <TextField
            label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Syrian Pound"
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Symbol"
              value={symbol}
              onChange={(event) => setSymbol(event.target.value)}
              placeholder="£S"
            />
            <TextField
              label="Decimals"
              type="number"
              inputMode="numeric"
              min={0}
              max={4}
              value={decimals}
              onChange={(event) => setDecimals(event.target.value)}
              hint="0 for SYP, 2 for USD"
            />
          </div>
          {!isBase && !makeBase && (
            <TextField
              label={`Rate per 1 ${baseCode ?? 'base'}`}
              inputMode="decimal"
              value={rate}
              onChange={(event) => setRate(event.target.value)}
              placeholder="13000"
              className="font-mono tabular-nums"
            />
          )}
          {isEdit && !isBase && (
            <>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={active ? 'active' : 'disabled'}
                  onValueChange={(next) => setActive(next === 'active')}
                  disabled={makeBase}
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'disabled', label: 'Disabled' },
                  ]}
                />
              </div>
              <label className="flex items-center gap-2.5 rounded-xl border border-line px-3.5 py-3">
                <input
                  type="checkbox"
                  checked={makeBase}
                  onChange={(event) => setMakeBase(event.target.checked)}
                  className="size-4 accent-[#14606b]"
                />
                <span className="text-sm">
                  Make this the base currency
                  <span className="block text-[13px] text-muted">
                    All analytics will convert into it; its rate becomes 1.
                  </span>
                </span>
              </label>
            </>
          )}
          <Button
            className="w-full"
            onClick={submit}
            loading={mutation.isPending}
          >
            {isEdit ? 'Save changes' : 'Add currency'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CurrenciesSection() {
  const currencies = useCurrencies();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CurrencyRow>();
  const baseCode = currencies.data?.find((currency) => currency.isBase)?.code;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-semibold">
          Currencies & rates
        </h2>
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
      {currencies.isPending ? (
        <LoadingState />
      ) : (
        <Card className="divide-y divide-line/60">
          {(currencies.data ?? []).map((currency) => (
            <button
              key={currency.code}
              type="button"
              onClick={() => {
                setEditing(currency);
                setDialogOpen(true);
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-paper"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {currency.code}
                  <span className="ml-2 font-normal text-muted">
                    {currency.name}
                  </span>
                </p>
                {!currency.isBase && baseCode && (
                  <p className="font-mono text-[13px] tabular-nums text-muted">
                    1 {baseCode} ={' '}
                    {Number(currency.ratePerBase).toLocaleString('en-US')}{' '}
                    {currency.code}
                  </p>
                )}
              </div>
              {!currency.isActive && <Badge tone="neutral">Off</Badge>}
              {currency.isBase && (
                <Badge tone="brand">
                  <Star className="mr-1 size-3" />
                  Base
                </Badge>
              )}
            </button>
          ))}
        </Card>
      )}
      <CurrencyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        currency={editing}
        baseCode={baseCode}
      />
    </section>
  );
}
