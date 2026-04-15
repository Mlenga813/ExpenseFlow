import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { db } from '@/lib/db';
import { canDisburse } from '@/lib/permissions';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const user = session.user as any;
    const body = await req.json();
    const { disbursementReference, disbursementNotes } = body;

    if (!canDisburse(user.role)) {
      return NextResponse.json({ error: 'Only cashiers can process disbursements' }, { status: 403 });
    }

    const request = await db.expenseRequest.findUnique({ where: { id } });
    if (!request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (request.status !== 'PENDING_DISBURSEMENT') {
      return NextResponse.json({ error: 'Request is not pending disbursement' }, { status: 400 });
    }

    // Data isolation
    if (user.role !== 'SUPER_ADMIN' && request.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await db.expenseRequest.update({
      where: { id },
      data: {
        status: 'DISBURSED',
        currentStep: 5,
        disbursedAt: new Date(),
        disbursementReference: disbursementReference || null,
        disbursementNotes: disbursementNotes || null,
      },
    });

    // Create approval log
    await db.approvalLog.create({
      data: {
        expenseRequestId: id,
        step: 4,
        action: 'DISBURSED',
        comment: disbursementNotes || `Disbursed. Reference: ${disbursementReference || 'N/A'}`,
        performedById: user.id,
      },
    });

    // Notify requestor
    await db.notification.create({
      data: {
        userId: request.requestedById,
        title: 'Payment Disbursed',
        message: `Your request ${request.requestNumber} has been disbursed. Reference: ${disbursementReference || 'N/A'}`,
        type: 'DISBURSEMENT',
        link: 'request-detail',
      },
    });

    return NextResponse.json({ success: true, status: 'DISBURSED' });
  } catch (error: any) {
    console.error('Disburse error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
