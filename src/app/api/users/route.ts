import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;
    const url = new URL(req.url);
    const companyId = url.searchParams.get('companyId') || user.companyId;

    // Only SUPER_ADMIN can list all, others see their company
    const where: any = {};
    if (user.role !== 'SUPER_ADMIN') {
      where.companyId = user.companyId;
    } else if (companyId) {
      where.companyId = companyId;
    }

    const users = await db.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        phone: true,
        department: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(users);
  } catch (error: any) {
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
    if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Only admins can create users' }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, password, role, departmentId } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        companyId: user.companyId,
        departmentId: departmentId || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: { select: { name: true } },
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
