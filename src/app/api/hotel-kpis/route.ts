import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/hotel-kpis — KPIs operativos hoteleros para el dashboard.
 * Calcula en una sola pasada paralelizada para mantener latencia baja.
 */
export async function GET(req: NextRequest) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente', 'viewer']);
  if (!isRoleContext(ctx)) return ctx;

  const wsId = ctx.workspace.id;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    arrivalsToday,
    departuresToday,
    currentlyStaying,
    pendingBookings,
    overduePayments,
    monthRevenue,
    pendingPaymentsAmount,
    totalGuests,
    totalSites,
    totalRooms,
    occupiedRooms,
    unreadConversations,
    recentBookings,
    recentPayments,
  ] = await Promise.all([
    prisma.booking.count({
      where: { workspaceId: wsId, status: 'confirmed', checkInDate: { gte: startOfDay, lte: endOfDay } },
    }),
    prisma.booking.count({
      where: { workspaceId: wsId, status: 'checked_in', checkOutDate: { gte: startOfDay, lte: endOfDay } },
    }),
    prisma.booking.count({
      where: { workspaceId: wsId, status: 'checked_in' },
    }),
    prisma.booking.count({ where: { workspaceId: wsId, status: 'pending' } }),
    prisma.payment.count({
      where: { workspaceId: wsId, status: 'pending', createdAt: { lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } },
    }),
    prisma.payment.aggregate({
      where: { workspaceId: wsId, status: 'paid', paidAt: { gte: startOfMonth } },
      _sum: { amountCents: true },
    }),
    prisma.payment.aggregate({
      where: { workspaceId: wsId, status: { in: ['pending', 'under_review'] } },
      _sum: { amountCents: true },
    }),
    prisma.guest.count({ where: { workspaceId: wsId } }),
    prisma.site.count({ where: { workspaceId: wsId, status: 'active' } }),
    prisma.room.count({ where: { workspaceId: wsId } }),
    prisma.room.count({ where: { workspaceId: wsId, status: 'occupied' } }),
    prisma.conversation.count({ where: { contact: { workspaceId: wsId }, unreadCount: { gt: 0 } } }),
    prisma.booking.findMany({
      where: { workspaceId: wsId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        guest: { select: { firstName: true, lastName: true } },
        site: { select: { name: true } },
      },
    }),
    prisma.payment.findMany({
      where: { workspaceId: wsId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { guest: { select: { firstName: true, lastName: true } } },
    }),
  ]);

  const occupancyPct = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  return NextResponse.json(
    {
      kpis: {
        arrivalsToday,
        departuresToday,
        currentlyStaying,
        pendingBookings,
        overduePayments,
        monthRevenueCents: monthRevenue._sum.amountCents ?? 0,
        pendingPaymentsCents: pendingPaymentsAmount._sum.amountCents ?? 0,
        totalGuests,
        totalSites,
        totalRooms,
        occupiedRooms,
        occupancyPct,
        unreadConversations,
      },
      recent: { bookings: recentBookings, payments: recentPayments },
    },
    { headers: { 'Cache-Control': 'private, max-age=10, stale-while-revalidate=60' } }
  );
}
