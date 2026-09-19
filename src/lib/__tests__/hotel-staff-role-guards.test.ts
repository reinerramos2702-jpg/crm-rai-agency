import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

vi.mock('@/lib/roles', () => ({
  isRoleContext: vi.fn(() => false),
  requireRole: vi.fn(async () => NextResponse.json({ error: 'forbidden' }, { status: 403 })),
}));

vi.mock('@/lib/db', () => ({ prisma: {} }));
vi.mock('@/lib/audit', () => ({ logAudit: vi.fn(), generateReference: vi.fn() }));

import { requireRole } from '@/lib/roles';
import * as bookings from '@/app/api/bookings/route';
import * as booking from '@/app/api/bookings/[id]/route';
import * as guests from '@/app/api/guests/route';
import * as guest from '@/app/api/guests/[id]/route';
import * as hotelKpis from '@/app/api/hotel-kpis/route';
import * as rooms from '@/app/api/rooms/route';
import * as room from '@/app/api/rooms/[id]/route';
import * as roomTypes from '@/app/api/room-types/route';

const req = {} as never;
const params = { params: Promise.resolve({ id: 'record-1' }) };

async function expectStaffAllowed(run: () => Promise<unknown>) {
  await run();
  expect(vi.mocked(requireRole).mock.calls[0][1]).toContain('staff');
}

async function expectStaffDenied(run: () => Promise<unknown>) {
  await run();
  expect(vi.mocked(requireRole).mock.calls[0][1]).not.toContain('staff');
}

describe('staff hotel role guards', () => {
  beforeEach(() => {
    vi.mocked(requireRole).mockClear();
  });

  it.each([
    ['GET /api/bookings', () => bookings.GET(req)],
    ['POST /api/bookings', () => bookings.POST(req)],
    ['GET /api/bookings/:id', () => booking.GET(req, params)],
    ['PATCH /api/bookings/:id', () => booking.PATCH(req, params)],
    ['GET /api/guests', () => guests.GET(req)],
    ['POST /api/guests', () => guests.POST(req)],
    ['GET /api/guests/:id', () => guest.GET(req, params)],
    ['PATCH /api/guests/:id', () => guest.PATCH(req, params)],
    ['GET /api/hotel-kpis', () => hotelKpis.GET(req)],
    ['GET /api/rooms', () => rooms.GET(req)],
  ])('allows staff for %s', async (_name, run) => {
    await expectStaffAllowed(run);
  });

  it.each([
    ['DELETE /api/bookings/:id', () => booking.DELETE(req, params)],
    ['DELETE /api/guests/:id', () => guest.DELETE(req, params)],
    ['POST /api/rooms', () => rooms.POST(req)],
    ['PATCH /api/rooms/:id', () => room.PATCH(req, params)],
    ['DELETE /api/rooms/:id', () => room.DELETE(req, params)],
    ['GET /api/room-types', () => roomTypes.GET(req)],
    ['POST /api/room-types', () => roomTypes.POST(req)],
  ])('denies staff for %s', async (_name, run) => {
    await expectStaffDenied(run);
  });
});
