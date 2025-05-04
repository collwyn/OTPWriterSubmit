import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { queryClient } from "./lib/queryClient";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import SubmitStoryPage from "@/pages/submit-story-page";
import AdminDashboardPage from "@/pages/admin-dashboard-page";
import ReviewSubmissionPage from "@/pages/review-submission-page";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/submit" component={SubmitStoryPage} />
      <ProtectedRoute path="/submit-story" component={SubmitStoryPage} />
      {/* Use ProtectedRoute with route params for submissions with ID parameter */}
      <Route path="/submissions/:id">
        {(params) => (
          <ProtectedRoute 
            path={`/submissions/${params.id}`} 
            component={() => <ReviewSubmissionPage id={params.id} />}
          />
        )}
      </Route>
      <ProtectedRoute path="/admin" adminOnly component={AdminDashboardPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <TooltipProvider>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
