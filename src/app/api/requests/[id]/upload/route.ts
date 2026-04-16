import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { db } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const expenseRequest = await db.expenseRequest.findUnique({ where: { id } });
    if (!expenseRequest) return NextResponse.json({ error: 'Request not found' }, { status: 404 });

    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'upload', id);
    await mkdir(uploadDir, { recursive: true });

    const attachments = [];
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = path.extname(file.name) || '.bin';
      const safeName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`;
      const filepath = path.join(uploadDir, safeName);
      await writeFile(filepath, buffer);

      const attachment = await db.attachment.create({
        data: {
          filename: safeName,
          originalName: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          url: `/api/requests/${id}/files/${safeName}`,
          expenseRequestId: id,
        },
      });
      attachments.push(attachment);
    }

    return NextResponse.json({ attachments }, { status: 201 });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload files' }, { status: 500 });
  }
}
