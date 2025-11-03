import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import InviteCodeValidation from "./pages/InviteCodeValidation";
import Cadastro from "./pages/Cadastro";
import AnalysisDashboard from "./pages/AnalysisDashboard";

// Lazy load rotas não críticas
const History = lazy(() => import("./pages/History"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Studies = lazy(() => import("./pages/Studies"));
const NewStudy = lazy(() => import("./pages/NewStudy"));
const Settings = lazy(() => import("./pages/Settings"));
const GenerateStudyPage = lazy(() => import("./pages/GenerateStudyPage"));
const GeneratedStudiesListPage = lazy(() => import("./pages/GeneratedStudiesListPage"));
const GeneratedStudyDetailsPage = lazy(() => import("./pages/GeneratedStudyDetailsPage"));
const StudyDetailsPage = lazy(() => import("./pages/StudyDetailsPage"));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/cadastro"} component={Cadastro} />
      <Route path={"/invite"} component={InviteCodeValidation} />
      <Route path={"/app"} component={Dashboard} />
      <Route path={"/history"} component={History} />
      <Route path={"/onboarding"} component={Onboarding} />
      <Route path={"/studies"} component={Studies} />
      <Route path={"/studies/:id"} component={StudyDetailsPage} />
      <Route path={"/studies/new"} component={NewStudy} />
      <Route path={"/settings"} component={Settings} />
      <Route path={"/analysis"} component={AnalysisDashboard} />
      <Route path={"/generate-study"} component={GenerateStudyPage} />
      <Route path={"/generated-studies"} component={GeneratedStudiesListPage} />
      <Route path={"/generated-studies/:studyId"} component={GeneratedStudyDetailsPage} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
