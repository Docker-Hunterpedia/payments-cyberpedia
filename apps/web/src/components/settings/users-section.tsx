import { Role } from '@cyberpedia/shared';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  useCreateUser,
  useResetPassword,
  useUpdateUser,
  useUsers,
  type UserRow,
} from '@/api/settings';
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
import { useAuth } from '@/providers/auth-provider';

function UserDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserRow;
}) {
  const isEdit = Boolean(user);
  const { user: me } = useAuth();
  const isSelf = user?.id === me?.id;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(Role.ACCOUNTER);
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    setName(user?.name ?? '');
    setEmail(user?.email ?? '');
    setPassword('');
    setRole(user?.role ?? Role.ACCOUNTER);
    setActive(user?.isActive ?? true);
  }, [open, user]);

  const create = useCreateUser();
  const update = useUpdateUser(user?.id ?? '');
  const resetPassword = useResetPassword(user?.id ?? '');
  const pending =
    create.isPending || update.isPending || resetPassword.isPending;

  const submit = async () => {
    if (!name.trim()) {
      toast.error('Give the user a name');
      return;
    }
    if (!isEdit) {
      if (password.length < 8) {
        toast.error('Password needs at least 8 characters');
        return;
      }
      create.mutate(
        { name: name.trim(), email: email.trim(), password, role },
        {
          onSuccess: () => {
            toast.success('User created');
            onOpenChange(false);
          },
          onError: (error) => toast.error(error.message),
        },
      );
      return;
    }
    try {
      await update.mutateAsync({
        name: name.trim(),
        ...(isSelf ? {} : { role, isActive: active }),
      });
      if (password) {
        if (password.length < 8) {
          toast.error('New password needs at least 8 characters');
          return;
        }
        await resetPassword.mutateAsync({ password });
      }
      toast.success('Changes saved');
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{isEdit ? `Edit ${user?.name}` : 'Add user'}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? isSelf
              ? 'This is your own account — role and status are locked.'
              : 'Deactivating signs the user out everywhere.'
            : 'They sign in with this email and password.'}
        </DialogDescription>
        <div className="mt-4 space-y-4">
          <TextField
            label="Full name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          {!isEdit && (
            <TextField
              label="Email"
              type="email"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          )}
          <TextField
            label={isEdit ? 'New password (leave empty to keep)' : 'Password'}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            hint="At least 8 characters"
          />
          {!isSelf && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select
                  value={role}
                  onValueChange={(next) => setRole(next as Role)}
                  options={[
                    { value: Role.ACCOUNTER, label: 'Accounter' },
                    { value: Role.ADMIN, label: 'Admin' },
                  ]}
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
          )}
          <Button
            className="w-full"
            onClick={() => void submit()}
            loading={pending}
          >
            {isEdit ? 'Save changes' : 'Create user'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function UsersSection() {
  const users = useUsers();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow>();

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-semibold">Users</h2>
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
      {users.isPending ? (
        <LoadingState />
      ) : (
        <Card className="divide-y divide-line/60">
          {(users.data ?? []).map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => {
                setEditing(user);
                setDialogOpen(true);
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-paper"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <p className="truncate text-[13px] text-muted">{user.email}</p>
              </div>
              {!user.isActive && <Badge tone="overdue">Disabled</Badge>}
              <Badge tone={user.role === Role.ADMIN ? 'brand' : 'neutral'}>
                {user.role === Role.ADMIN ? 'Admin' : 'Accounter'}
              </Badge>
            </button>
          ))}
        </Card>
      )}
      <UserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={editing}
      />
    </section>
  );
}
