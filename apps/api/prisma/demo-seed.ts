/**
 * Demo data generator — fills the database with months of realistic activity
 * so lists, filters, and analytics have something to show.
 *
 * Run with: pnpm --filter @cyberpedia/api run db:demo
 *
 * WIPES all courses/students/enrollments/payments/ledger/teacher data first
 * (users, currencies, and payment methods are kept/upserted). Refuses to run
 * in production.
 */
import {
  CompensationType,
  LedgerEntryType,
  PrismaClient,
  Role,
} from '@prisma/client';

const prisma = new PrismaClient();

// deterministic RNG so re-runs produce the same dataset
let seedState = 20260719;
function rand(): number {
  seedState = (seedState * 1664525 + 1013904223) % 4294967296;
  return seedState / 4294967296;
}
function pick<T>(items: T[]): T {
  return items[Math.floor(rand() * items.length)];
}
function randInt(min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1));
}

const DAY = 86_400_000;
const now = new Date();

function daysAgo(days: number): Date {
  return new Date(now.getTime() - days * DAY);
}
function utcMidnight(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

interface SeedCurrency {
  decimals: number;
  ratePerBase: unknown;
}
function convertSeedMinor(
  minor: number,
  from: SeedCurrency,
  to: SeedCurrency,
): number {
  const major = minor / 10 ** from.decimals;
  return Math.round(
    (major / Number(from.ratePerBase)) *
      Number(to.ratePerBase) *
      10 ** to.decimals,
  );
}

const FIRST_NAMES = [
  'Omar',
  'Lina',
  'Rami',
  'Nour',
  'Sami',
  'Dana',
  'Khaled',
  'Maya',
  'Tarek',
  'Rana',
  'Yousef',
  'Hala',
  'Fadi',
  'Salma',
  'Bashar',
  'Rima',
  'Zaid',
  'Lara',
  'Majed',
  'Tala',
  'Karim',
  'Dima',
  'Anas',
  'Joud',
  'Wael',
  'Sara',
  'Hadi',
  'Aya',
  'Nabil',
  'Farah',
  'Imad',
  'Layal',
];
const LAST_NAMES = [
  'Haddad',
  'Aziz',
  'Yousef',
  'Khalil',
  'Saleh',
  'Nasser',
  'Hamwi',
  'Qassem',
  'Barakat',
  'Sharif',
  'Attar',
  'Mansour',
  'Deeb',
  'Zein',
  'Rahal',
  'Kurdi',
];

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('demo-seed refuses to run with NODE_ENV=production');
  }

  const admin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
  if (!admin) {
    throw new Error('No admin user found — run the normal seed first');
  }

  console.log('Wiping existing course/student/finance data…');
  await prisma.paymentTransaction.deleteMany();
  await prisma.teacherPayout.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.ledgerCategory.deleteMany();
  await prisma.installment.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.student.deleteMany();
  await prisma.courseTeacher.deleteMany();
  await prisma.installmentTemplate.deleteMany();
  await prisma.paymentPlanTemplate.deleteMany();
  await prisma.course.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.discountDefinition.deleteMany();

  // --- currencies & methods ---
  await prisma.currency.upsert({
    where: { code: 'SYP' },
    update: { isActive: true },
    create: {
      code: 'SYP',
      name: 'Syrian Pound',
      symbol: '£S',
      decimals: 0,
      ratePerBase: 13000,
    },
  });
  await prisma.currency.upsert({
    where: { code: 'EUR' },
    update: { isActive: true },
    create: {
      code: 'EUR',
      name: 'Euro',
      symbol: '€',
      decimals: 2,
      ratePerBase: 0.9,
    },
  });
  const currencies = new Map(
    (await prisma.currency.findMany()).map((c) => [c.code, c]),
  );

  for (const name of ['Cash', 'Bank transfer', 'Western Union', 'Sham Cash']) {
    await prisma.paymentMethod.upsert({
      where: { name },
      update: { isActive: true },
      create: { name },
    });
  }
  const methods = await prisma.paymentMethod.findMany({
    where: { isActive: true },
  });

  // --- discounts ---
  const discounts = [] as {
    id: string;
    amountMinor: number;
    currencyCode: string;
  }[];
  for (const spec of [
    { name: 'Early bird', amountMinor: 5000, currencyCode: 'USD' },
    { name: 'Referral', amountMinor: 2500, currencyCode: 'USD' },
    { name: 'Sibling discount', amountMinor: 400000, currencyCode: 'SYP' },
  ]) {
    discounts.push(await prisma.discountDefinition.create({ data: spec }));
  }

  // --- teachers ---
  const teacherSpecs = [
    { name: 'Sara Khalil', phone: '+963933000111' },
    { name: 'Ahmad Naser', phone: '+963933000222' },
    { name: 'Reem Hamdan', phone: '+963933000333' },
    { name: 'Bassel Aswad', phone: '+963933000444' },
    { name: 'Hiba Marouf', phone: '+963933000555' },
  ];
  const teachers = [] as { id: string; name: string }[];
  for (const spec of teacherSpecs) {
    teachers.push(await prisma.teacher.create({ data: spec }));
  }

  // --- courses (price minor, currency, sessions, plan splits) ---
  const courseSpecs: {
    name: string;
    priceMinor: number;
    currencyCode: string;
    sessionsCount: number;
    splits: number[][];
  }[] = [
    {
      name: 'Ethical Hacking 101',
      priceMinor: 30000,
      currencyCode: 'USD',
      sessionsCount: 12,
      splits: [[30000], [12000, 10000, 8000]],
    },
    {
      name: 'Network Defense',
      priceMinor: 20000,
      currencyCode: 'USD',
      sessionsCount: 8,
      splits: [[20000], [12000, 8000]],
    },
    {
      name: 'Web Penetration Testing',
      priceMinor: 35000,
      currencyCode: 'USD',
      sessionsCount: 14,
      splits: [[35000], [15000, 10000, 10000]],
    },
    {
      name: 'SOC Analyst Bootcamp',
      priceMinor: 40000,
      currencyCode: 'USD',
      sessionsCount: 16,
      splits: [[40000], [10000, 10000, 10000, 10000]],
    },
    {
      name: 'Malware Analysis',
      priceMinor: 25000,
      currencyCode: 'USD',
      sessionsCount: 10,
      splits: [[25000], [15000, 10000]],
    },
    {
      name: 'Cybersecurity Foundations',
      priceMinor: 3900000,
      currencyCode: 'SYP',
      sessionsCount: 10,
      splits: [[3900000], [1500000, 1200000, 1200000]],
    },
    {
      name: 'Linux Essentials',
      priceMinor: 2600000,
      currencyCode: 'SYP',
      sessionsCount: 8,
      splits: [[2600000], [1500000, 1100000]],
    },
  ];

  const courses = [] as {
    id: string;
    currencyCode: string;
    plans: {
      id: string;
      installments: { amountMinor: number; dueDays: number }[];
    }[];
  }[];
  for (const spec of courseSpecs) {
    const created = await prisma.course.create({
      data: {
        name: spec.name,
        priceMinor: spec.priceMinor,
        currencyCode: spec.currencyCode,
        sessionsCount: spec.sessionsCount,
        plans: {
          create: spec.splits.map((amounts, planIndex) => ({
            name:
              amounts.length === 1
                ? 'Full payment'
                : `${amounts.length} installments`,
            installments: {
              create: amounts.map((amountMinor, index) => ({
                seq: index + 1,
                amountMinor,
                dueDays: index * 30 + (planIndex === 0 ? 0 : 0),
              })),
            },
          })),
        },
      },
      include: {
        plans: { include: { installments: { orderBy: { seq: 'asc' } } } },
      },
    });
    courses.push({
      id: created.id,
      currencyCode: created.currencyCode,
      plans: created.plans.map((plan) => ({
        id: plan.id,
        installments: plan.installments.map((i) => ({
          amountMinor: i.amountMinor,
          dueDays: i.dueDays,
        })),
      })),
    });

    // 1-2 teachers per course with mixed compensation
    const assigned = new Set<string>();
    const teacherCount = randInt(1, 2);
    for (let t = 0; t < teacherCount; t++) {
      const teacher = pick(teachers);
      if (assigned.has(teacher.id)) continue;
      assigned.add(teacher.id);
      const kind = pick([
        CompensationType.PERCENTAGE,
        CompensationType.PERCENTAGE,
        CompensationType.FIXED_SESSION,
        CompensationType.FIXED_COURSE,
      ]);
      await prisma.courseTeacher.create({
        data: {
          courseId: created.id,
          teacherId: teacher.id,
          compensationType: kind,
          percent:
            kind === CompensationType.PERCENTAGE ? randInt(20, 35) : null,
          amountMinor:
            kind === CompensationType.FIXED_SESSION
              ? Math.round(spec.priceMinor / spec.sessionsCount / 4)
              : kind === CompensationType.FIXED_COURSE
                ? Math.round(spec.priceMinor * 0.15)
                : null,
        },
      });
    }
  }

  // --- students ---
  const students = [] as { id: string }[];
  for (let i = 0; i < FIRST_NAMES.length; i++) {
    const name = `${FIRST_NAMES[i]} ${pick(LAST_NAMES)}`;
    students.push(
      await prisma.student.create({
        data: {
          name,
          email: `${FIRST_NAMES[i].toLowerCase()}${i}@student.com`,
          phone: `+9639${String(10000000 + i * 137911).slice(0, 8)}`,
        },
      }),
    );
  }

  // --- enrollments + installments + payments ---
  let enrollmentCount = 0;
  let paymentCount = 0;
  for (const student of students) {
    const courseCount = rand() < 0.45 ? 2 : 1;
    const chosen = new Set<string>();
    for (let c = 0; c < courseCount; c++) {
      const course = pick(courses);
      if (chosen.has(course.id)) continue;
      chosen.add(course.id);

      const enrolledAt = daysAgo(randInt(3, 170));
      const plan =
        rand() < 0.7 && course.plans.length > 1
          ? course.plans[1]
          : course.plans[0];
      const isFree = rand() < 0.05;
      const usableDiscounts = discounts.filter(
        (d) => d.currencyCode === course.currencyCode,
      );
      const discount =
        !isFree && rand() < 0.18 && usableDiscounts.length > 0
          ? pick(usableDiscounts)
          : null;

      // bake the discount into the last installments
      const amounts = plan.installments.map((i) => i.amountMinor);
      if (discount) {
        let remaining = discount.amountMinor;
        for (let i = amounts.length - 1; i >= 0 && remaining > 0; i--) {
          const cut = Math.min(amounts[i], remaining);
          amounts[i] -= cut;
          remaining -= cut;
        }
      }

      const enrollment = await prisma.enrollment.create({
        data: {
          studentId: student.id,
          courseId: course.id,
          planTemplateId: plan.id,
          enrolledAt,
          discountId: discount?.id,
          discountAmountMinor: discount?.amountMinor,
          ...(isFree
            ? {
                isFree: true,
                freeGrantedById: admin.id,
                freeGrantedAt: enrolledAt,
                freeReason: 'Scholarship',
              }
            : {}),
          installments: {
            create: plan.installments.map((installment, index) => ({
              seq: index + 1,
              amountMinor: amounts[index],
              dueDate: new Date(
                utcMidnight(enrolledAt).getTime() + installment.dueDays * DAY,
              ),
            })),
          },
        },
        include: { installments: { orderBy: { seq: 'asc' } } },
      });
      enrollmentCount++;

      if (isFree) continue;
      const currency = currencies.get(course.currencyCode);
      if (!currency) continue;

      for (const installment of enrollment.installments) {
        if (installment.amountMinor === 0) continue;
        const dueAgeDays =
          (now.getTime() - installment.dueDate.getTime()) / DAY;
        const payProbability =
          dueAgeDays > 30
            ? 0.92
            : dueAgeDays > 0
              ? 0.7
              : dueAgeDays > -20
                ? 0.35
                : 0.08;
        if (rand() > payProbability) break;

        const partial = rand() < 0.12;
        const appliedMinor = partial
          ? Math.max(
              1,
              Math.round(installment.amountMinor * (0.3 + rand() * 0.4)),
            )
          : installment.amountMinor;
        const paidAtMs = Math.min(
          now.getTime() - randInt(0, 3) * DAY,
          Math.max(
            enrolledAt.getTime() + DAY,
            installment.dueDate.getTime() + randInt(-6, 8) * DAY,
          ),
        );
        // some students pay a USD course in SYP or EUR — the applied amount
        // stays in the course currency, the tendered amount is converted
        let tenderedCurrency = currency;
        let tenderedMinor = appliedMinor;
        if (course.currencyCode === 'USD' && rand() < 0.18) {
          const alt = currencies.get(rand() < 0.6 ? 'SYP' : 'EUR');
          if (alt) {
            tenderedCurrency = alt;
            tenderedMinor = convertSeedMinor(appliedMinor, currency, alt);
          }
        }
        await prisma.paymentTransaction.create({
          data: {
            enrollmentId: enrollment.id,
            installmentId: installment.id,
            amountMinor: tenderedMinor,
            appliedMinor,
            currencyCode: tenderedCurrency.code,
            ratePerBase: tenderedCurrency.ratePerBase,
            methodId: pick(methods).id,
            paidAt: new Date(paidAtMs),
            recordedById: admin.id,
          },
        });
        paymentCount++;
        if (partial) break;
      }
    }
  }

  // --- ledger ---
  const categorySpecs = [
    { name: 'Rent', type: LedgerEntryType.EXPENSE },
    { name: 'Salaries', type: LedgerEntryType.EXPENSE },
    { name: 'Marketing', type: LedgerEntryType.EXPENSE },
    { name: 'Utilities', type: LedgerEntryType.EXPENSE },
    { name: 'Sponsorship', type: LedgerEntryType.INCOME },
    { name: 'Lab rental income', type: LedgerEntryType.INCOME },
  ];
  const categories = new Map<string, { id: string; type: LedgerEntryType }>();
  for (const spec of categorySpecs) {
    const category = await prisma.ledgerCategory.create({ data: spec });
    categories.set(spec.name, category);
  }

  const usd = currencies.get('USD');
  const syp = currencies.get('SYP');
  let ledgerCount = 0;
  for (let monthsBack = 0; monthsBack < 6; monthsBack++) {
    const monthDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsBack, 5, 12),
    );
    if (monthDate > now) continue;
    const monthly: {
      category: string;
      amountMinor: number;
      currency: typeof usd;
      note?: string;
    }[] = [
      {
        category: 'Rent',
        amountMinor: 50000,
        currency: usd,
        note: 'Office rent',
      },
      {
        category: 'Salaries',
        amountMinor: 120000,
        currency: usd,
        note: 'Staff salaries',
      },
      {
        category: 'Marketing',
        amountMinor: randInt(8000, 30000),
        currency: usd,
      },
      {
        category: 'Utilities',
        amountMinor: randInt(250000, 500000),
        currency: syp,
      },
    ];
    if (rand() < 0.4) {
      monthly.push({
        category: 'Sponsorship',
        amountMinor: randInt(20000, 60000),
        currency: usd,
        note: 'Partner sponsorship',
      });
    }
    for (const entry of monthly) {
      const category = categories.get(entry.category);
      if (!category || !entry.currency) continue;
      await prisma.ledgerEntry.create({
        data: {
          type: category.type,
          categoryId: category.id,
          amountMinor: entry.amountMinor,
          currencyCode: entry.currency.code,
          ratePerBase: entry.currency.ratePerBase,
          date: monthDate,
          note: entry.note,
          createdById: admin.id,
        },
      });
      ledgerCount++;
    }
  }

  // --- teacher payouts: pay out 40-80% of what each assignment earned ---
  const assignments = await prisma.courseTeacher.findMany({
    include: { course: true },
  });
  const collectedByCourse = new Map<string, number>();
  for (const group of await prisma.paymentTransaction.groupBy({
    by: ['enrollmentId'],
    _sum: { amountMinor: true },
  })) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: group.enrollmentId },
      select: { courseId: true },
    });
    if (!enrollment) continue;
    collectedByCourse.set(
      enrollment.courseId,
      (collectedByCourse.get(enrollment.courseId) ?? 0) +
        (group._sum.amountMinor ?? 0),
    );
  }
  let payoutCount = 0;
  for (const assignment of assignments) {
    const collected = collectedByCourse.get(assignment.courseId) ?? 0;
    let earned = 0;
    if (assignment.compensationType === CompensationType.PERCENTAGE) {
      earned = Math.round((collected * Number(assignment.percent)) / 100);
    } else if (assignment.compensationType === CompensationType.FIXED_COURSE) {
      earned = assignment.amountMinor ?? 0;
    } else {
      earned = (assignment.amountMinor ?? 0) * assignment.course.sessionsCount;
    }
    if (earned <= 0) continue;
    const currency = currencies.get(assignment.course.currencyCode);
    if (!currency) continue;
    let toPay = Math.round(earned * (0.4 + rand() * 0.4));
    const chunks = randInt(1, 2);
    for (let i = 0; i < chunks && toPay > 0; i++) {
      const amount =
        i === chunks - 1 ? toPay : Math.round(toPay * (0.4 + rand() * 0.3));
      await prisma.teacherPayout.create({
        data: {
          teacherId: assignment.teacherId,
          courseId: assignment.courseId,
          amountMinor: amount,
          currencyCode: currency.code,
          ratePerBase: currency.ratePerBase,
          date: daysAgo(randInt(5, 100)),
          createdById: admin.id,
        },
      });
      toPay -= amount;
      payoutCount++;
    }
  }

  console.log(
    `Demo data ready: ${students.length} students, ${courses.length} courses, ` +
      `${enrollmentCount} enrollments, ${paymentCount} payments, ` +
      `${ledgerCount} ledger entries, ${payoutCount} payouts.`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
