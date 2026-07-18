import { LedgerEntryType } from '@cyberpedia/shared';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useCreateCategory, useLedgerCategories } from '@/api/finance';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

export function CategoriesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const categories = useLedgerCategories();
  const createCategory = useCreateCategory();
  const [name, setName] = useState('');
  const [type, setType] = useState<LedgerEntryType>(LedgerEntryType.EXPENSE);

  const add = () => {
    if (!name.trim()) {
      toast.error('Give the category a name');
      return;
    }
    createCategory.mutate(
      { name: name.trim(), type },
      {
        onSuccess: () => {
          toast.success('Category added');
          setName('');
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Categories</DialogTitle>
        <DialogDescription>
          Every ledger entry belongs to a category, and the category decides
          whether it counts as income or an expense.
        </DialogDescription>
        <div className="mt-4 space-y-4">
          <div className="flex gap-2">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Rent"
              aria-label="New category name"
            />
            <Select
              value={type}
              onChange={(event) =>
                setType(event.target.value as LedgerEntryType)
              }
              className="w-36 shrink-0"
            >
              <option value={LedgerEntryType.EXPENSE}>Expense</option>
              <option value={LedgerEntryType.INCOME}>Income</option>
            </Select>
            <Button
              size="icon"
              onClick={add}
              loading={createCategory.isPending}
              aria-label="Add category"
            >
              <Plus />
            </Button>
          </div>

          <div className="max-h-72 space-y-1.5 overflow-y-auto">
            {(categories.data ?? []).map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between rounded-xl border border-line px-3.5 py-2.5"
              >
                <span className="text-sm font-medium">{category.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-faint">
                    {category._count.entries}{' '}
                    {category._count.entries === 1 ? 'entry' : 'entries'}
                  </span>
                  <Badge
                    tone={
                      category.type === LedgerEntryType.INCOME
                        ? 'paid'
                        : 'neutral'
                    }
                  >
                    {category.type === LedgerEntryType.INCOME
                      ? 'Income'
                      : 'Expense'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
