import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { PaymentMethodItem } from '@/api/record';
import {
  useCreatePaymentMethod,
  usePaymentMethodsList,
  useUpdatePaymentMethod,
} from '@/api/reference';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input, Label, TextField } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { LoadingState } from '@/components/ui/spinner';

function MethodDialog({
  open,
  onOpenChange,
  method,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  method: PaymentMethodItem;
}) {
  const [name, setName] = useState('');
  const [active, setActive] = useState(true);
  const update = useUpdatePaymentMethod(method.id);

  useEffect(() => {
    if (!open) return;
    setName(method.name);
    setActive(method.isActive);
  }, [open, method]);

  const submit = () => {
    update.mutate(
      { name: name.trim() || undefined, isActive: active },
      {
        onSuccess: () => {
          toast.success('Method updated');
          onOpenChange(false);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Edit payment method</DialogTitle>
        <div className="mt-4 space-y-4">
          <TextField
            label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
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
          <Button
            className="w-full"
            onClick={submit}
            loading={update.isPending}
          >
            Save changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MethodsSection() {
  const methods = usePaymentMethodsList();
  const createMethod = useCreatePaymentMethod();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<PaymentMethodItem>();

  const add = () => {
    if (!name.trim()) {
      toast.error('Give the method a name');
      return;
    }
    createMethod.mutate(
      { name: name.trim() },
      {
        onSuccess: () => {
          toast.success('Method added');
          setName('');
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <section className="space-y-3">
      <h2 className="font-display text-base font-semibold">Payment methods</h2>
      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Bank transfer"
          aria-label="New payment method name"
        />
        <Button
          size="icon"
          onClick={add}
          loading={createMethod.isPending}
          aria-label="Add payment method"
        >
          <Plus />
        </Button>
      </div>
      {methods.isPending ? (
        <LoadingState />
      ) : (
        <Card className="divide-y divide-line/60">
          {(methods.data ?? []).map((method) => (
            <button
              key={method.id}
              type="button"
              onClick={() => setEditing(method)}
              className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-paper"
            >
              <span className="text-sm font-medium">{method.name}</span>
              <Badge tone={method.isActive ? 'paid' : 'neutral'}>
                {method.isActive ? 'Active' : 'Off'}
              </Badge>
            </button>
          ))}
        </Card>
      )}
      {editing && (
        <MethodDialog
          open={Boolean(editing)}
          onOpenChange={(open) => !open && setEditing(undefined)}
          method={editing}
        />
      )}
    </section>
  );
}
