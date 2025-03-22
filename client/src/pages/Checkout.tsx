import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

// Make sure to add this check in production to prevent loading without a key
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}

// Initialize Stripe outside of component to avoid recreating on each render
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

function CheckoutForm({ planId }: { planId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [_, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js has not loaded yet
      return;
    }

    setLoading(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/payment-success',
        },
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message || "An error occurred during payment processing",
          variant: "destructive",
        });
      }
    } catch (e) {
      console.error('Payment error:', e);
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-4"
      >
        {loading ? "Processing..." : "Pay Now"}
      </button>
    </form>
  );
}

export default function Checkout() {
  const [searchParams] = useLocation();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
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

  // Create subscription when component mounts
  useEffect(() => {
    const createSubscription = async () => {
      if (!planId || !planDetails) return;

      try {
        const response = await apiRequest('POST', '/api/create-subscription', { planId });
        
        if (!response.ok) {
          throw new Error('Failed to create subscription');
        }
        
        const data = await response.json();
        setClientSecret(data.client_secret);
      } catch (error) {
        console.error('Error creating subscription:', error);
        toast({
          title: "Subscription Error",
          description: "Failed to initialize subscription. Please try again.",
          variant: "destructive",
        });
        
        // Redirect back to plans page
        setLocation('/plans');
      }
    };

    if (planDetails && planId) {
      createSubscription();
    }
  }, [planId, planDetails, toast, setLocation]);

  if (!planId || !planDetails) {
    return (
      <div className="container mx-auto py-12 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="container mx-auto py-12 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        <p className="ml-3">Initializing payment...</p>
      </div>
    );
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe',
    },
  };

  return (
    <div className="container mx-auto max-w-md py-12">
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Complete Your Subscription</h1>
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
              <span className="font-medium">${planDetails.price} / month</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Requests per day</span>
              <span className="font-medium">{planDetails.requestsPerDay}</span>
            </div>
          </div>
        </div>
        
        <Elements stripe={stripePromise} options={options}>
          <CheckoutForm planId={planId} />
        </Elements>
        
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          Your payment is processed securely through Stripe.
        </p>
      </div>
    </div>
  );
}