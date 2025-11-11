import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import MapPage from "./pages/MapPage";
import InviteCodeValidation from "./pages/InviteCodeValidation";
import Cadastro from "./pages/Cadastro";
import AnalysisDashboard from "./pages/AnalysisDashboard";
import AppLayout from "./components/AppLayout";

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
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const MeusEstudos = lazy(() => import("./pages/MeusEstudos"));
const SolicitarEstudo = lazy(() => import("./pages/SolicitarEstudo"));
const AdminStudyRequests = lazy(() => import("./pages/AdminStudyRequests"));

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
      
      {/* Rotas com Sidebar */}
      <Route path={"/app"}>
        <AppLayout>
          <Dashboard />
        </AppLayout>
      </Route>
      <Route path={"/mapa"}>
        <AppLayout>
          <MapPage />
        </AppLayout>
      </Route>
      <Route path={"/admin"}>
        <AppLayout>
          <AdminDashboard />
        </AppLayout>
      </Route>
      <Route path={"/admin-bp"}>
        <AppLayout>
          <AdminPanel />
        </AppLayout>
      </Route>
      <Route path={"/historico"}>
        <AppLayout>
          <History />
        </AppLayout>
      </Route>
      <Route path={"/onboarding"} component={Onboarding} />
      <Route path={"/estudos"}>
        <AppLayout>
          <Studies />
        </AppLayout>
      </Route>
      <Route path={"/estudos/:id"}>
        <AppLayout>
          <StudyDetailsPage />
        </AppLayout>
      </Route>
      <Route path={"/estudos/novo"}>
        <AppLayout>
          <NewStudy />
        </AppLayout>
      </Route>
      <Route path={"/configuracoes"}>
        <AppLayout>
          <Settings />
        </AppLayout>
      </Route>
      <Route path={"/analysis"} component={AnalysisDashboard} />
      <Route path={"/generate-study"} component={GenerateStudyPage} />
      <Route path={"/generated-studies"} component={GeneratedStudiesListPage} />
      <Route path={"/generated-studies/:studyId"} component={GeneratedStudyDetailsPage} />
      <Route path={"/meus-estudos"}>
        <AppLayout>
          <MeusEstudos />
        </AppLayout>
      </Route>
      <Route path={"/solicitar-estudo"}>
        <AppLayout>
          <SolicitarEstudo />
        </AppLayout>
      </Route>
      <Route path={"/admin-bp/solicitacoes"}>
        <AppLayout>
          <AdminStudyRequests />
        </AppLayout>
      </Route>
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
        switchable
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
