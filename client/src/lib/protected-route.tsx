import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export function ProtectedRoute({
  path,
  component: Component,
  adminOnly = false,
}: {
  path: string;
  component: () => React.JSX.Element;
  adminOnly?: boolean;
}) {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();

  // Check if route requires admin access but user is not an admin
  useEffect(() => {
    if (!isLoading && user && adminOnly && !user.isAdmin) {
      toast({
        title: "Access denied",
        description: "You don't have permission to access this area",
        variant: "destructive"
      });
    }
  }, [user, isLoading, adminOnly, toast]);

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // If the route requires admin access and the user is not an admin, redirect to dashboard
  if (adminOnly && !user.isAdmin) {
    return (
      <Route path={path}>
        <Redirect to="/" />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}
