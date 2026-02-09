import { NextRequest, NextResponse } from 'next/server';
import { PRICE_PER_RENDER, CURRENCY } from '@/lib/constants';

const isDemoMode = !process.env.STRIPE_SECRET_KEY;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rooms, quantity } = body;

    // Validate: must have at least one room selected
    if (!rooms || !Array.isArray(rooms) || rooms.length === 0) {
      return NextResponse.json({ error: 'Keine Räume ausgewählt' }, { status: 400 });
    }

    const roomCount = quantity || rooms.length;

    // Auto-detect base URL from request headers
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`;

    // Demo mode: skip Stripe, redirect directly to success
    if (isDemoMode) {
      const demoSessionId = `demo_${crypto.randomUUID()}`;
      const successUrl = `${baseUrl}/success?session_id=${demoSessionId}`;
      return NextResponse.json({ url: successUrl });
    }

    // Build room description for Stripe
    const roomNames = rooms.map((r: { name: string }) => r.name).join(', ');

    // Production: use Stripe
    const { getStripeServer } = await import('@/lib/stripe');
    const session = await getStripeServer().checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: CURRENCY,
            product_data: {
              name: 'RoomVision Raumvisualisierung',
              description: `${roomCount} ${roomCount === 1 ? 'Raum' : 'Räume'}: ${roomNames} (je 3 Ansichten)`,
            },
            unit_amount: PRICE_PER_RENDER,
          },
          quantity: roomCount,
        },
      ],
      metadata: {
        roomCount: String(roomCount),
        roomNames,
      },
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/create?cancelled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Checkout konnte nicht erstellt werden' },
      { status: 500 }
    );
  }
}
