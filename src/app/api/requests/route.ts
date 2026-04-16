import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;
    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const search = url.searchParams.get('search');

    // Build base conditions
    const conditions: any[] = [];

    // Data isolation by company
    if (user.role !== 'SUPER_ADMIN') {
      conditions.push({ companyId: user.companyId });
    }

    // Role-based filtering
    if (user.role === 'EMPLOYEE') {
      conditions.push({ requestedById: user.id });
    } else if (['OPS_MANAGER', 'CHIEF_ACCOUNTANT', 'GENERAL_MANAGER', 'CASHIER'].includes(user.role)) {
      conditions.push({
        OR: [
          { requestedById: user.id },
          { assignedOpsManagerId: user.id },
          { assignedChiefAccountantId: user.id },
          { assignedGeneralManagerId: user.id },
          { assignedCashierId: user.id },
        ],
      });
    }

    // Status filter
    if (status) {
      conditions.push({ status });
    }

    // Search filter
    if (search) {
      conditions.push({
        OR: [
          { title: { contains: search } },
          { requestNumber: { contains: search } },
          { description: { contains: search } },
        ],
      });
    }

    const where = conditions.length > 0 ? { AND: conditions } : {};

    const [requests, total] = await Promise.all([
      db.expenseRequest.findMany({
        where,
        include: {
          requestedBy: { select: { id: true, name: true, email: true } },
          department: { select: { id: true, name: true } },
          opsManager: { select: { id: true, name: true } },
          chiefAccountant: { select: { id: true, name: true } },
          generalManager: { select: { id: true, name: true } },
          cashier: { select: { id: true, name: true } },
          attachments: true,
          _count: { select: { approvalLogs: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.expenseRequest.count({ where }),
    ]);

    return NextResponse.json({ requests, total, page, limit });
  } catch (error: any) {
    console.error('Get requests error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;
    const body = await req.json();
    const { title, amount, category, description, date, urgency, accountCode, vendorPayee, paymentMethod, departmentId } = body;

    if (!title || !amount || !category || !description || !date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate request number
    const year = new Date().getFullYear();
    const count = await db.expenseRequest.count({
      where: { companyId: user.companyId },
    });
    const requestNumber = `REQ-${year}-${String(count + 1).padStart(4, '0')}`;

    // Auto-assign reviewers by role in company
    const opsManager = await db.user.findFirst({
      where: { role: 'OPS_MANAGER', companyId: user.companyId, isActive: true },
    });
    const chiefAccountant = await db.user.findFirst({
      where: { role: 'CHIEF_ACCOUNTANT', companyId: user.companyId, isActive: true },
    });
    const generalManager = await db.user.findFirst({
      where: { role: 'GENERAL_MANAGER', companyId: user.companyId, isActive: true },
    });
    const cashier = await db.user.findFirst({
      where: { role: 'CASHIER', companyId: user.companyId, isActive: true },
    });

    const request = await db.expenseRequest.create({
      data: {
        requestNumber,
        title,
        amount: parseFloat(amount),
        category,
        description,
        date: new Date(date),
        urgency: urgency || 'NORMAL',
        accountCode,
        vendorPayee,
        paymentMethod,
        status: 'PENDING_OPS_MANAGER',
        currentStep: 1,
        companyId: user.companyId,
        requestedById: user.id,
        departmentId: departmentId || user.departmentId,
        assignedOpsManagerId: opsManager?.id,
        assignedChiefAccountantId: chiefAccountant?.id,
        assignedGeneralManagerId: generalManager?.id,
        assignedCashierId: cashier?.id,
      },
    });

    // Create approval log
    await db.approvalLog.create({
      data: {
        expenseRequestId: request.id,
        step: 0,
        action: 'SUBMITTED',
        comment: 'Request submitted for approval',
        performedById: user.id,
      },
    });

    // Notify operations manager
    if (opsManager) {
      await db.notification.create({
        data: {
          userId: opsManager.id,
          title: 'New Expense Request',
          message: `${user.name} submitted ${requestNumber}: ${title} - $${amount}`,
          type: 'SUBMISSION',
          link: `request-detail`,
        },
      });
    }

    return NextResponse.json(request, { status: 201 });
  } catch (error: any) {
    console.error('Create request error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
