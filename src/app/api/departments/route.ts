import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    const departments = await db.department.findMany({
      where: { companyId: user.companyId },
      include: {
        _count: { select: { users: true, requests: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(departments);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;
    if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Only admins can create departments' }, { status: 403 });
    }

    const body = await req.json();
    if (!body.name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const department = await db.department.create({
      data: { name: body.name, companyId: user.companyId },
    });

    return NextResponse.json(department, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
