import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { db } from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const department = await db.department.findUnique({
      where: { id },
      include: { _count: { select: { users: true, requests: true } }, company: { select: { name: true } } },
    });

    if (!department) return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    return NextResponse.json(department);
  } catch (error) {
    console.error('Department get error:', error);
    return NextResponse.json({ error: 'Failed to fetch department' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const role = (session.user as any).role;
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const department = await db.department.update({
      where: { id },
      data: { name: body.name },
    });

    return NextResponse.json(department);
  } catch (error) {
    console.error('Department update error:', error);
    return NextResponse.json({ error: 'Failed to update department' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const role = (session.user as any).role;
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    await db.department.delete({ where: { id } });
    return NextResponse.json({ message: 'Department deleted' });
  } catch (error) {
    console.error('Department delete error:', error);
    return NextResponse.json({ error: 'Failed to delete department' }, { status: 500 });
  }
}
