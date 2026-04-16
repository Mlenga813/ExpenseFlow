import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const search = url.searchParams.get('search');

    const conditions: any[] = [];

    if (user.role !== 'SUPER_ADMIN') conditions.push({ companyId: user.companyId });

    if (user.role === 'EMPLOYEE') {
      conditions.push({ requestedById: user.id });
    } else if (['OPS_MANAGER', 'CHIEF_ACCOUNTANT', 'GENERAL_MANAGER'].includes(user.role)) {
      conditions.push({
        OR: [
          { requestedById: user.id },
          { assignedOpsManagerId: user.id },
          { assignedChiefAccountantId: user.id },
          { assignedGeneralManagerId: user.id },
        ],
      });
    }

    if (status) conditions.push({ status });
    if (search) {
      conditions.push({
        OR: [
          { requestNumber: { contains: search } },
          { plateNumber: { contains: search } },
          { destination: { contains: search } },
          { reason: { contains: search } },
        ],
      });
    }

    const where = conditions.length > 0 ? { AND: conditions } : {};

    const [requests, total] = await Promise.all([
      db.vehicleRequest.findMany({
        where,
        include: {
          requestedBy: { select: { id: true, name: true, email: true } },
          department2: { select: { id: true, name: true } },
          opsManager: { select: { id: true, name: true } },
          chiefAccountant: { select: { id: true, name: true } },
          generalManager: { select: { id: true, name: true } },
          approvalLogs: {
            include: { performedBy: { select: { id: true, name: true, role: true } } },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.vehicleRequest.count({ where }),
    ]);

    return NextResponse.json({ requests, total, page, limit });
  } catch (error: any) {
    console.error('Vehicle requests error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const body = await req.json();
    const { plateNumber, reason, departureTime, destination, boardMemberName, conditionBefore, departmentId } = body;

    if (!plateNumber || !reason || !departureTime || !destination) {
      return NextResponse.json({ error: 'Missing required fields: plateNumber, reason, departureTime, destination' }, { status: 400 });
    }

    // Auto-generate request number
    const year = new Date().getFullYear();
    const count = await db.vehicleRequest.count({ where: { companyId: user.companyId } });
    const requestNumber = `VEH-${year}-${String(count + 1).padStart(4, '0')}`;

    // Auto-assign reviewers
    const opsManager = await db.user.findFirst({ where: { role: 'OPS_MANAGER', companyId: user.companyId, isActive: true } });
    const chiefAccountant = await db.user.findFirst({ where: { role: 'CHIEF_ACCOUNTANT', companyId: user.companyId, isActive: true } });
    const generalManager = await db.user.findFirst({ where: { role: 'GENERAL_MANAGER', companyId: user.companyId, isActive: true } });

    // Get user department name
    const dept = user.departmentId ? await db.department.findUnique({ where: { id: user.departmentId } }) : null;

    const request = await db.vehicleRequest.create({
      data: {
        requestNumber,
        requesterName: user.name,
        department: dept?.name || 'N/A',
        position: user.role,
        requestDate: new Date(),
        plateNumber,
        reason,
        departureTime: new Date(departureTime),
        destination,
        boardMemberName: boardMemberName || null,
        conditionBefore: conditionBefore || null,
        driverSignatureBefore: null,
        status: 'PENDING_OPS_MANAGER',
        currentStep: 1,
        companyId: user.companyId,
        requestedById: user.id,
        departmentId: departmentId || user.departmentId || null,
        assignedOpsManagerId: opsManager?.id,
        assignedChiefAccountantId: chiefAccountant?.id,
        assignedGeneralManagerId: generalManager?.id,
      },
    });

    // Create initial approval log
    await db.vehicleApprovalLog.create({
      data: {
        vehicleRequestId: request.id,
        step: 0,
        action: 'SUBMITTED',
        comment: 'Vehicle request submitted for approval',
        performedById: user.id,
      },
    });

    // Notify operations manager
    if (opsManager) {
      await db.notification.create({
        data: {
          userId: opsManager.id,
          title: 'New Vehicle Request',
          message: `${user.name} submitted ${requestNumber} for vehicle ${plateNumber} to ${destination}`,
          type: 'SUBMISSION',
          link: 'vehicle-detail',
        },
      });
    }

    return NextResponse.json(request, { status: 201 });
  } catch (error: any) {
    console.error('Create vehicle request error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
