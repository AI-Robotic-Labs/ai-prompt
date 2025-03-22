import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Plan } from '@shared/schema';
import { useLocation } from 'wouter';
import { Check } from 'lucide-react';

export default function Plans() {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Check if user is authenticated
  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, []);

  // Fetch available plans
  const { data: plans, isLoading } = useQuery({
    queryKey: ['/api/plans'],
    staleTime: 60000, // 1 minute
  });

  const handleSelectPlan = async (planId: string) => {
    // If user is not authenticated, redirect to login
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please login or register to subscribe to a plan",
        variant: "default",
      });
      
      setLocation('/login');
      return;
    }
    
    setSelectedPlan(planId);
    
    try {
      // For free tier, just update the subscription
      if (planId === 'free') {
        const response = await apiRequest('POST', '/api/create-subscription', { planId });
        
        if (response.ok) {
          toast({
            title: "Subscription Updated",
            description: "You are now on the free plan",
          });
          
          setLocation('/');
          return;
        }
      } else {
        // For paid plans, redirect to checkout
        setLocation(`/checkout?plan=${planId}`);
      }
    } catch (error) {
      console.error('Error selecting plan:', error);
      toast({
        title: "Error",
        description: "Failed to select plan. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-12 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
          Select the plan that best fits your needs. Upgrade or downgrade at any time.
        </p>
        <p className="text-amber-500 dark:text-amber-400 text-sm mt-2 max-w-2xl mx-auto">
          Note: This is a demonstration application. Currently, only the Free tier is functional.
          Paid plans require a valid Stripe account with configured products.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans?.map((plan: Plan) => (
          <div 
            key={plan.id}
            className={`rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden ${
              plan.id === selectedPlan ? 'ring-2 ring-primary' : ''
            }`}
          >
            <div className="p-6 space-y-4">
              <h3 className="text-2xl font-bold">{plan.name}</h3>
              
              <div className="flex items-baseline">
                <span className="text-3xl font-bold">
                  {plan.price === 0 ? 'Free' : `$${plan.price}`}
                </span>
                {plan.price > 0 && (
                  <span className="ml-1 text-gray-500 dark:text-gray-400">/{plan.currency}</span>
                )}
              </div>
              
              <ul className="space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <Check className="mr-2 h-4 w-4 text-green-500" />
                    <span>{feature}</span>
                  </li>
                ))}
                <li className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-green-500" />
                  <span>{plan.requestsPerDay} requests per day</span>
                </li>
              </ul>
              
              <div className="pt-4">
                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-4"
                >
                  {plan.price === 0 ? 'Select Free Plan' : 'Subscribe Now'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}