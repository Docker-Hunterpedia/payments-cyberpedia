import { Hammer } from 'lucide-react';
import { PageBody, PageHeader } from '@/components/layout/page';
import { EmptyState } from '@/components/ui/states';

export function ComingSoon({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <PageBody>
        <EmptyState
          icon={Hammer}
          title={`${title} is almost here`}
          description="This screen ships in the next update — the data behind it is already live."
        />
      </PageBody>
    </>
  );
}
