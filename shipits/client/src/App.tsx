import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { I18nProvider } from "@/contexts/I18nContext";
import LanguageSelector from "@/components/LanguageSelector";
import GlobalUiTranslator from "@/components/GlobalUiTranslator";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Home from "@/pages/home";
import Forum from "@/pages/forum";
import ProjectDetail from "@/pages/project-detail";
import Profile from "@/pages/profile";
import CreateProject from "@/pages/create-project";
import AdminDashboard from "@/pages/admin-dashboard";
import Dashboard from "@/pages/dashboard";
import ChatPage from "@/pages/chat";
import NotFound from "@/pages/not-found";
import Guidelines from "@/pages/guidelines";
import VerifySuccess from "@/pages/verify-success";
import ResetPassword from "@/pages/reset-password";
import Lists from "@/pages/lists";
import ListDetail from "@/pages/list-detail";
import CreateList from "@/pages/create-list";
import OnboardingTour from "@/components/OnboardingTour";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/forum" component={Forum} />
      <Route path="/forum/project/:id" component={ProjectDetail} />
      <Route path="/profile" component={Profile} />
      <Route path="/profile/:id" component={Profile} />
      <Route path="/create-project" component={CreateProject} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/chat" component={ChatPage} />
      <Route path="/guidelines" component={Guidelines} />
      <Route path="/verify-success" component={VerifySuccess} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/lists" component={Lists} />
      <Route path="/lists/create" component={CreateList} />
      <Route path="/lists/:id" component={ListDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <I18nProvider>
              <GlobalUiTranslator />
              <div className="fixed left-2 bottom-2 sm:left-4 sm:bottom-4 z-50">
                <LanguageSelector />
              </div>
              <OnboardingTour />
              <Router />
            </I18nProvider>
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
