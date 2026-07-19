import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// End-to-end smoke over the full money path, against the seeded dev database:
// login → create course + student → enroll → shows up as unpaid → pay both
// installments → fully PAID. Also proves multi-device sessions: two logins
// for the same user must both stay refreshable.
describe('Smoke (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let token: string;

  const stamp = Date.now();
  let courseId: string;
  let studentId: string;
  let enrollmentId: string;

  const authed = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@cyberpedia.local', password: 'ChangeMe123!' })
      .expect(200);
    token = login.body.accessToken;
  });

  afterAll(async () => {
    // Remove everything the test created; payments go first, enrollment
    // delete cascades installments, course delete cascades plans.
    if (enrollmentId) {
      await prisma.paymentTransaction.deleteMany({ where: { enrollmentId } });
      await prisma.enrollment.deleteMany({ where: { id: enrollmentId } });
    }
    if (studentId) {
      await prisma.student.deleteMany({ where: { id: studentId } });
    }
    if (courseId) {
      await prisma.course.deleteMany({ where: { id: courseId } });
    }
    await app.close();
  });

  it('logs in on two devices and both sessions stay valid', async () => {
    const server = app.getHttpServer();
    const credentials = {
      email: 'admin@cyberpedia.local',
      password: 'ChangeMe123!',
    };
    const deviceA = await request(server)
      .post('/auth/login')
      .send(credentials)
      .expect(200);
    const deviceB = await request(server)
      .post('/auth/login')
      .send(credentials)
      .expect(200);

    // The second login must NOT invalidate the first device's session.
    await request(server)
      .post('/auth/refresh')
      .send({ refreshToken: deviceA.body.refreshToken })
      .expect(200);
    await request(server)
      .post('/auth/refresh')
      .send({ refreshToken: deviceB.body.refreshToken })
      .expect(200);
  });

  it('creates a course with a default full-payment plan', async () => {
    const response = await request(app.getHttpServer())
      .post('/courses')
      .set(authed())
      .send({
        name: `Smoke Course ${stamp}`,
        priceMinor: 100_000,
        currencyCode: 'USD',
        sessionsCount: 8,
      })
      .expect(201);
    courseId = response.body.id;
    expect(courseId).toBeTruthy();
  });

  it('creates a student', async () => {
    const response = await request(app.getHttpServer())
      .post('/students')
      .set(authed())
      .send({
        name: `Smoke Student ${stamp}`,
        email: `smoke.${stamp}@test.local`,
        phone: `+9639${String(stamp).slice(-8)}`,
      })
      .expect(201);
    studentId = response.body.id;
    expect(studentId).toBeTruthy();
  });

  it('enrolls the student with two custom installments', async () => {
    const response = await request(app.getHttpServer())
      .post('/enrollments')
      .set(authed())
      .send({
        studentId,
        courseId,
        installments: [
          { amountMinor: 60_000, dueDays: 0 },
          { amountMinor: 40_000, dueDays: 30 },
        ],
      })
      .expect(201);
    enrollmentId = response.body.id;
    expect(response.body.installments).toHaveLength(2);
  });

  it('lists the student in unpaid installments', async () => {
    const response = await request(app.getHttpServer())
      .get(`/installments/unpaid?courseId=${courseId}`)
      .set(authed())
      .expect(200);
    const mine = response.body.filter(
      (row: { student: { id: string } }) => row.student.id === studentId,
    );
    expect(mine).toHaveLength(2);
    expect(mine[0].remainingMinor).toBe(60_000);
  });

  it('pays both installments and ends fully PAID', async () => {
    const server = app.getHttpServer();
    const method = await prisma.paymentMethod.findFirstOrThrow({
      where: { isActive: true },
    });

    // No installmentId: the API must auto-assign the next unpaid one.
    const first = await request(server)
      .post('/payments')
      .set(authed())
      .send({ enrollmentId, amountMinor: 60_000, methodId: method.id })
      .expect(201);
    expect(first.body.installment.seq).toBe(1);
    expect(first.body.appliedMinor).toBe(60_000);

    const second = await request(server)
      .post('/payments')
      .set(authed())
      .send({ enrollmentId, amountMinor: 40_000, methodId: method.id })
      .expect(201);
    expect(second.body.installment.seq).toBe(2);

    const detail = await request(server)
      .get(`/students/${studentId}`)
      .set(authed())
      .expect(200);
    const enrollment = detail.body.enrollments.find(
      (row: { id: string }) => row.id === enrollmentId,
    );
    for (const installment of enrollment.installments) {
      expect(installment.status).toBe('PAID');
      expect(installment.remainingMinor).toBe(0);
    }

    // And it no longer shows up on the unpaid screen.
    const unpaid = await request(server)
      .get(`/installments/unpaid?courseId=${courseId}`)
      .set(authed())
      .expect(200);
    expect(
      unpaid.body.filter(
        (row: { student: { id: string } }) => row.student.id === studentId,
      ),
    ).toHaveLength(0);
  });

  it('rejects overpaying the enrollment', async () => {
    const method = await prisma.paymentMethod.findFirstOrThrow({
      where: { isActive: true },
    });
    await request(app.getHttpServer())
      .post('/payments')
      .set(authed())
      .send({ enrollmentId, amountMinor: 1_000, methodId: method.id })
      .expect(400);
  });

  it('keeps admin-only endpoints closed to accounters', async () => {
    const accounter = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'nour@cyberpedia.local', password: 'Nour12345!' })
      .expect(200);
    await request(app.getHttpServer())
      .get('/analytics/dashboard')
      .set({ Authorization: `Bearer ${accounter.body.accessToken}` })
      .expect(403);
    await request(app.getHttpServer())
      .get('/users')
      .set({ Authorization: `Bearer ${accounter.body.accessToken}` })
      .expect(403);
  });
});
