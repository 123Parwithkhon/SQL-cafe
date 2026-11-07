// app/api/admin/certificates/[code]/route.server.ts — отозвать сертификат (DELETE)
import { NextResponse } from 'next/server';
import { revokeCertificate } from '@/lib/admin';
import { guardAdminMutation, jsonError } from '@/lib/admin-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const guard = await guardAdminMutation(request);
  if ('response' in guard) return guard.response;

  try {
    const ok = await revokeCertificate(guard.admin.id, (await params).code);
    return ok ? NextResponse.json({ ok: true }) : jsonError('not_found', 404);
  } catch (err) {
    console.error('[admin] DELETE certificate', err);
    return jsonError('internal', 500);
  }
}
