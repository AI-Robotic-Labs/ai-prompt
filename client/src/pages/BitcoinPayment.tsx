import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import { Copy, Check } from 'lucide-react';
import QRCode from 'react-qr-code';

export default function BitcoinPayment() {
  const [searchParams] = useLocation();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [bitcoinAddress, setBitcoinAddress] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [amount, setAmount] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [planDetails, setPlanDetails] = useState<any>(null);

  // Extract plan ID from URL parameters
  const params = new URLSearchParams(searchParams);
  const planId = params.get('plan');

  // Redirect if no plan ID is provided
  useEffect(() => {
    if (!planId) {
      setLocation('/plans');
    }
  }, [planId, setLocation]);

  // Fetch plan details
  const { data: plans } = useQuery({
    queryKey: ['/api/plans'],
    staleTime: 60000, // 1 minute
    onSuccess: (data) => {
      if (planId) {
        const plan = data.find((p: any) => p.id === planId);
        if (plan) {
          setPlanDetails(plan);
        }
      }
    }
  });

  // Create Bitcoin payment when component mounts
  useEffect(() => {
    const createBitcoinPayment = async () => {
      if (!planId || !planDetails) return;

      setIsLoading(true);

      try {
        const response = await apiRequest('POST', '/api/bitcoin-payment', { 
          planId,
          amount: planDetails.price
        });
        
        if (!response.ok) {
          throw new Error('Failed to create Bitcoin payment');
        }
        
        const data = await response.json();
        setBitcoinAddress(data.bitcoin_address);
        setPaymentId(data.payment_id);
        setAmount(data.amount);
      } catch (error) {
        console.error('Error creating Bitcoin payment:', error);
        toast({
          title: "Payment Error",
          description: "Failed to initialize Bitcoin payment. Please try again.",
          variant: "destructive",
        });
        
        // Redirect back to plans page
        setLocation('/plans');
      } finally {
        setIsLoading(false);
      }
    };

    if (planDetails && planId) {
      createBitcoinPayment();
    }
  }, [planId, planDetails, toast, setLocation]);

  const copyToClipboard = () => {
    if (bitcoinAddress) {
      navigator.clipboard.writeText(bitcoinAddress);
      setCopied(true);
      toast({
        title: "Address Copied",
        description: "Bitcoin address copied to clipboard",
      });
      
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleDone = () => {
    toast({
      title: "Payment Verification",
      description: "Your payment will be verified, and your subscription will be activated soon.",
    });
    setLocation('/profile');
  };

  if (isLoading || !planDetails) {
    return (
      <div className="container mx-auto py-12 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-md py-12">
      <div className="space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Bitcoin Payment</h1>
          <p className="text-gray-500 dark:text-gray-400">
            You're subscribing to the {planDetails.name} plan
          </p>
        </div>
        
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">Plan details</h3>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Plan</span>
              <span className="font-medium">{planDetails.name}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Price</span>
              <span className="font-medium">${planDetails.price} (in BTC)</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Requests per day</span>
              <span className="font-medium">{planDetails.requestsPerDay}</span>
            </div>
          </div>
        </div>
        
        {bitcoinAddress && (
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 space-y-6">
            <div className="text-center space-y-2">
              <h3 className="font-medium">Scan or copy the Bitcoin address</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Send exactly ${amount} worth of BTC to this address
              </p>
            </div>
            
            <div className="flex justify-center">
              <div className="p-4 bg-white rounded-lg">
                <QRCode value={bitcoinAddress} size={180} />
              </div>
            </div>
            
            <div className="relative">
              <input
                type="text"
                readOnly
                value={bitcoinAddress}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <button
                onClick={copyToClipboard}
                className="absolute right-2 top-1/2 -translate-y-1/2"
                aria-label="Copy bitcoin address"
              >
                {copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
              </button>
            </div>
            
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                After sending the payment, click the button below.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Note: Bitcoin payments typically take 10-60 minutes to confirm.
              </p>
            </div>
            
            <button
              onClick={handleDone}
              className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-4"
            >
              I've Made the Payment
            </button>
          </div>
        )}
        
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Payment ID: {paymentId}
        </p>
      </div>
    </div>
  );
}