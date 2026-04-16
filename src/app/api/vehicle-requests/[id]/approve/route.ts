import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { db } from '@/lib/db';
import { canApproveAtStep, getApprovalRoleForStep } from '@/lib/permissions';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const user = session.user as any;
    const body = await req.json();
    const { action, comment, signature } = body;

    if (!action || !['APPROVE', 'REJECT', 'INFO_REQUESTED'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const request = await db.vehicleRequest.findUnique({ where: { id } });
    if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 });

    // Data isolation
    if (user.role !== 'SUPER_ADMIN' && request.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if user can approve at current step
    if (!canApproveAtStep(user.role, request.currentStep)) {
      return NextResponse.json({ error: 'You are not authorized to approve at this step' }, { status: 403 });
    }

    // Check assignment for non-admin roles
    if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      const assignField = getAssignField(request.currentStep) as keyof typeof request;
      if (request[assignField] && request[assignField] !== user.id) {
        return NextResponse.json({ error: 'This request is not assigned to you' }, { status: 403 });
      }
    }

    let newStatus = request.status;
    let newStep = request.currentStep;

    if (action === 'APPROVE') {
      if (request.currentStep === 1) {
        newStatus = 'PENDING_CHIEF_ACCOUNTANT';
        newStep = 2;
      } else if (request.currentStep === 2) {
        newStatus = 'PENDING_GENERAL_MANAGER';
        newStep = 3;
      } else if (request.currentStep === 3) {
        newStatus = 'APPROVED';
      }
    } else if (action === 'REJECT') {
      newStatus = 'REJECTED';
    } else if (action === 'INFO_REQUESTED') {
      newStatus = 'INFO_REQUESTED';
    }

    // Update request
    const updateData: any = { status: newStatus, currentStep: newStep };

    if (action === 'APPROVE') {
      if (request.currentStep === 1) updateData.opsManagerApprovedAt = new Date();
      else if (request.currentStep === 2) updateData.chiefAccountantApprovedAt = new Date();
      else if (request.currentStep === 3) updateData.generalManagerApprovedAt = new Date();
    }

    await db.vehicleRequest.update({ where: { id }, data: updateData });

    // Create approval log
    await db.vehicleApprovalLog.create({
      data: {
        vehicleRequestId: id,
        step: request.currentStep,
        action: action === 'APPROVE' ? 'APPROVED' : action === 'REJECT' ? 'REJECTED' : 'INFO_REQUESTED',
        comment: comment || null,
        signature: signature || null,
        performedById: user.id,
      },
    });

    // Create notification for requestor
    const requestorMsg = action === 'APPROVE'
      ? `Your vehicle request ${request.requestNumber} has been approved by ${user.name} and moved to the next step`
      : action === 'REJECT'
        ? `Your vehicle request ${request.requestNumber} has been rejected by ${user.name}`
        : `${user.name} has requested additional information for ${request.requestNumber}`;

    await db.notification.create({
      data: {
        userId: request.requestedById,
        title: action === 'APPROVE' ? 'Vehicle Request Approved' : action === 'REJECT' ? 'Vehicle Request Rejected' : 'Info Requested',
        message: requestorMsg,
        type: action === 'APPROVE' ? 'APPROVAL' : action === 'REJECT' ? 'REJECTION' : 'INFO_REQUEST',
        link: 'vehicle-detail',
      },
    });

    // Notify next reviewer if approved and not final step
    if (action === 'APPROVE' && newStep <= 3) {
      const nextRole = getApprovalRoleForStep(newStep);
      if (nextRole) {
        const nextReviewer = await db.user.findFirst({
          where: { role: nextRole, companyId: request.companyId, isActive: true },
        });
        if (nextReviewer) {
          await db.notification.create({
            data: {
              userId: nextReviewer.id,
              title: 'New Vehicle Approval Required',
              message: `${request.requestNumber}: Vehicle ${request.plateNumber} to ${request.destination} needs your review`,
              type: 'SUBMISSION',
              link: 'approvals',
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error: any) {
    console.error('Vehicle approve error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function getAssignField(step: number): string {
  switch (step) {
    case 1: return 'assignedOpsManagerId';
    case 2: return 'assignedChiefAccountantId';
    case 3: return 'assignedGeneralManagerId';
    default: return '';
  }
}
