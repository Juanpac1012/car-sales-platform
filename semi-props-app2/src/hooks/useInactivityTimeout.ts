import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearAuth } from '@/lib/adminAuth';
import { useToast } from '@/hooks/use-toast';

export const useInactivityTimeout = (timeoutMinutes: number = 10) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogout = () => {
    clearAuth();
    toast({
      title: "Sesión cerrada",
      description: "Tu sesión ha expirado por inactividad",
      variant: "default",
    });
    navigate('/login');
  };

  const resetTimeout = () => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      handleLogout();
    }, timeoutMinutes * 60 * 1000); // Convert minutes to milliseconds
  };

  useEffect(() => {
    // Activity events to monitor
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    // Add event listeners for all activity events
    events.forEach((event) => {
      document.addEventListener(event, resetTimeout);
    });

    // Initialize timeout on mount
    resetTimeout();

    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach((event) => {
        document.removeEventListener(event, resetTimeout);
      });
    };
  }, [timeoutMinutes]);

  return null;
};
