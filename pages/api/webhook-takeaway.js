// Takeaway.com / Thuisbezorgd Webhook Endpoint
// Receives incoming orders from delivery platforms
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin (server-side)
function getDb() {
  if (!getApps().length) {
    // Use environment variables for admin credentials
    if (process.env.FIREBASE_ADMIN_KEY) {
      initializeApp({
        credential: cert(JSON.parse(process.env.FIREBASE_ADMIN_KEY)),
      });
    } else {
      // Fallback: use default project config
      initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'abi-timeregister',
      });
    }
  }
  return getFirestore();
}

export default async function handler(req, res) {
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify webhook secret
  const webhookSecret = process.env.TAKEAWAY_WEBHOOK_SECRET;
  if (webhookSecret) {
    const authHeader = req.headers['x-webhook-secret'] || req.headers['authorization'];
    if (authHeader !== webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const body = req.body;

    // Normalize order data from various platforms
    const incomingOrder = {
      // Platform info
      platform: body.platform || 'takeaway',
      platformOrderId: body.id || body.orderId || body.order_id || `EXT-${Date.now()}`,

      // Customer info
      customerName: body.customer?.name || body.customerName || body.customer_name || '',
      customerAddress: body.customer?.address || body.customerAddress || body.delivery_address || '',
      customerPhone: body.customer?.phone || body.customerPhone || body.customer_phone || '',
      customerEmail: body.customer?.email || '',

      // Delivery info
      deliveryNotes: body.customer?.notes || body.deliveryNotes || body.delivery_notes || body.remarks || '',
      estimatedDeliveryTime: body.estimatedDeliveryTime || body.estimated_delivery_time || null,

      // Order items
      items: normalizeItems(body.items || body.products || body.orderLines || []),

      // Financials
      subtotal: parseFloat(body.subtotal || body.sub_total || 0),
      deliveryFee: parseFloat(body.deliveryFee || body.delivery_fee || body.delivery_costs || 0),
      total: parseFloat(body.total || body.totalPrice || body.total_price || 0),
      paymentMethod: body.paymentMethod || body.payment_method || 'online',
      isPaid: body.isPaid !== undefined ? body.isPaid : true,

      // Status
      status: 'pending',
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),

      // Raw data for debugging
      rawPayload: JSON.stringify(body).substring(0, 2000),
    };

    // If total is 0, try to calculate from items
    if (!incomingOrder.total && incomingOrder.items.length > 0) {
      incomingOrder.total = incomingOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      incomingOrder.subtotal = incomingOrder.total;
    }

    const adminDb = getDb();
    await adminDb.collection('incomingOrders').add(incomingOrder);

    return res.status(200).json({
      success: true,
      message: 'Order received',
      orderId: incomingOrder.platformOrderId,
    });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function normalizeItems(items) {
  return items.map(item => ({
    name: item.name || item.product_name || item.productName || 'Onbekend',
    quantity: parseInt(item.quantity || item.count || 1),
    price: parseFloat(item.price || item.unitPrice || item.unit_price || 0),
    notes: item.notes || item.remarks || item.comment || '',
    modifiers: (item.modifiers || item.options || item.extras || []).map(m => ({
      name: m.name || m.option_name || '',
      price: parseFloat(m.price || 0),
    })),
  }));
}
