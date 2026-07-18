import { Search, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useStudents, type StudentListItem } from '@/api/students';
import { PageBody, PageHeader } from '@/components/layout/page';
import { StudentFormDialog } from '@/components/students/student-form-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataList, type DataListColumn } from '@/components/ui/data-list';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/ui/spinner';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { useDebouncedValue } from '@/lib/use-debounced';

const columns: DataListColumn<StudentListItem>[] = [
  {
    key: 'name',
    header: 'Student',
    render: (student) => (
      <div>
        <p className="font-semibold">{student.name}</p>
        <p className="text-[13px] text-muted">{student.email}</p>
      </div>
    ),
  },
  {
    key: 'phone',
    header: 'Phone',
    render: (student) => (
      <span className="font-mono text-[13px]">{student.phone}</span>
    ),
  },
  {
    key: 'enrollments',
    header: 'Courses',
    align: 'right',
    render: (student) => (
      <Badge tone={student._count.enrollments > 0 ? 'brand' : 'neutral'}>
        {student._count.enrollments}
      </Badge>
    ),
  },
];

export function StudentsPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim());
  const students = useStudents(debouncedSearch);
  const [createOpen, setCreateOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <PageHeader
        title="Students"
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <UserPlus />
            Add
          </Button>
        }
      />
      <PageBody className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, phone, or email"
            className="pl-10"
            aria-label="Search students"
          />
        </div>

        {students.isPending ? (
          <LoadingState label="Loading students" />
        ) : students.isError ? (
          <ErrorState onRetry={() => void students.refetch()} />
        ) : (
          <DataList
            columns={columns}
            rows={students.data}
            rowKey={(student) => student.id}
            onRowClick={(student) => void navigate(`/students/${student.id}`)}
            renderCard={(student) => (
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{student.name}</p>
                  <p className="truncate font-mono text-[13px] text-muted">
                    {student.phone}
                  </p>
                </div>
                <Badge
                  tone={student._count.enrollments > 0 ? 'brand' : 'neutral'}
                >
                  {student._count.enrollments}{' '}
                  {student._count.enrollments === 1 ? 'course' : 'courses'}
                </Badge>
              </div>
            )}
            emptyState={
              debouncedSearch ? (
                <EmptyState
                  icon={Search}
                  title="No students match"
                  description={`Nothing found for "${debouncedSearch}". Try a shorter part of the name or number.`}
                />
              ) : (
                <EmptyState
                  icon={Users}
                  title="No students yet"
                  description="Add your first student to start enrolling and collecting payments."
                  action={
                    <Button onClick={() => setCreateOpen(true)}>
                      <UserPlus />
                      Add student
                    </Button>
                  }
                />
              )
            }
          />
        )}
      </PageBody>

      <StudentFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={(student) => void navigate(`/students/${student.id}`)}
      />
    </>
  );
}
