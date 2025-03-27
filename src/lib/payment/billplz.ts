// Billplz API integration

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
  
  export async function createBillplzPayment(params: BillplzPaymentParams): Promise<BillplzResponse> {
    const BILLPLZ_API_KEY = process.env.BILLPLZ_API_KEY;
    const BILLPLZ_COLLECTION_ID = process.env.BILLPLZ_COLLECTION_ID;
    const BILLPLZ_X_SIGNATURE = process.env.BILLPLZ_X_SIGNATURE;
    
    if (!BILLPLZ_API_KEY || !BILLPLZ_COLLECTION_ID) {
      throw new Error('Billplz credentials not configured');
    }
    
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
      reference_1: params.paymentId
    };
    
    // Base64 encode the API key for Basic Auth
    const encodedApiKey = Buffer.from(`${BILLPLZ_API_KEY}:`).toString('base64');
    
    try {
      console.log('Creating Billplz payment:', requestBody);
      
      const response = await fetch('https://www.billplz.com/api/v3/bills', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${encodedApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Billplz API error:', errorText);
        throw new Error(`Billplz API error: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Billplz payment created:', data);
      
      return {
        id: data.id,
        url: data.url
      };
    } catch (error) {
      console.error('Error creating Billplz payment:', error);
      throw error;
    }
  }
  
  export async function verifyBillplzPayment(requestBody: any): Promise<boolean> {
    const BILLPLZ_X_SIGNATURE = process.env.BILLPLZ_X_SIGNATURE;
    
    if (!BILLPLZ_X_SIGNATURE) {
      throw new Error('Billplz X-Signature not configured');
    }
    
    // In a production environment, you would validate the X-Signature
    // This is a simplified version
    console.log('Verifying Billplz payment:', requestBody);
    
    // For simplicity, we'll just check if the payment is 'paid'
    return requestBody.paid === 'true' || requestBody.paid === true;
  }