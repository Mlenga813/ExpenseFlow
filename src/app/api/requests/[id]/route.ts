import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { db } from '@/lib/db';
import { canApproveAtStep } from '@/lib/permissions';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const user = session.user as any;

    const request = await db.expenseRequest.findUnique({
      where: { id },
      include: {
        requestedBy: { select: { id: true, name: true, email: true, department: { select: { name: true } } } },
        department: { select: { id: true, name: true } },
        opsManager: { select: { id: true, name: true, signature: true } },
        chiefAccountant: { select: { id: true, name: true, signature: true } },
        generalManager: { select: { id: true, name: true, signature: true } },
        cashier: { select: { id: true, name: true } },
        attachments: true,
        approvalLogs: {
          include: { performedBy: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
        company: { select: { name: true, currency: true } },
      },
    });

    if (!request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Data isolation check
    if (user.role !== 'SUPER_ADMIN' && request.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json(request);
  } catch (error: any) {
    console.error('Get request error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
