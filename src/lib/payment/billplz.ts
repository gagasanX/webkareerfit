// /src/lib/payment/billplz.ts - CORRECTED VERSION

import crypto from 'crypto';

interface BillplzPaymentData {
  amount: number;
  description: string;
  name: string;
  email: string;
  phone: string;
  paymentId: string;
  redirectUrl: string;
  callbackUrl: string;
}

interface BillplzResponse {
  id: string;
  url: string;
  collection_id: string;
  paid: boolean;
  state: string;
  amount: number;
  paid_amount: number;
  due_at: string;
  email: string;
  mobile: string;
  name: string;
  callback_url: string;
  redirect_url: string;
  reference_1_label: string;
  reference_1: string;
}

export async function createBillplzPayment(data: BillplzPaymentData): Promise<BillplzResponse> {
  console.log('💳 =================================');
  console.log('💳 CREATING BILLPLZ PAYMENT');
  console.log('💳 =================================');
  
  const apiKey = process.env.BILLPLZ_API_KEY;
  const collectionId = process.env.BILLPLZ_COLLECTION_ID;
  
  console.log('🔐 Environment Check:', {
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey ? apiKey.length : 0,
    apiKeyPreview: apiKey ? `${apiKey.substring(0, 8)}...` : 'MISSING',
    hasCollectionId: !!collectionId,
    collectionId: collectionId || 'MISSING'
  });

  if (!apiKey) {
    throw new Error('BILLPLZ_API_KEY not found in environment variables');
  }

  if (!collectionId) {
    throw new Error('BILLPLZ_COLLECTION_ID not found in environment variables');
  }

  // Convert amount to cents
  const amountInCents = Math.round(data.amount * 100);
  
  // Clean phone number
  const cleanPhone = data.phone.replace(/[^\d+]/g, '');
  const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone : `+6${cleanPhone.replace(/^0/, '')}`;

  const billplzData = {
    collection_id: collectionId,
    description: data.description,
    email: data.email,
    name: data.name,
    amount: amountInCents.toString(),
    callback_url: data.callbackUrl,
    redirect_url: data.redirectUrl,
    reference_1_label: 'Payment ID',
    reference_1: data.paymentId,
    mobile: formattedPhone,
    deliver: 'false',
  };

  console.log('📤 Billplz Request Data:', {
    ...billplzData,
    amount: `${data.amount} RM (${amountInCents} cents)`
  });

  const authString = Buffer.from(`${apiKey}:`).toString('base64');

  try {
    console.log('🌐 Making API request to Billplz...');
    
    const response = await fetch('https://www.billplz.com/api/v3/bills', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams(billplzData).toString(),
    });

    console.log('📡 Billplz Response Status:', response.status);

    const responseText = await response.text();
    console.log('📥 Billplz Raw Response:', responseText);

    if (!response.ok) {
      console.error('❌ Billplz API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: responseText
      });
      throw new Error(`Billplz API error: ${response.status} - ${response.statusText}`);
    }

    let billplzResponse: BillplzResponse;
    try {
      billplzResponse = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Failed to parse Billplz response:', responseText);
      throw new Error('Invalid response from Billplz');
    }

    console.log('✅ Billplz Payment Created Successfully:', {
      id: billplzResponse.id,
      url: billplzResponse.url,
      amount: billplzResponse.amount,
      state: billplzResponse.state
    });
    console.log('💳 =================================');

    return billplzResponse;

  } catch (error) {
    console.error('💥 Billplz Error:', error);
    console.log('💳 =================================');
    throw error;
  }
}

// FIXED: Verify Billplz payment from webhook data
export async function verifyBillplzPayment(webhookData: any): Promise<boolean> {
  try {
    const isPaid = webhookData.paid === true || 
                   webhookData.paid === 'true' || 
                   webhookData.paid === '1' || 
                   webhookData.paid === 1;
    
    const hasValidId = webhookData.id && webhookData.id.length > 0;
    
    console.log('🔍 Payment verification:', {
      id: webhookData.id,
      paid: webhookData.paid,
      isPaid,
      hasValidId,
      result: isPaid && hasValidId
    });
    
    return isPaid && hasValidId;
  } catch (error) {
    console.error('❌ Error verifying Billplz payment:', error);
    return false;
  }
}

// FIXED: Verify Billplz webhook signature
export function verifyBillplzSignature(webhookData: any, signatureKey: string): boolean {
  if (!signatureKey) {
    console.warn('⚠️ BILLPLZ_X_SIGNATURE not configured - skipping verification');
    return true;
  }
  
  try {
    const receivedSignature = webhookData.x_signature;
    if (!receivedSignature) {
      console.warn('⚠️ No X-signature provided in webhook data');
      return false;
    }
    
    // Create signature string (Billplz format)
    const sortedKeys = Object.keys(webhookData)
      .filter(key => key !== 'x_signature')
      .sort();
    
    const stringToSign = sortedKeys
      .map(key => `${key}${webhookData[key]}`)
      .join('|') + `|${signatureKey}`;
    
    const expectedSignature = crypto
      .createHash('sha256')
      .update(stringToSign)
      .digest('hex');
    
    const isValid = expectedSignature === receivedSignature;
    
    console.log('🔐 Signature verification:', {
      provided: receivedSignature.substring(0, 10) + '...',
      expected: expectedSignature.substring(0, 10) + '...',
      isValid
    });
    
    return isValid;
  } catch (error) {
    console.error('❌ Signature verification error:', error);
    return false;
  }
}

// Additional helper functions
export async function processBillplzRedirect(params: any) {
  console.log('🔄 Processing Billplz redirect params:', params);
  return {
    success: true,
    message: 'Redirect processed'
  };
}

export function validateBillplzConfig() {
  const apiKey = process.env.BILLPLZ_API_KEY;
  const collectionId = process.env.BILLPLZ_COLLECTION_ID;
  const signatureKey = process.env.BILLPLZ_X_SIGNATURE;
  
  const errors = [];
  
  if (!apiKey) errors.push('BILLPLZ_API_KEY missing');
  if (!collectionId) errors.push('BILLPLZ_COLLECTION_ID missing');
  if (!signatureKey) errors.push('BILLPLZ_X_SIGNATURE missing (recommended)');
  
  return {
    isValid: errors.length === 0 || (errors.length === 1 && errors[0].includes('SIGNATURE')),
    errors
  };
}

export function formatBillplzAmount(cents: number): string {
  return `RM ${(cents / 100).toFixed(2)}`;
}

export async function getBillplzPaymentStatus(billId: string): Promise<BillplzResponse | null> {
  const apiKey = process.env.BILLPLZ_API_KEY;
  
  if (!apiKey) {
    throw new Error('BILLPLZ_API_KEY not configured');
  }

  try {
    const authString = Buffer.from(`${apiKey}:`).toString('base64');
    
    const response = await fetch(`https://www.billplz.com/api/v3/bills/${billId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to get Billplz payment status:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting Billplz payment status:', error);
    return null;
  }
}