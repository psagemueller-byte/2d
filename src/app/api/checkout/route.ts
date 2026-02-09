import { NextRequest, NextResponse } from 'next/server';
import { getStripeServer } from '@/lib/stripe';
import { ROOM_STYLES, ROOM_TYPES, PRICE_PER_RENDER, CURRENCY } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const { style, roomType } = await request.json();

    // Validate inputs
    const styleData = ROOM_STYLES.find((s) => s.id === style);
    const roomData = ROOM_TYPES.find((r) => r.id === roomType);

    if (!styleData || !roomData) {
      return NextResponse.json({ error: 'Ungültiger Stil oder Raumtyp' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

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
