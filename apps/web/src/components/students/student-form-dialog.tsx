import {
  createStudentSchema,
  type CreateStudentInput,
} from '@cyberpedia/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  useCreateStudent,
  useUpdateStudent,
  type StudentDetail,
} from '@/api/students';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { TextField } from '@/components/ui/input';
import { ApiError } from '@/lib/api';

export function StudentFormDialog({
  open,
  onOpenChange,
  student,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: { id: string; name: string; email: string; phone: string };
  onSaved?: (student: StudentDetail) => void;
}) {
  const isEdit = Boolean(student);
  const form = useForm<CreateStudentInput>({
    resolver: zodResolver(createStudentSchema),
    defaultValues: student ?? { name: '', email: '', phone: '' },
  });

  useEffect(() => {
    if (open) form.reset(student ?? { name: '', email: '', phone: '' });
  }, [open, student, form]);

  const create = useCreateStudent();
  const update = useUpdateStudent(student?.id ?? '');
  const mutation = isEdit ? update : create;

  const submit = (values: CreateStudentInput) => {
    mutation.mutate(values, {
      onSuccess: (saved) => {
        toast.success(isEdit ? 'Changes saved' : 'Student added');
        onOpenChange(false);
        onSaved?.(saved);
      },
      onError: (error) => {
        if (error instanceof ApiError && error.status === 409) {
          form.setError('email', { message: error.message });
        } else {
          toast.error(error.message);
        }
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{isEdit ? 'Edit student' : 'Add student'}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? 'Update the contact details for this student.'
            : 'Name, email, and phone are all required.'}
        </DialogDescription>
        <form
          className="mt-4 space-y-4"
          onSubmit={(event) => {
            void form.handleSubmit(submit)(event);
          }}
        >
          <TextField
            label="Full name"
            placeholder="Omar Haddad"
            error={form.formState.errors.name?.message}
            {...form.register('name')}
          />
          <TextField
            label="Email"
            type="email"
            inputMode="email"
            placeholder="omar@example.com"
            error={form.formState.errors.email?.message}
            {...form.register('email')}
          />
          <TextField
            label="Phone"
            type="tel"
            inputMode="tel"
            placeholder="+963 9xx xxx xxx"
            error={form.formState.errors.phone?.message}
            {...form.register('phone')}
          />
          <Button type="submit" className="w-full" loading={mutation.isPending}>
            {isEdit ? 'Save changes' : 'Add student'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
