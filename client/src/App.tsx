import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import Home from "@/pages/Home";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Profile from "@/pages/Profile";
import Plans from "@/pages/Plans";
import Checkout from "@/pages/Checkout";
import PaymentSuccess from "@/pages/PaymentSuccess";
import BitcoinPayment from "@/pages/BitcoinPayment";
import { useEffect, useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

// Initialize Stripe
let stripePromise: ReturnType<typeof loadStripe> | null = null;

function getStripePromise() {
  if (!stripePromise && import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
    stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
  }
  return stripePromise;
}

// Navigation component
function Navigation() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  
  useEffect(() => {
    const checkAuthStatus = () => {
      const token = localStorage.getItem('token');
      setIsLoggedIn(!!token);
    };
    
    checkAuthStatus();
    
    // Listen for storage events to update auth state
    window.addEventListener('storage', checkAuthStatus);
    
    return () => {
      window.removeEventListener('storage', checkAuthStatus);
    };
  }, []);
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    window.location.href = '/';
  };
  
  return (
    <header className="bg-background border-b">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <a href="/" className="text-xl font-bold text-primary">AI API Comparison</a>
          </div>
          
          <nav className="flex items-center space-x-4">
            <a href="/" className="text-sm font-medium transition-colors hover:text-primary">
              Home
            </a>
            <a href="/plans" className="text-sm font-medium transition-colors hover:text-primary">
              Plans
            </a>
            {isLoggedIn ? (
              <>
                <a href="/profile" className="text-sm font-medium transition-colors hover:text-primary">
                  Profile
                </a>
                <button 
                  onClick={handleLogout}
                  className="text-sm font-medium transition-colors hover:text-primary"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <a href="/login" className="text-sm font-medium transition-colors hover:text-primary">
                  Login
                </a>
                <a 
                  href="/register" 
                  className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Sign Up
                </a>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

// Auth wrapper component to check for token before API requests
function AuthWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Setup API request interceptor to include auth token for authenticated requests
    const originalFetch = window.fetch;
    window.fetch = async function(input, init) {
      // Only add token for API requests
      if (typeof input === 'string' && input.startsWith('/api')) {
        const token = localStorage.getItem('token');
        if (token) {
          init = init || {};
          init.headers = init.headers || {};
          Object.assign(init.headers, {
            'Authorization': `Bearer ${token}`
          });
        }
      }
      return originalFetch(input, init);
    };
    
    return () => {
      window.fetch = originalFetch;
    };
  }, []);
  
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home}/>
      <Route path="/login" component={Login}/>
      <Route path="/register" component={Register}/>
      <Route path="/profile" component={Profile}/>
      <Route path="/plans" component={Plans}/>
      <Route path="/checkout" component={Checkout}/>
      <Route path="/payment-success" component={PaymentSuccess}/>
      <Route path="/bitcoin-payment" component={BitcoinPayment}/>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Preload Stripe if available
  useEffect(() => {
    getStripePromise();
  }, []);
  
  return (
    <AuthWrapper>
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1">
          <Router />
        </main>
        <footer className="py-6 border-t">
          <div className="container mx-auto px-4 text-center text-sm text-gray-500">
            <p>© {new Date().getFullYear()} AI API Comparison Tool. All rights reserved.</p>
          </div>
        </footer>
      </div>
      <Toaster />
    </AuthWrapper>
  );
}

export default App;
