import { Role } from '@cyberpedia/shared';
import { BookOpen, Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useCourses, type CourseListItem } from '@/api/courses';
import { CourseFormDialog } from '@/components/courses/course-form-dialog';
import { PageBody, PageHeader } from '@/components/layout/page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataList, type DataListColumn } from '@/components/ui/data-list';
import { Money } from '@/components/ui/money';
import { LoadingState } from '@/components/ui/spinner';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { useAuth } from '@/providers/auth-provider';

const columns: DataListColumn<CourseListItem>[] = [
  {
    key: 'name',
    header: 'Course',
    render: (course) => (
      <div>
        <p className="font-semibold">{course.name}</p>
        {course.description && (
          <p className="max-w-xs truncate text-[13px] text-muted">
            {course.description}
          </p>
        )}
      </div>
    ),
  },
  {
    key: 'price',
    header: 'Price',
    align: 'right',
    render: (course) => (
      <Money amountMinor={course.priceMinor} currency={course.currency} />
    ),
  },
  {
    key: 'plans',
    header: 'Plans',
    align: 'right',
    render: (course) => (
      <span className="text-muted">{course._count.plans}</span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    align: 'right',
    render: (course) =>
      course.status === 'ACTIVE' ? (
        <Badge tone="paid">Active</Badge>
      ) : (
        <Badge tone="neutral">Archived</Badge>
      ),
  },
];

export function CoursesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === Role.ADMIN;
  const courses = useCourses();
  const [createOpen, setCreateOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <PageHeader
        title="Courses"
        action={
          isAdmin ? (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus />
              New
            </Button>
          ) : undefined
        }
      />
      <PageBody>
        {courses.isPending ? (
          <LoadingState label="Loading courses" />
        ) : courses.isError ? (
          <ErrorState onRetry={() => void courses.refetch()} />
        ) : (
          <DataList
            columns={columns}
            rows={courses.data}
            rowKey={(course) => course.id}
            onRowClick={(course) => void navigate(`/courses/${course.id}`)}
            renderCard={(course) => (
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{course.name}</p>
                  <p className="text-[13px] text-muted">
                    <Money
                      amountMinor={course.priceMinor}
                      currency={course.currency}
                      className="text-[13px]"
                    />
                    <span> · {course._count.plans} plans</span>
                  </p>
                </div>
                {course.status === 'ACTIVE' ? (
                  <Badge tone="paid">Active</Badge>
                ) : (
                  <Badge tone="neutral">Archived</Badge>
                )}
              </div>
            )}
            emptyState={
              <EmptyState
                icon={BookOpen}
                title="No courses yet"
                description={
                  isAdmin
                    ? 'Create your first course to start enrolling students.'
                    : 'An admin needs to create the first course.'
                }
                action={
                  isAdmin ? (
                    <Button onClick={() => setCreateOpen(true)}>
                      <Plus />
                      New course
                    </Button>
                  ) : undefined
                }
              />
            }
          />
        )}
      </PageBody>

      <CourseFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={(course) => void navigate(`/courses/${course.id}`)}
      />
    </>
  );
}
