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

    // Create Arusha Cooperative Union company
    const company = await db.company.create({
      data: {
        name: 'Arusha Cooperative Union',
        industry: 'Cooperative Society',
        currency: 'TZS',
      },
    });

    // Create Super Admin
    const superAdmin = await db.user.create({
      data: {
        name: 'Super Admin',
        email: 'superadmin@expenseflow.com',
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        companyId: company.id,
      },
    });

    // Create departments relevant to ACU
    const departments = await Promise.all([
      db.department.create({ data: { name: 'Operations', companyId: company.id } }),
      db.department.create({ data: { name: 'Finance', companyId: company.id } }),
      db.department.create({ data: { name: 'Human Resources', companyId: company.id } }),
      db.department.create({ data: { name: 'Marketing & Sales', companyId: company.id } }),
      db.department.create({ data: { name: 'Agriculture & Extension', companyId: company.id } }),
      db.department.create({ data: { name: 'Transport & Logistics', companyId: company.id } }),
    ]);

    // Create demo users for each role with Tanzanian names
    const demoUsers = [
      { name: 'John Mwangi', email: 'ops@acme.com', role: 'OPS_MANAGER', departmentId: departments[0].id },
      { name: 'Sarah Wanjiku', email: 'accountant@acme.com', role: 'CHIEF_ACCOUNTANT', departmentId: departments[1].id },
      { name: 'David Ochieng', email: 'gm@acme.com', role: 'GENERAL_MANAGER', departmentId: departments[0].id },
      { name: 'Grace Akinyi', email: 'cashier@acme.com', role: 'CASHIER', departmentId: departments[1].id },
      { name: 'Peter Kamau', email: 'admin@acme.com', role: 'ADMIN', departmentId: departments[2].id },
      { name: 'James Otieno', email: 'employee@acme.com', role: 'EMPLOYEE', departmentId: departments[5].id },
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

    const employee = createdUsers[5]; // James - Transport dept
    const employee2 = createdUsers[6]; // Mary - Agriculture dept
    const opsManager = createdUsers[0]; // John
    const chiefAcct = createdUsers[1]; // Sarah
    const gm = createdUsers[2]; // David
    const cashier = createdUsers[3]; // Grace

    // Create sample expense requests with TZS amounts
    const sampleRequests = [
      {
        requestNumber: 'REQ-2026-0001',
        title: 'Office Stationery Purchase',
        amount: 580000,
        category: 'OFFICE_SUPPLIES',
        description: 'Monthly office stationery and printer supplies for the marketing department. Includes A4 paper, toner cartridges, and binding materials.',
        date: new Date('2026-04-10'),
        urgency: 'NORMAL',
        vendorPayee: 'Office World Arusha',
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
        amount: 3500000,
        category: 'TRAVEL',
        description: 'Transport costs for the Q2 team building event at Arusha National Park. Includes bus hire and fuel costs.',
        date: new Date('2026-04-15'),
        urgency: 'HIGH',
        vendorPayee: 'Arusha Travel Solutions',
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
        title: 'Server & IT Equipment Maintenance',
        amount: 8500000,
        category: 'MAINTENANCE',
        description: 'Annual server maintenance and IT infrastructure renewal for Q2 2026. Includes network equipment servicing and software licenses.',
        date: new Date('2026-04-18'),
        urgency: 'URGENT',
        accountCode: 'IT-MAINT-2026',
        vendorPayee: 'CloudTech Solutions Dar',
        paymentMethod: 'BANK_TRANSFER',
        status: 'PENDING_CHIEF_ACCOUNTANT',
        currentStep: 2,
        assignedOpsManagerId: opsManager.id,
        assignedChiefAccountantId: chiefAcct.id,
        opsManagerApprovedAt: new Date('2026-04-18'),
      },
      {
        requestNumber: 'REQ-2026-0004',
        title: 'Agricultural Extension Field Research',
        amount: 2100000,
        category: 'PROJECT',
        description: 'Field research expenses for the cooperative extension services data collection in Monduli and Longido districts.',
        date: new Date('2026-04-20'),
        urgency: 'NORMAL',
        accountCode: 'PROJ-EXT-001',
        paymentMethod: 'CASH',
        status: 'PENDING_OPS_MANAGER',
        currentStep: 1,
        assignedOpsManagerId: opsManager.id,
      },
      {
        requestNumber: 'REQ-2026-0005',
        title: 'Staff Training Workshop - Cooperative Governance',
        amount: 3200000,
        category: 'TRAINING',
        description: 'Professional development workshop on cooperative governance and financial management for department heads.',
        date: new Date('2026-04-22'),
        urgency: 'NORMAL',
        vendorPayee: 'Tanzania Cooperative College',
        paymentMethod: 'BANK_TRANSFER',
        status: 'REJECTED',
        currentStep: 1,
        assignedOpsManagerId: opsManager.id,
      },
      {
        requestNumber: 'REQ-2026-0006',
        title: 'Fuel Reimbursement - April',
        amount: 1200000,
        category: 'FUEL',
        description: 'Fuel reimbursement for official travels during April 2026. Includes trips to Monduli, Karatu, and Ngorongoro field offices.',
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
          departmentId: departments[5].id,
        },
      });

      // Create approval logs
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

    // Create sample vehicle requests
    const sampleVehicleRequests = [
      {
        requestNumber: 'VEH-2026-0001',
        requesterName: employee.name,
        department: 'Transport & Logistics',
        position: 'EMPLOYEE',
        requestDate: new Date('2026-04-10'),
        plateNumber: 'T 123 ABC',
        reason: 'Transport of agricultural inputs to Monduli field office for the cooperative extension program.',
        departureTime: new Date('2026-04-11T08:00:00'),
        destination: 'Monduli District',
        boardMemberName: 'Hon. J. Kimaro',
        conditionBefore: 'NZURI',
        status: 'RETURNED',
        currentStep: 3,
        companyId: company.id,
        requestedById: employee.id,
        departmentId: departments[5].id,
        assignedOpsManagerId: opsManager.id,
        assignedChiefAccountantId: chiefAcct.id,
        assignedGeneralManagerId: gm.id,
        opsManagerApprovedAt: new Date('2026-04-10T10:00:00'),
        chiefAccountantApprovedAt: new Date('2026-04-10T14:00:00'),
        generalManagerApprovedAt: new Date('2026-04-10T16:00:00'),
        returnTime: new Date('2026-04-11T18:30:00'),
        returnDate: new Date('2026-04-11'),
        conditionAfter: 'NZURI',
      },
      {
        requestNumber: 'VEH-2026-0002',
        requesterName: employee2.name,
        department: 'Agriculture & Extension',
        position: 'EMPLOYEE',
        requestDate: new Date('2026-04-15'),
        plateNumber: 'T 456 DEF',
        reason: 'Field visit to Karatu cooperative societies for annual audit and member registration verification.',
        departureTime: new Date('2026-04-16T07:00:00'),
        destination: 'Karatu District',
        boardMemberName: null,
        conditionBefore: 'NZURI',
        status: 'PENDING_GENERAL_MANAGER',
        currentStep: 3,
        companyId: company.id,
        requestedById: employee2.id,
        departmentId: departments[4].id,
        assignedOpsManagerId: opsManager.id,
        assignedChiefAccountantId: chiefAcct.id,
        assignedGeneralManagerId: gm.id,
        opsManagerApprovedAt: new Date('2026-04-15T09:00:00'),
        chiefAccountantApprovedAt: new Date('2026-04-15T11:00:00'),
        generalManagerApprovedAt: null,
      },
      {
        requestNumber: 'VEH-2026-0003',
        requesterName: employee.name,
        department: 'Transport & Logistics',
        position: 'EMPLOYEE',
        requestDate: new Date('2026-04-16'),
        plateNumber: 'T 789 GHI',
        reason: 'Delivery of office furniture and equipment to the new branch office in Arusha CBD.',
        departureTime: new Date('2026-04-17T09:00:00'),
        destination: 'Arusha CBD - New Branch',
        boardMemberName: 'Mrs. A. Mollel',
        conditionBefore: 'NZURI',
        status: 'PENDING_OPS_MANAGER',
        currentStep: 1,
        companyId: company.id,
        requestedById: employee.id,
        departmentId: departments[5].id,
        assignedOpsManagerId: opsManager.id,
        assignedChiefAccountantId: chiefAcct.id,
        assignedGeneralManagerId: gm.id,
      },
    ];

    for (const vreq of sampleVehicleRequests) {
      const vehicleRequest = await db.vehicleRequest.create({
        data: vreq,
      });

      // Create vehicle approval logs
      const vLogs: any[] = [];

      // Submission log
      vLogs.push({
        vehicleRequestId: vehicleRequest.id,
        step: 0,
        action: 'SUBMITTED',
        comment: 'Vehicle request submitted for approval',
        performedById: vreq.requestedById === employee.id ? employee.id : employee2.id,
        createdAt: new Date(vreq.requestDate.getTime() - 3600000),
      });

      // Ops manager approval
      if (vreq.opsManagerApprovedAt) {
        vLogs.push({
          vehicleRequestId: vehicleRequest.id,
          step: 1,
          action: 'APPROVED',
          comment: 'Vehicle available, trip approved',
          performedById: opsManager.id,
          createdAt: vreq.opsManagerApprovedAt,
        });
      }

      // Chief accountant approval
      if (vreq.chiefAccountantApprovedAt) {
        vLogs.push({
          vehicleRequestId: vehicleRequest.id,
          step: 2,
          action: 'APPROVED',
          comment: 'Budget allocated for fuel, approved',
          performedById: chiefAcct.id,
          createdAt: vreq.chiefAccountantApprovedAt,
        });
      }

      // GM approval
      if (vreq.generalManagerApprovedAt) {
        vLogs.push({
          vehicleRequestId: vehicleRequest.id,
          step: 3,
          action: 'APPROVED',
          comment: 'Approved by General Manager',
          performedById: gm.id,
          createdAt: vreq.generalManagerApprovedAt,
        });
      }

      // Return log
      if (vreq.status === 'RETURNED') {
        vLogs.push({
          vehicleRequestId: vehicleRequest.id,
          step: 4,
          action: 'RETURNED',
          comment: `Vehicle returned. Condition: ${vreq.conditionAfter || 'Not specified'}`,
          performedById: vreq.requestedById,
          createdAt: vreq.returnTime!,
        });
      }

      await db.vehicleApprovalLog.createMany({ data: vLogs });
    }

    // Create notifications
    await db.notification.createMany({
      data: [
        { userId: opsManager.id, title: 'New Request', message: 'New expense request REQ-2026-0004 needs your approval', type: 'SUBMISSION', link: 'request-detail' },
        { userId: employee.id, title: 'Request Disbursed', message: 'Your request REQ-2026-0001 has been disbursed', type: 'DISBURSEMENT', link: 'request-detail' },
        { userId: employee.id, title: 'Request Rejected', message: 'Your request REQ-2026-0005 has been rejected', type: 'REJECTION', link: 'request-detail' },
        { userId: cashier.id, title: 'Ready for Disbursement', message: 'Request REQ-2026-0006 is ready for disbursement', type: 'APPROVAL', link: 'request-detail' },
        { userId: opsManager.id, title: 'New Vehicle Request', message: 'Vehicle request VEH-2026-0003 for T 789 GHI needs your approval', type: 'SUBMISSION', link: 'vehicle-detail' },
        { userId: gm.id, title: 'Vehicle Approval Required', message: 'Vehicle request VEH-2026-0002 to Karatu needs your approval', type: 'SUBMISSION', link: 'vehicle-detail' },
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
