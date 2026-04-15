import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { db } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'upload');
    await mkdir(uploadDir, { recursive: true });

    const attachments = [];
    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const ext = path.extname(file.name) || '.bin';
      const filename = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`;
      const filepath = path.join(uploadDir, filename);

      await writeFile(filepath, buffer);

      const attachment = await db.attachment.create({
        data: {
          filename,
          originalName: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          url: `/api/files/${filename}`,
          expenseRequestId: id,
        },
      });
      attachments.push(attachment);
    }

    return NextResponse.json({ attachments }, { status: 201 });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
