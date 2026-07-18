import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  useCreateTeacher,
  useUpdateTeacher,
  type TeacherListItem,
} from '@/api/teachers';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { TextField } from '@/components/ui/input';

export function TeacherFormDialog({
  open,
  onOpenChange,
  teacher,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher?: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    notes: string | null;
  };
  onSaved?: (teacher: TeacherListItem) => void;
}) {
  const isEdit = Boolean(teacher);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(teacher?.name ?? '');
    setPhone(teacher?.phone ?? '');
    setEmail(teacher?.email ?? '');
    setNotes(teacher?.notes ?? '');
  }, [open, teacher]);

  const create = useCreateTeacher();
  const update = useUpdateTeacher(teacher?.id ?? '');
  const mutation = isEdit ? update : create;

  const submit = () => {
    if (!name.trim()) {
      toast.error('Give the teacher a name');
      return;
    }
    mutation.mutate(
      {
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: (saved) => {
          toast.success(isEdit ? 'Changes saved' : 'Teacher added');
          onOpenChange(false);
          onSaved?.(saved);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{isEdit ? 'Edit teacher' : 'Add teacher'}</DialogTitle>
        <DialogDescription>
          Only the name is required — contact details help when it's payout
          time.
        </DialogDescription>
        <div className="mt-4 space-y-4">
          <TextField
            label="Full name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Sara Khalil"
          />
          <TextField
            label="Phone (optional)"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+963 9xx xxx xxx"
          />
          <TextField
            label="Email (optional)"
            type="email"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="sara@example.com"
          />
          <TextField
            label="Notes (optional)"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Anything worth remembering"
          />
          <Button
            className="w-full"
            onClick={submit}
            loading={mutation.isPending}
          >
            {isEdit ? 'Save changes' : 'Add teacher'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
