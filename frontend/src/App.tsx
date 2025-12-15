
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import AnalysisPage from "./pages/AnalysisPage";
import AnalysisPageNeo from "./pages/AnalysisPageNeo";
import ImportMatch from "@/pages/ImportMatch";
import PreviewImport from "@/pages/PreviewImport";
import MatchesAdmin from "@/pages/MatchesAdmin";
import CreateProfile from "@/pages/CreateProfile";
import MappingsAdmin from "@/pages/MappingsAdmin";
import MultiMatchReportPage from "./pages/MultiMatchReportPage";
import EventEditor from "./pages/EventEditor";

function App() {
  return (
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/analysis/:matchId" element={<AnalysisPage />} />
        <Route path="/analysis-neo/:matchId" element={<AnalysisPageNeo />} />
        <Route path="/match/:matchId" element={<AnalysisPage />} />
        <Route path="/multi-match-report" element={<MultiMatchReportPage />} />
        <Route path="/admin/matches" element={<MatchesAdmin />} />
        <Route path="/admin/mappings" element={<MappingsAdmin />} />
        <Route path="/import" element={<ImportMatch />} />
        <Route path="/preview" element={<PreviewImport />} />
        <Route path="/create-profile" element={<CreateProfile />} />
        <Route path="/analysis/:matchId/edit-events" element={<EventEditor />} />
      </Routes>
  );
}

export default App;
