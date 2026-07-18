import { CurrenciesSection } from '@/components/settings/currencies-section';
import { DiscountsSection } from '@/components/settings/discounts-section';
import { MethodsSection } from '@/components/settings/methods-section';
import { UsersSection } from '@/components/settings/users-section';
import { PageBody, PageHeader } from '@/components/layout/page';

export function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Users, methods, discounts, currencies"
      />
      <PageBody className="space-y-8">
        <UsersSection />
        <MethodsSection />
        <DiscountsSection />
        <CurrenciesSection />
      </PageBody>
    </>
  );
}
