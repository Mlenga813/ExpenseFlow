import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

export async function POST() {
  try {
    // Check if super admin already exists
    const existing = await db.user.findUnique({ where: { email: 'superadmin@expenseflow.com' } });
    if (existing) {
      return NextResponse.json({ message: 'Seed data already exists' });
    }

    const hashedPassword = await bcrypt.hash('Admin@123', 12);

    // Create demo company first
    const company = await db.company.create({
      data: {
        name: 'Acme Corporation',
        industry: 'Technology',
        currency: 'USD',
      },
    });

    // Create Super Admin with proper companyId
    const superAdmin = await db.user.create({
      data: {
        name: 'Super Admin',
        email: 'superadmin@expenseflow.com',
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        companyId: company.id,
      },
    });

    // Create departments
    const departments = await Promise.all([
      db.department.create({ data: { name: 'Operations', companyId: company.id } }),
      db.department.create({ data: { name: 'Finance', companyId: company.id } }),
      db.department.create({ data: { name: 'Human Resources', companyId: company.id } }),
      db.department.create({ data: { name: 'Marketing', companyId: company.id } }),
      db.department.create({ data: { name: 'IT', companyId: company.id } }),
    ]);

    // Create demo users for each role
    const demoUsers = [
      { name: 'John Mwangi', email: 'ops@acme.com', role: 'OPS_MANAGER', departmentId: departments[0].id },
      { name: 'Sarah Wanjiku', email: 'accountant@acme.com', role: 'CHIEF_ACCOUNTANT', departmentId: departments[1].id },
      { name: 'David Ochieng', email: 'gm@acme.com', role: 'GENERAL_MANAGER', departmentId: departments[0].id },
      { name: 'Grace Akinyi', email: 'cashier@acme.com', role: 'CASHIER', departmentId: departments[1].id },
      { name: 'Peter Kamau', email: 'admin@acme.com', role: 'ADMIN', departmentId: departments[2].id },
      { name: 'James Otieno', email: 'employee@acme.com', role: 'EMPLOYEE', departmentId: departments[3].id },
      { name: 'Mary Njeri', email: 'employee2@acme.com', role: 'EMPLOYEE', departmentId: departments[4].id },
    ];

    const createdUsers: any[] = [];
    for (const u of demoUsers) {
      const user = await db.user.create({
        data: {
          name: u.name,
          email: u.email,
          password: await bcrypt.hash('Password@123', 12),
          role: u.role,
          companyId: company.id,
          departmentId: u.departmentId,
        },
      });
      createdUsers.push(user);
    }

    // Create sample expense requests
    const employee = createdUsers[5]; // James
    const opsManager = createdUsers[0]; // John
    const chiefAcct = createdUsers[1]; // Sarah
    const gm = createdUsers[2]; // David
    const cashier = createdUsers[3]; // Grace

    const sampleRequests = [
      {
        requestNumber: 'REQ-2026-0001',
        title: 'Office Stationery Purchase',
        amount: 250.00,
        category: 'OFFICE_SUPPLIES',
        description: 'Monthly office stationery and printer supplies for the marketing department.',
        date: new Date('2026-04-10'),
        urgency: 'NORMAL',
        vendorPayee: 'Office Depot',
        paymentMethod: 'BANK_TRANSFER',
        status: 'DISBURSED',
        currentStep: 5,
        assignedOpsManagerId: opsManager.id,
        assignedChiefAccountantId: chiefAcct.id,
        assignedGeneralManagerId: gm.id,
        assignedCashierId: cashier.id,
        opsManagerApprovedAt: new Date('2026-04-11'),
        chiefAccountantApprovedAt: new Date('2026-04-12'),
        generalManagerApprovedAt: new Date('2026-04-13'),
        disbursedAt: new Date('2026-04-14'),
        disbursementReference: 'CHQ-001234',
        disbursementNotes: 'Processed via company cheque',
      },
      {
        requestNumber: 'REQ-2026-0002',
        title: 'Team Building Event Transport',
        amount: 1500.00,
        category: 'TRAVEL',
        description: 'Transport costs for the Q2 team building event at the coast.',
        date: new Date('2026-04-15'),
        urgency: 'HIGH',
        vendorPayee: 'Travel Solutions Ltd',
        paymentMethod: 'BANK_TRANSFER',
        status: 'PENDING_GENERAL_MANAGER',
        currentStep: 3,
        assignedOpsManagerId: opsManager.id,
        assignedChiefAccountantId: chiefAcct.id,
        assignedGeneralManagerId: gm.id,
        opsManagerApprovedAt: new Date('2026-04-15'),
        chiefAccountantApprovedAt: new Date('2026-04-16'),
      },
      {
        requestNumber: 'REQ-2026-0003',
        title: 'Server Maintenance Contract',
        amount: 3500.00,
        category: 'MAINTENANCE',
        description: 'Annual server maintenance and hosting renewal for Q2 2026.',
        date: new Date('2026-04-18'),
        urgency: 'URGENT',
        accountCode: 'IT-MAINT-2026',
        vendorPayee: 'CloudTech Solutions',
        paymentMethod: 'BANK_TRANSFER',
        status: 'PENDING_CHIEF_ACCOUNTANT',
        currentStep: 2,
        assignedOpsManagerId: opsManager.id,
        assignedChiefAccountantId: chiefAcct.id,
        opsManagerApprovedAt: new Date('2026-04-18'),
      },
      {
        requestNumber: 'REQ-2026-0004',
        title: 'Project Alpha Field Research',
        amount: 800.00,
        category: 'PROJECT',
        description: 'Field research expenses for Project Alpha data collection in western region.',
        date: new Date('2026-04-20'),
        urgency: 'NORMAL',
        accountCode: 'PROJ-ALPHA-001',
        paymentMethod: 'CASH',
        status: 'PENDING_OPS_MANAGER',
        currentStep: 1,
        assignedOpsManagerId: opsManager.id,
      },
      {
        requestNumber: 'REQ-2026-0005',
        title: 'Staff Training Workshop',
        amount: 1200.00,
        category: 'TRAINING',
        description: 'Professional development workshop on agile methodology for IT team.',
        date: new Date('2026-04-22'),
        urgency: 'NORMAL',
        vendorPayee: 'SkillForge Academy',
        paymentMethod: 'BANK_TRANSFER',
        status: 'REJECTED',
        currentStep: 1,
        assignedOpsManagerId: opsManager.id,
      },
      {
        requestNumber: 'REQ-2026-0006',
        title: 'Fuel Reimbursement - April',
        amount: 450.00,
        category: 'FUEL',
        description: 'Fuel reimbursement for official travels during April 2026.',
        date: new Date('2026-04-12'),
        urgency: 'LOW',
        paymentMethod: 'CASH',
        status: 'PENDING_DISBURSEMENT',
        currentStep: 4,
        assignedOpsManagerId: opsManager.id,
        assignedChiefAccountantId: chiefAcct.id,
        assignedGeneralManagerId: gm.id,
        assignedCashierId: cashier.id,
        opsManagerApprovedAt: new Date('2026-04-13'),
        chiefAccountantApprovedAt: new Date('2026-04-14'),
        generalManagerApprovedAt: new Date('2026-04-15'),
      },
    ];

    for (const req of sampleRequests) {
      const request = await db.expenseRequest.create({
        data: {
          ...req,
          companyId: company.id,
          requestedById: employee.id,
          departmentId: departments[3].id,
        },
      });

      // Create approval logs for each request
      const logs: any[] = [];
      logs.push({
        expenseRequestId: request.id,
        step: 0,
        action: 'SUBMITTED',
        comment: 'Request submitted for approval',
        performedById: employee.id,
        createdAt: new Date(request.date.getTime() - 86400000),
      });

      if (request.opsManagerApprovedAt) {
        logs.push({
          expenseRequestId: request.id,
          step: 1,
          action: 'APPROVED',
          comment: 'Approved by Operations Manager',
          performedById: opsManager.id,
          createdAt: request.opsManagerApprovedAt,
        });
      }

      if (request.status === 'REJECTED') {
        logs.push({
          expenseRequestId: request.id,
          step: 1,
          action: 'REJECTED',
          comment: 'Budget constraints - please resubmit next quarter',
          performedById: opsManager.id,
          createdAt: new Date('2026-04-19'),
        });
      }

      if (request.chiefAccountantApprovedAt) {
        logs.push({
          expenseRequestId: request.id,
          step: 2,
          action: 'APPROVED',
          comment: 'Funds available, approved',
          performedById: chiefAcct.id,
          createdAt: request.chiefAccountantApprovedAt,
        });
      }

      if (request.generalManagerApprovedAt) {
        logs.push({
          expenseRequestId: request.id,
          step: 3,
          action: 'APPROVED',
          comment: 'Approved',
          performedById: gm.id,
          createdAt: request.generalManagerApprovedAt,
        });
      }

      if (request.disbursedAt) {
        logs.push({
          expenseRequestId: request.id,
          step: 4,
          action: 'DISBURSED',
          comment: request.disbursementNotes || 'Payment processed',
          performedById: cashier.id,
          createdAt: request.disbursedAt,
        });
      }

      await db.approvalLog.createMany({ data: logs });
    }

    // Create notifications
    await db.notification.createMany({
      data: [
        { userId: opsManager.id, title: 'New Request', message: 'New expense request REQ-2026-0004 needs your approval', type: 'SUBMISSION', link: 'request-detail' },
        { userId: employee.id, title: 'Request Disbursed', message: 'Your request REQ-2026-0001 has been disbursed', type: 'DISBURSEMENT', link: 'request-detail' },
        { userId: employee.id, title: 'Request Rejected', message: 'Your request REQ-2026-0005 has been rejected', type: 'REJECTION', link: 'request-detail' },
        { userId: cashier.id, title: 'Ready for Disbursement', message: 'Request REQ-2026-0006 is ready for disbursement', type: 'APPROVAL', link: 'request-detail' },
      ],
    });

    return NextResponse.json({
      message: 'Seed data created successfully',
      company: { id: company.id, name: company.name, inviteCode: company.inviteCode },
      credentials: {
        superAdmin: { email: 'superadmin@expenseflow.com', password: 'Admin@123' },
        opsManager: { email: 'ops@acme.com', password: 'Password@123' },
        chiefAccountant: { email: 'accountant@acme.com', password: 'Password@123' },
        generalManager: { email: 'gm@acme.com', password: 'Password@123' },
        cashier: { email: 'cashier@acme.com', password: 'Password@123' },
        admin: { email: 'admin@acme.com', password: 'Password@123' },
        employee: { email: 'employee@acme.com', password: 'Password@123' },
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
