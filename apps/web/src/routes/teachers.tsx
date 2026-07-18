import { Plus, Presentation } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTeachers, type TeacherListItem } from '@/api/teachers';
import { TeacherFormDialog } from '@/components/teachers/teacher-form-dialog';
import { PageBody, PageHeader } from '@/components/layout/page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataList, type DataListColumn } from '@/components/ui/data-list';
import { LoadingState } from '@/components/ui/spinner';
import { EmptyState, ErrorState } from '@/components/ui/states';

const columns: DataListColumn<TeacherListItem>[] = [
  {
    key: 'name',
    header: 'Teacher',
    render: (teacher) => (
      <div>
        <p className="font-semibold">{teacher.name}</p>
        {teacher.phone && (
          <p className="font-mono text-[13px] text-muted">{teacher.phone}</p>
        )}
      </div>
    ),
  },
  {
    key: 'courses',
    header: 'Courses',
    align: 'right',
    render: (teacher) => (
      <Badge tone={teacher._count.courses > 0 ? 'brand' : 'neutral'}>
        {teacher._count.courses}
      </Badge>
    ),
  },
];

export function TeachersPage() {
  const teachers = useTeachers();
  const [createOpen, setCreateOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <PageHeader
        title="Teachers"
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus />
            Add
          </Button>
        }
      />
      <PageBody>
        {teachers.isPending ? (
          <LoadingState label="Loading teachers" />
        ) : teachers.isError ? (
          <ErrorState onRetry={() => void teachers.refetch()} />
        ) : (
          <DataList
            columns={columns}
            rows={teachers.data}
            rowKey={(teacher) => teacher.id}
            onRowClick={(teacher) => void navigate(`/teachers/${teacher.id}`)}
            renderCard={(teacher) => (
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{teacher.name}</p>
                  {teacher.phone && (
                    <p className="truncate font-mono text-[13px] text-muted">
                      {teacher.phone}
                    </p>
                  )}
                </div>
                <Badge tone={teacher._count.courses > 0 ? 'brand' : 'neutral'}>
                  {teacher._count.courses}{' '}
                  {teacher._count.courses === 1 ? 'course' : 'courses'}
                </Badge>
              </div>
            )}
            emptyState={
              <EmptyState
                icon={Presentation}
                title="No teachers yet"
                description="Add teachers, then assign them to courses with their pay rules."
                action={
                  <Button onClick={() => setCreateOpen(true)}>
                    <Plus />
                    Add teacher
                  </Button>
                }
              />
            }
          />
        )}
      </PageBody>

      <TeacherFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={(teacher) => void navigate(`/teachers/${teacher.id}`)}
      />
    </>
  );
}
