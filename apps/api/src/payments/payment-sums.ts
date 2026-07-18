import type { PrismaService } from '../prisma/prisma.service';

// Sum of non-voided payments per installment.
export async function sumPaidByInstallment(
  prisma: PrismaService,
  installmentIds: string[],
): Promise<Map<string, number>> {
  if (installmentIds.length === 0) return new Map();
  const grouped = await prisma.paymentTransaction.groupBy({
    by: ['installmentId'],
    where: { installmentId: { in: installmentIds }, voidedAt: null },
    _sum: { appliedMinor: true },
  });
  return new Map(
    grouped.map((group) => [group.installmentId, group._sum.appliedMinor ?? 0]),
  );
}
