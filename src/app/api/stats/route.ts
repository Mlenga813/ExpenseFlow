import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { db } from '@/lib/db';
import { WORKFLOW_STEPS } from '@/lib/constants';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const companyId = user.companyId;

    // Base filter
    const companyFilter = user.role === 'SUPER_ADMIN' ? {} : { companyId };

    // Total counts
    const [
      totalRequests,
      pendingOpsManager,
      pendingChiefAccountant,
      pendingGeneralManager,
      pendingDisbursement,
      disbursed,
      rejected,
      totalAmount,
    ] = await Promise.all([
      db.expenseRequest.count({ where: companyFilter }),
      db.expenseRequest.count({ where: { ...companyFilter, status: 'PENDING_OPS_MANAGER' } }),
      db.expenseRequest.count({ where: { ...companyFilter, status: 'PENDING_CHIEF_ACCOUNTANT' } }),
      db.expenseRequest.count({ where: { ...companyFilter, status: 'PENDING_GENERAL_MANAGER' } }),
      db.expenseRequest.count({ where: { ...companyFilter, status: 'PENDING_DISBURSEMENT' } }),
      db.expenseRequest.count({ where: { ...companyFilter, status: 'DISBURSED' } }),
      db.expenseRequest.count({ where: { ...companyFilter, status: 'REJECTED' } }),
      db.expenseRequest.aggregate({ where: companyFilter, _sum: { amount: true } }),
    ]);

    // Personal stats for employee
    let myRequests = 0;
    let myPending = 0;
    let myApproved = 0;
    if (user.role === 'EMPLOYEE') {
      myRequests = await db.expenseRequest.count({ where: { requestedById: user.id } });
      myPending = await db.expenseRequest.count({
        where: { requestedById: user.id, status: { in: ['PENDING_OPS_MANAGER', 'PENDING_CHIEF_ACCOUNTANT', 'PENDING_GENERAL_MANAGER', 'PENDING_DISBURSEMENT', 'INFO_REQUESTED'] } },
      });
      myApproved = await db.expenseRequest.count({ where: { requestedById: user.id, status: 'DISBURSED' } });
    }

    // Pending my approval count
    let pendingMyApproval = 0;
    if (['OPS_MANAGER', 'CHIEF_ACCOUNTANT', 'GENERAL_MANAGER', 'CASHIER'].includes(user.role)) {
      const stepMap: Record<string, number> = {
        'OPS_MANAGER': 1,
        'CHIEF_ACCOUNTANT': 2,
        'GENERAL_MANAGER': 3,
        'CASHIER': 4,
      };
      const myStep = stepMap[user.role];
      const myStatus = WORKFLOW_STEPS.find(s => s.step === myStep)?.status;
      if (myStatus) {
        pendingMyApproval = await db.expenseRequest.count({
          where: { ...companyFilter, status: myStatus },
        });
      }
    }

    // Category breakdown
    const categoryBreakdown = await db.expenseRequest.groupBy({
      by: ['category'],
      where: companyFilter,
      _sum: { amount: true },
      _count: true,
    });

    // Monthly trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyTrend = await db.expenseRequest.groupBy({
      by: ['status'],
      where: { ...companyFilter, createdAt: { gte: sixMonthsAgo } },
      _sum: { amount: true },
      _count: true,
    });

    // Department spending
    const departmentSpending = await db.expenseRequest.groupBy({
      by: ['departmentId'],
      where: { ...companyFilter, status: 'DISBURSED' },
      _sum: { amount: true },
      _count: true,
    });

    // Super admin stats
    let companyCount = 0;
    let userCount = 0;
    if (user.role === 'SUPER_ADMIN') {
      companyCount = await db.company.count();
      userCount = await db.user.count();
    }

    return NextResponse.json({
      totalRequests,
      pendingOpsManager,
      pendingChiefAccountant,
      pendingGeneralManager,
      pendingDisbursement,
      disbursed,
      rejected,
      totalAmount: totalAmount._sum.amount || 0,
      myRequests,
      myPending,
      myApproved,
      pendingMyApproval,
      categoryBreakdown,
      monthlyTrend,
      departmentSpending,
      companyCount,
      userCount,
    });
  } catch (error: any) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
