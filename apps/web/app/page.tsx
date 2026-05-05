import "./landing.css";
import Navbar from "@/components/landing/Navbar";
import MainContent from "@/components/landing/MainContent";
import Footer from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="light-page min-h-screen flex flex-col bg-white overflow-x-hidden relative">
      <Navbar />
      <MainContent />
      <Footer />
    </div>
  );
}
