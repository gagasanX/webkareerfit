// ToyyibPay API integration

interface ToyyibpayPaymentParams {
    amount: number;
    description: string;
    name: string;
    email: string;
    phone: string;
    paymentId: string;
    redirectUrl: string;
    callbackUrl: string;
    paymentMethod: string;
  }
  
  interface ToyyibpayResponse {
    billCode: string;
    url: string;
  }
  
  export async function createToyyibpayPayment(params: ToyyibpayPaymentParams): Promise<ToyyibpayResponse> {
    const TOYYIBPAY_SECRET_KEY = process.env.TOYYIBPAY_SECRET_KEY;
    const TOYYIBPAY_CATEGORY_CODE = process.env.TOYYIBPAY_CATEGORY_CODE;
    
    if (!TOYYIBPAY_SECRET_KEY || !TOYYIBPAY_CATEGORY_CODE) {
      throw new Error('ToyyibPay credentials not configured');
    }
    
    // Convert amount from RM to cents (ToyyibPay requires amount in cents)
    const amountInCents = Math.round(params.amount * 100);
    
    // Map payment method
    const paymentMethod = params.paymentMethod === 'fpx' ? '0' : '1'; // 0: FPX, 1: Credit Card
    
    // Prepare the request body
    const formData = new FormData();
    formData.append('userSecretKey', TOYYIBPAY_SECRET_KEY);
    formData.append('categoryCode', TOYYIBPAY_CATEGORY_CODE);
    formData.append('billName', params.description);
    formData.append('billDescription', params.description);
    formData.append('billPriceSetting', '1'); // Fixed amount
    formData.append('billPayorInfo', '1'); // Bill payer info is required
    formData.append('billAmount', amountInCents.toString());
    formData.append('billReturnUrl', params.redirectUrl);
    formData.append('billCallbackUrl', params.callbackUrl);
    formData.append('billExternalReferenceNo', params.paymentId);
    formData.append('billTo', params.name);
    formData.append('billEmail', params.email);
    formData.append('billPhone', params.phone);
    formData.append('billPaymentChannel', paymentMethod);
    formData.append('billDisplayMerchant', '1'); // Display merchant info
    
    try {
      console.log('Creating ToyyibPay payment:', Object.fromEntries(formData));
      
      const response = await fetch('https://toyyibpay.com/index.php/api/createBill', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('ToyyibPay API error:', errorText);
        throw new Error(`ToyyibPay API error: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log('ToyyibPay payment created:', data);
      
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Invalid response from ToyyibPay');
      }
      
      const billCode = data[0].BillCode;
      
      return {
        billCode: billCode,
        url: `https://toyyibpay.com/${billCode}`
      };
    } catch (error) {
      console.error('Error creating ToyyibPay payment:', error);
      throw error;
    }
  }
  
  export async function verifyToyyibpayPayment(requestBody: any): Promise<boolean> {
    console.log('Verifying ToyyibPay payment:', requestBody);
    
    // For ToyyibPay, check status '1' which means payment success
    const status = requestBody.status;
    return status === '1' || status === 1;
  }