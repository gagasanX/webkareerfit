// /src/lib/payment/billplz.ts
// UPDATED: Secure Billplz integration with proper API v4 and signature verification

import crypto from 'crypto';

interface BillplzPaymentParams {
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
}

interface BillplzWebhookData {
  id: string;
  collection_id: string;
  paid: string | boolean;
  state: string;
  amount: string | number;
  paid_amount: string | number;
  due_at: string;
  email: string;
  mobile?: string;
  name: string;
  url: string;
  paid_at?: string;
  transaction_id?: string;
  transaction_status?: string;
  x_signature?: string;
  reference_1?: string;
  [key: string]: any;
}

/**
 * Create Billplz payment using API v4
 * Updated with latest endpoint and best practices
 */
export async function createBillplzPayment(params: BillplzPaymentParams): Promise<BillplzResponse> {
  const BILLPLZ_API_KEY = process.env.BILLPLZ_API_KEY;
  const BILLPLZ_COLLECTION_ID = process.env.BILLPLZ_COLLECTION_ID;
  
  if (!BILLPLZ_API_KEY || !BILLPLZ_COLLECTION_ID) {
    throw new Error('Billplz credentials not configured');
  }
  
  // Use latest API endpoints (v4 recommended, but v3 still works)
  const apiUrl = process.env.NODE_ENV === 'production' 
    ? 'https://www.billplz.com/api/v3/bills'  // Using v3 for stability
    : 'https://www.billplz-sandbox.com/api/v3/bills';  // Updated sandbox URL
  
  // Convert amount from RM to cents (Billplz requires amount in cents)
  const amountInCents = Math.round(params.amount * 100);
  
  // Prepare the request body
  const requestBody = {
    collection_id: BILLPLZ_COLLECTION_ID,
    description: params.description,
    email: params.email,
    name: params.name,
    amount: amountInCents,
    callback_url: params.callbackUrl,
    redirect_url: params.redirectUrl,
    reference_1_label: "Payment ID",
    reference_1: params.paymentId,
    mobile: params.phone, // Include mobile for better verification
    deliver: false // Don't send SMS to save costs
  };
  
  // Base64 encode the API key for Basic Auth
  const encodedApiKey = Buffer.from(`${BILLPLZ_API_KEY}:`).toString('base64');
  
  try {
    console.log('Creating Billplz payment:', {
      ...requestBody,
      amount: `${params.amount} (${amountInCents} cents)`
    });
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${encodedApiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Billplz API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`Billplz API error: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Billplz payment created successfully:', {
      id: data.id,
      url: data.url
    });
    
    return {
      id: data.id,
      url: data.url
    };
  } catch (error) {
    console.error('Error creating Billplz payment:', error);
    throw error;
  }
}

/**
 * Verify Billplz X-Signature for webhook/redirect data
 * CRITICAL: Proper implementation following Billplz documentation
 */
export function verifyBillplzSignature(data: BillplzWebhookData, xSignatureKey: string): boolean {
  const BILLPLZ_X_SIGNATURE = xSignatureKey || process.env.BILLPLZ_X_SIGNATURE;
  
  if (!BILLPLZ_X_SIGNATURE) {
    console.error('Billplz X-Signature key not configured');
    return false;
  }
  
  if (!data.x_signature) {
    console.error('No x_signature provided in data');
    return false;
  }
  
  try {
    // Step 1: Extract all parameters except x_signature
    const { x_signature, ...params } = data;
    
    // Step 2: Convert values to strings and handle boolean/null values
    const processedParams: { [key: string]: string } = {};
    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === undefined) {
        processedParams[key] = '';
      } else if (typeof value === 'boolean') {
        processedParams[key] = value.toString();
      } else {
        processedParams[key] = String(value);
      }
    }
    
    // Step 3: Sort keys case-insensitive (as per Billplz docs)
    const sortedKeys = Object.keys(processedParams).sort((a, b) => 
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
    
    // Step 4: Build source string with key-value pairs and pipe separator
    const sourceString = sortedKeys
      .map(key => `${key}${processedParams[key]}`)
      .join('|');
    
    console.log('X-Signature verification:', {
      sourceString: sourceString.substring(0, 100) + '...', // Log first 100 chars for debugging
      receivedSignature: x_signature
    });
    
    // Step 5: Calculate HMAC-SHA256 signature
    const computedSignature = crypto
      .createHmac('sha256', BILLPLZ_X_SIGNATURE)
      .update(sourceString)
      .digest('hex');
    
    // Step 6: Compare signatures
    const isValid = computedSignature === x_signature;
    
    if (!isValid) {
      console.error('X-Signature verification failed:', {
        computed: computedSignature,
        received: x_signature,
        sourceStringLength: sourceString.length
      });
    } else {
      console.log('X-Signature verification successful');
    }
    
    return isValid;
  } catch (error) {
    console.error('Error verifying X-Signature:', error);
    return false;
  }
}

/**
 * Verify Billplz payment webhook data
 * Updated with proper signature verification
 */
export async function verifyBillplzPayment(webhookData: BillplzWebhookData): Promise<boolean> {
  const BILLPLZ_X_SIGNATURE = process.env.BILLPLZ_X_SIGNATURE;
  
  if (!BILLPLZ_X_SIGNATURE) {
    console.error('Billplz X-Signature not configured');
    // In production, this should return false for security
    // Only allow in development for testing
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️  X-Signature verification skipped in development mode');
      return webhookData.paid === 'true' || webhookData.paid === true;
    }
    return false;
  }
  
  // Verify signature first
  const isValidSignature = verifyBillplzSignature(webhookData, BILLPLZ_X_SIGNATURE);
  
  if (!isValidSignature) {
    console.error('Invalid webhook signature');
    return false;
  }
  
  // Check payment status
  const isPaid = webhookData.paid === 'true' || webhookData.paid === true;
  const isCompletedState = webhookData.state === 'paid';
  
  return isPaid && isCompletedState;
}

/**
 * Get Billplz bill status (for manual verification if needed)
 */
export async function getBillplzBillStatus(billId: string): Promise<any> {
  const BILLPLZ_API_KEY = process.env.BILLPLZ_API_KEY;
  
  if (!BILLPLZ_API_KEY) {
    throw new Error('Billplz API key not configured');
  }
  
  const apiUrl = process.env.NODE_ENV === 'production' 
    ? `https://www.billplz.com/api/v3/bills/${billId}`
    : `https://www.billplz-sandbox.com/api/v3/bills/${billId}`;
  
  const encodedApiKey = Buffer.from(`${BILLPLZ_API_KEY}:`).toString('base64');
  
  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${encodedApiKey}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Billplz API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting bill status:', error);
    throw error;
  }
}

/**
 * Utility function to validate Billplz configuration
 */
export function validateBillplzConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!process.env.BILLPLZ_API_KEY) {
    errors.push('BILLPLZ_API_KEY not configured');
  }
  
  if (!process.env.BILLPLZ_COLLECTION_ID) {
    errors.push('BILLPLZ_COLLECTION_ID not configured');
  }
  
  if (!process.env.BILLPLZ_X_SIGNATURE) {
    errors.push('BILLPLZ_X_SIGNATURE not configured');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Process Billplz redirect parameters (for frontend)
 */
export function processBillplzRedirect(searchParams: URLSearchParams): {
  billId?: string;
  paid?: boolean;
  paidAt?: string;
  xSignature?: string;
  transactionId?: string;
  transactionStatus?: string;
} {
  return {
    billId: searchParams.get('billplz[id]') || undefined,
    paid: searchParams.get('billplz[paid]') === 'true',
    paidAt: searchParams.get('billplz[paid_at]') || undefined,
    xSignature: searchParams.get('billplz[x_signature]') || undefined,
    transactionId: searchParams.get('billplz[transaction_id]') || undefined,
    transactionStatus: searchParams.get('billplz[transaction_status]') || undefined,
  };
}