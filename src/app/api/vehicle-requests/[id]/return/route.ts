import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { db } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const user = session.user as any;
    const body = await req.json();
    const { returnTime, returnDate, conditionAfter, driverSignatureAfter } = body;

    const request = await db.vehicleRequest.findUnique({ where: { id } });
    if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 });

    // Only the requestor or admin can record return
    if (request.requestedById !== user.id && !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Only the requestor or admin can record vehicle return' }, { status: 403 });
    }

    if (request.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Vehicle request must be approved before recording return' }, { status: 400 });
    }

    await db.vehicleRequest.update({
      where: { id },
      data: {
        status: 'RETURNED',
        returnTime: returnTime ? new Date(returnTime) : new Date(),
        returnDate: returnDate ? new Date(returnDate) : new Date(),
        conditionAfter: conditionAfter || null,
        driverSignatureAfter: driverSignatureAfter || null,
      },
    });

    // Create approval log for return
    await db.vehicleApprovalLog.create({
      data: {
        vehicleRequestId: id,
        step: 4,
        action: 'RETURNED',
        comment: `Vehicle returned. Condition: ${conditionAfter || 'Not specified'}`,
        performedById: user.id,
      },
    });

    return NextResponse.json({ success: true, status: 'RETURNED' });
  } catch (error: any) {
    console.error('Vehicle return error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
