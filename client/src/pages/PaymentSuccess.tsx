import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useStripe } from '@stripe/react-stripe-js';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle } from 'lucide-react';

export default function PaymentSuccess() {
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<'success' | 'processing' | 'error'>('processing');
  const stripe = useStripe();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  
  useEffect(() => {
    if (!stripe) {
      return;
    }

    // Retrieve the client secret from the URL
    const clientSecret = new URLSearchParams(window.location.search).get(
      'payment_intent_client_secret'
    );

    if (!clientSecret) {
      setStatus('error');
      setMessage('Could not complete your payment.');
      return;
    }

    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
      switch (paymentIntent?.status) {
        case 'succeeded':
          setStatus('success');
          setMessage('Your payment was successful!');
          toast({
            title: "Payment Successful",
            description: "Your subscription has been activated",
          });
          break;
        case 'processing':
          setStatus('processing');
          setMessage('Your payment is processing.');
          break;
        case 'requires_payment_method':
          setStatus('error');
          setMessage('Your payment was not successful, please try again.');
          break;
        default:
          setStatus('error');
          setMessage('Something went wrong.');
          break;
      }
    });
  }, [stripe, toast]);

  const handleContinue = () => {
    setLocation('/');
  };

  return (
    <div className="container mx-auto max-w-md py-16">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center space-y-6">
        {status === 'success' && (
          <div className="flex flex-col items-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <h1 className="text-2xl font-bold">Payment Successful!</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Thank you for your subscription. Your account has been upgraded.
            </p>
          </div>
        )}
        
        {status === 'processing' && (
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
            <h1 className="text-2xl font-bold">Processing Payment</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Your payment is being processed. This may take a moment.
            </p>
          </div>
        )}
        
        {status === 'error' && (
          <div className="flex flex-col items-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
              <span className="text-red-500 text-2xl">✕</span>
            </div>
            <h1 className="text-2xl font-bold">Payment Failed</h1>
            <p className="text-gray-500 dark:text-gray-400">
              {message || 'There was an issue processing your payment. Please try again.'}
            </p>
          </div>
        )}
        
        <div className="pt-4">
          <button
            onClick={handleContinue}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-6"
          >
            {status === 'error' ? 'Try Again' : 'Continue to Dashboard'}
          </button>
        </div>
      </div>
    </div>
  );
}