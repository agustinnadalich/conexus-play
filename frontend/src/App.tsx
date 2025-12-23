
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import AnalysisPage from "./pages/AnalysisPage";
import ImportMatch from "@/pages/ImportMatch";
import PreviewImport from "@/pages/PreviewImport";
import MatchesAdmin from "@/pages/MatchesAdmin";
import EditMatch from "@/pages/EditMatch";
import CreateProfile from "@/pages/CreateProfile";
import MappingsAdmin from "@/pages/MappingsAdmin";
import MultiMatchReportPage from "./pages/MultiMatchReportPage";
import EventEditor from "./pages/EventEditor";
import Login from "./pages/Login";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import RequireAuth from "./components/RequireAuth";
import UserAdmin from "./pages/UserAdmin";
import ClubAdmin from "./pages/ClubAdmin";
import TeamAdmin from "./pages/TeamAdmin";

function App() {
  return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          path="/"
          element={
            <RequireAuth>
              <Home />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/analysis/:matchId"
          element={
            <RequireAuth>
              <AnalysisPage />
            </RequireAuth>
          }
        />
        <Route
          path="/match/:matchId"
          element={
            <RequireAuth>
              <AnalysisPage />
            </RequireAuth>
          }
        />
        <Route
          path="/multi-match-report"
          element={
            <RequireAuth>
              <MultiMatchReportPage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/matches"
          element={
            <RequireAuth>
              <MatchesAdmin />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/matches/:id/edit"
          element={
            <RequireAuth>
              <EditMatch />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/mappings"
          element={
            <RequireAuth>
              <MappingsAdmin />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/clubs"
          element={
            <RequireAuth>
              <ClubAdmin />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/teams"
          element={
            <RequireAuth>
              <TeamAdmin />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/users"
          element={
            <RequireAuth>
              <UserAdmin />
            </RequireAuth>
          }
        />
        <Route
          path="/import"
          element={
            <RequireAuth>
              <ImportMatch />
            </RequireAuth>
          }
        />
        <Route
          path="/preview"
          element={
            <RequireAuth>
              <PreviewImport />
            </RequireAuth>
          }
        />
        <Route
          path="/create-profile"
          element={
            <RequireAuth>
              <CreateProfile />
            </RequireAuth>
          }
        />
        <Route
          path="/analysis/:matchId/edit-events"
          element={
            <RequireAuth>
              <EventEditor />
            </RequireAuth>
          }
        />
      </Routes>
  );
}

export default App;
