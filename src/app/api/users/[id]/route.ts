import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, name: true, role: true, departmentId: true,
        companyId: true, isActive: true, avatar: true, phone: true, signature: true,
        department: { select: { name: true } },
        company: { select: { name: true } },
      },
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json(user);
  } catch (error) {
    console.error('User get error:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const currentUserRole = (session.user as any).role;
    const currentUserId = (session.user as any).id;
    const { id } = await params;
    const body = await request.json();

    // Users can edit their own profile, admins can edit any user
    if (id !== currentUserId && currentUserRole !== 'ADMIN' && currentUserRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.avatar !== undefined) updateData.avatar = body.avatar;
    if (body.signature !== undefined) updateData.signature = body.signature;

    // Only admins can change these
    if (currentUserRole === 'ADMIN' || currentUserRole === 'SUPER_ADMIN') {
      if (body.role !== undefined) updateData.role = body.role;
      if (body.departmentId !== undefined) updateData.departmentId = body.departmentId || null;
      if (body.isActive !== undefined) updateData.isActive = body.isActive;
    }

    if (body.password) {
      updateData.password = await bcrypt.hash(body.password, 12);
    }

    const user = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true, email: true, name: true, role: true, departmentId: true,
        companyId: true, isActive: true, avatar: true, phone: true, signature: true,
        department: { select: { name: true } },
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('User update error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const role = (session.user as any).role;
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    await db.user.delete({ where: { id } });
    return NextResponse.json({ message: 'User deleted' });
  } catch (error) {
    console.error('User delete error:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
