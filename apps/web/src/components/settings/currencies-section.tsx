import { Plus } from 'lucide-react';
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency?: CurrencyRow;
}) {
  const isEdit = Boolean(currency);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [decimals, setDecimals] = useState('2');
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    setCode(currency?.code ?? '');
    setName(currency?.name ?? '');
    setSymbol(currency?.symbol ?? '');
    setDecimals(String(currency?.decimals ?? 2));
    setActive(currency?.isActive ?? true);
  }, [open, currency]);

  const create = useCreateCurrency();
  const update = useUpdateCurrency(currency?.code ?? '');
  const mutation = isEdit ? update : create;

  const submit = () => {
    const decimalsValue = Number(decimals);
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
      update.mutate({ ...shared, isActive: active }, options);
    } else {
      create.mutate(
        { code: code.trim().toUpperCase(), ...shared, ratePerBase: 1 },
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
          Money in this currency is counted separately — like its own cash box.
          Nothing is ever converted.
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

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-semibold">Currencies</h2>
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
                <p className="text-[13px] text-muted">
                  {currency.symbol} · {currency.decimals} decimals
                </p>
              </div>
              {!currency.isActive && <Badge tone="neutral">Off</Badge>}
            </button>
          ))}
        </Card>
      )}
      <CurrencyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        currency={editing}
      />
    </section>
  );
}
