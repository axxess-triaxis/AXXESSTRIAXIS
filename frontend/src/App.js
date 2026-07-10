import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Home from "@/pages/Home";
import AdminWaitlist from "@/pages/AdminWaitlist";
import AdminAnalytics from "@/pages/AdminAnalytics";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin/waitlist" element={<AdminWaitlist />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#0A0A0A",
            color: "#FAFAF7",
            border: "1px solid #1F1F1F",
            borderRadius: "4px",
            fontFamily: "'Manrope', sans-serif",
          },
        }}
      />
    </div>
  );
}

export default App;
