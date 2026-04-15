import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    if (user.role !== 'SUPER_ADMIN') {
      // Return only own company
      const company = await db.company.findUnique({
        where: { id: user.companyId },
        include: { _count: { select: { users: true, departments: true, requests: true } } },
      });
      return NextResponse.json([company]);
    }

    const companies = await db.company.findMany({
      include: { _count: { select: { users: true, departments: true, requests: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(companies);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Only Super Admin can create companies' }, { status: 403 });
    }

    const body = await req.json();
    if (!body.name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const company = await db.company.create({
      data: { name: body.name, industry: body.industry, currency: body.currency || 'USD' },
    });

    // Create default departments
    await db.department.createMany({
      data: [
        { name: 'Operations', companyId: company.id },
        { name: 'Finance', companyId: company.id },
        { name: 'Human Resources', companyId: company.id },
        { name: 'Marketing', companyId: company.id },
        { name: 'IT', companyId: company.id },
      ],
    });

    return NextResponse.json(company, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
