import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { db } from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const company = await db.company.findUnique({
      where: { id },
      include: { _count: { select: { users: true, departments: true, requests: true } } },
    });

    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    return NextResponse.json(company);
  } catch (error) {
    console.error('Company get error:', error);
    return NextResponse.json({ error: 'Failed to fetch company' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const role = (session.user as any).role;
    if (role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.industry !== undefined) updateData.industry = body.industry;
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.regenerateInviteCode) updateData.inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    const company = await db.company.update({ where: { id }, data: updateData });
    return NextResponse.json(company);
  } catch (error) {
    console.error('Company update error:', error);
    return NextResponse.json({ error: 'Failed to update company' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const role = (session.user as any).role;
    if (role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    await db.company.delete({ where: { id } });
    return NextResponse.json({ message: 'Company deleted' });
  } catch (error) {
    console.error('Company delete error:', error);
    return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 });
  }
}
