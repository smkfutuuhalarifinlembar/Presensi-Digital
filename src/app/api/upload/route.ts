import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth';
import { processImageIfNeeded } from '@/lib/image-processor';
import { deleteObject, listObjects, saveObject } from '@/lib/storage';

export async function POST(req: Request) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const type = (formData.get('type') as string) || 'misc';
    const folder = (formData.get('folder') as string) || 'uploads';

    if (!file) {
      return NextResponse.json({ error: 'File tidak ditemukan.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Resize & kompres gambar otomatis
    const { buffer: processedBuffer, mimeType, extension } = await processImageIfNeeded(
      buffer,
      file.type,
      { maxWidth: 1200, maxHeight: 1200, quality: 80, format: 'jpeg' }
    );

    // Nama file aman
    const cleanBase = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '');
    const filename = `${type}_${Date.now()}_${cleanBase}.${extension}`;
    const pathname = `${folder}/${filename}`;

    // Simpan ke storage (lokal `public/uploads` di VPS, atau Vercel Blob bila token tersedia)
    const stored = await saveObject(pathname, processedBuffer, mimeType);

    return NextResponse.json({
      success: true,
      url: stored.url,
      pathname: stored.pathname,
      filename,
      originalSize: buffer.length,
      processedSize: processedBuffer.length,
      compressionRatio: ((1 - processedBuffer.length / buffer.length) * 100).toFixed(1) + '%',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Gagal mengunggah file.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');
    const pathname = searchParams.get('pathname');

    if (!url && !pathname) {
      return NextResponse.json({ error: 'URL atau pathname wajib diisi.' }, { status: 400 });
    }

    const target = url ?? pathname!;
    const deleted = await deleteObject(target);

    if (!deleted) {
      return NextResponse.json(
        { error: 'File tidak ditemukan di storage (kemungkinan tersimpan di storage eksternal).' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Gagal menghapus file.' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const prefix = searchParams.get('prefix') || '';

    const files = await listObjects(prefix);

    return NextResponse.json({
      success: true,
      blobs: files,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Gagal mengambil daftar file.' },
      { status: 500 }
    );
  }
}