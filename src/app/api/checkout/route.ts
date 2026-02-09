import { NextRequest, NextResponse } from 'next/server';
import { ROOM_STYLES, ROOM_TYPES, PRICE_PER_RENDER, CURRENCY } from '@/lib/constants';

const isDemoMode = !process.env.STRIPE_SECRET_KEY;

export async function POST(request: NextRequest) {
  try {
    const { style, roomType } = await request.json();

    // Validate inputs
    const styleData = ROOM_STYLES.find((s) => s.id === style);
    const roomData = ROOM_TYPES.find((r) => r.id === roomType);

    if (!styleData || !roomData) {
      return NextResponse.json({ error: 'Ungültiger Stil oder Raumtyp' }, { status: 400 });
    }

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
              name: 'RoomVision Render',
              description: `${styleData.name} ${roomData.name} Visualisierung`,
            },
            unit_amount: PRICE_PER_RENDER,
          },
          quantity: 1,
        },
      ],
      metadata: {
        style,
        roomType,
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
