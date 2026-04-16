import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, mode, companyName, industry, inviteCode } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    let companyId: string;

    if (mode === 'join') {
      if (!inviteCode) {
        return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });
      }
      const company = await db.company.findUnique({ where: { inviteCode } });
      if (!company || !company.isActive) {
        return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
      }
      companyId = company.id;
    } else if (mode === 'create') {
      if (!companyName) {
        return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
      }
      const company = await db.company.create({
        data: {
          name: companyName,
          industry: industry || null,
          currency: 'USD',
        },
      });
      companyId = company.id;

      // Create default departments
      await db.department.createMany({
        data: [
          { name: 'Operations', companyId },
          { name: 'Finance', companyId },
          { name: 'Human Resources', companyId },
          { name: 'Marketing', companyId },
          { name: 'IT', companyId },
        ],
      });
    } else {
      return NextResponse.json({ error: 'Invalid registration mode' }, { status: 400 });
    }

    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: mode === 'create' ? 'ADMIN' : 'EMPLOYEE',
        companyId,
      },
      include: { company: true },
    });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Registration failed' }, { status: 500 });
  }
}
