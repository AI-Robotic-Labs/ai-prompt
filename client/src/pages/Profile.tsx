import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import { User, Badge } from 'lucide-react';

interface UserProfile {
  id: number;
  username: string;
  email: string;
  subscription_tier: string;
  requests_remaining: number | null;
  requests_reset: string | null;
}

interface Subscription {
  id: number;
  user_id: number;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  payment_method: string;
}

export default function Profile() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  
  // Check if user is authenticated
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsAuthenticated(false);
      setLocation('/login');
      toast({
        title: "Authentication Required",
        description: "Please login to view your profile",
      });
    } else {
      setIsAuthenticated(true);
    }
  }, [setLocation, toast]);
  
  // Fetch user profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['/api/user/profile'],
    enabled: isAuthenticated,
    staleTime: 60000, // 1 minute
  });
  
  // Fetch user subscription
  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['/api/user/subscription'],
    enabled: isAuthenticated,
    staleTime: 60000, // 1 minute
  });
  
  // Fetch plans (to display plan name)
  const { data: plans } = useQuery({
    queryKey: ['/api/plans'],
    enabled: isAuthenticated,
    staleTime: 60000, // 1 minute
  });
  
  const getPlanName = (planId: string) => {
    if (!plans) return planId;
    const plan = plans.find((p: any) => p.id === planId);
    return plan ? plan.name : planId;
  };
  
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };
  
  const handleUpgrade = () => {
    setLocation('/plans');
  };
  
  if (!isAuthenticated) {
    return null;
  }
  
  if (profileLoading || subscriptionLoading) {
    return (
      <div className="container mx-auto py-12 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Your Profile</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage your account details and subscription
          </p>
        </div>
        
        {profile && (
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{profile.username}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{profile.email}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Account Details</h3>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-1">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Username</span>
                    <span>{profile.username}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Email</span>
                    <span>{profile.email}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Member Since</span>
                    <span>{profile.created_at ? formatDate(profile.created_at) : 'N/A'}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">Subscription</h3>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-1">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Current Plan</span>
                    <div className="flex items-center">
                      <span>{getPlanName(profile.subscription_tier)}</span>
                      <span className="ml-2 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80">
                        {profile.subscription_tier.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Requests Remaining</span>
                    <span>{profile.requests_remaining !== null ? profile.requests_remaining : 'Unlimited'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Reset Date</span>
                    <span>{profile.requests_reset ? formatDate(profile.requests_reset) : 'N/A'}</span>
                  </div>
                  
                  {subscription && subscription.id && (
                    <>
                      <div className="grid grid-cols-2 gap-1">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Period Start</span>
                        <span>{formatDate(subscription.current_period_start)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Period End</span>
                        <span>{formatDate(subscription.current_period_end)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Status</span>
                        <span className="capitalize">{subscription.status}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleUpgrade}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-4"
              >
                {profile.subscription_tier === 'free' ? 'Upgrade Plan' : 'Change Plan'}
              </button>
            </div>
          </div>
        )}
        
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <h3 className="text-lg font-medium mb-4">Usage History</h3>
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            Usage history will be displayed here
          </p>
        </div>
      </div>
    </div>
  );
}