import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const role = (session.user as any).role;
    const companyId = (session.user as any).companyId;

    const where = role === 'SUPER_ADMIN' ? {} : { companyId };

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const departmentId = searchParams.get('departmentId');
    const status = searchParams.get('status');
    const category = searchParams.get('category');

    const filterWhere: Record<string, unknown> = { ...where };
    if (startDate || endDate) {
      filterWhere.createdAt = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      };
    }
    if (departmentId) filterWhere.departmentId = departmentId;
    if (status) filterWhere.status = status;
    if (category) filterWhere.category = category;

    // Category breakdown
    const categoryBreakdown = await db.expenseRequest.groupBy({
      by: ['category'],
      where: filterWhere,
      _sum: { amount: true },
      _count: true,
    });

    // Status distribution
    const statusDistribution = await db.expenseRequest.groupBy({
      by: ['status'],
      where: filterWhere,
      _sum: { amount: true },
      _count: true,
    });

    // Department spending
    const departmentSpending = await db.expenseRequest.groupBy({
      by: ['departmentId'],
      where: filterWhere,
      _sum: { amount: true },
      _count: true,
    });

    // Get department names
    const departments = await db.department.findMany({
      where: role === 'SUPER_ADMIN' ? {} : { companyId },
      select: { id: true, name: true },
    });
    const deptMap = Object.fromEntries(departments.map((d) => [d.id, d.name]));

    const departmentSpendingWithNames = departmentSpending.map((d) => ({
      ...d,
      departmentName: deptMap[d.departmentId || ''] || 'Unassigned',
    }));

    // Monthly trend
    const monthlyTrend = await db.expenseRequest.groupBy({
      by: ['createdAt'],
      where: filterWhere,
      _sum: { amount: true },
      _count: true,
    });

    // Simplify monthly trend by month
    const monthlyMap = new Map<string, { total: number; count: number }>();
    for (const item of monthlyTrend) {
      const date = new Date(item.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthlyMap.get(key) || { total: 0, count: 0 };
      existing.total += item._sum.amount || 0;
      existing.count += item._count;
      monthlyMap.set(key, existing);
    }

    const monthlyTrendData = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));

    // Top spenders
    const topSpenders = await db.expenseRequest.groupBy({
      by: ['requestedById'],
      where: filterWhere,
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
      take: 10,
    });

    const users = await db.user.findMany({
      where: role === 'SUPER_ADMIN' ? {} : { companyId },
      select: { id: true, name: true },
    });
    const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]));

    const topSpendersWithNames = topSpenders.map((s) => ({
      ...s,
      requesterName: userMap[s.requestedById] || 'Unknown',
    }));

    return NextResponse.json({
      categoryBreakdown,
      statusDistribution,
      departmentSpending: departmentSpendingWithNames,
      monthlyTrend: monthlyTrendData,
      topSpenders: topSpendersWithNames,
    });
  } catch (error) {
    console.error('Reports error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
