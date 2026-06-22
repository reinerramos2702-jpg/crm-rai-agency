import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * GET /go/[slug] — endpoint público (sin auth).
 * Incrementa el contador de clicks del enlace de activación y redirige
 * al destino configurado. Si no existe, redirige al home.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const link = await prisma.activationLink.findUnique({ where: { slug } });
  if (!link) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  await prisma.activationLink.update({ where: { slug }, data: { clicks: { increment: 1 } } });

  const dest = link.destination.startsWith('http') ? link.destination : `https://${link.destination}`;
  return NextResponse.redirect(dest);
}
