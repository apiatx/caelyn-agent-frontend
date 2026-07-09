import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import LandingNav from "@/components/landing/LandingNav";
import HeroSection from "@/components/landing/HeroSection";
import SignalConvergence from "@/components/landing/SignalConvergence";
import AboutSection from "@/components/landing/AboutSection";
import StrategySection from "@/components/landing/StrategySection";
import PricingSection from "@/components/landing/PricingSection";
import FinalCTA from "@/components/landing/FinalCTA";
import LandingFooter from "@/components/landing/LandingFooter";

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/app/home");
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div style={{ background: "#050608", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 20, height: 20, border: "2px solid rgba(41,189,232,0.2)", borderTopColor: "hsl(200,85%,55%)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ background: "#050608", minHeight: "100vh", color: "hsl(210,20%,93%)", overflowX: "hidden", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <LandingNav />
      <HeroSection />
      <SignalConvergence />
      <AboutSection />
      <StrategySection />
      <PricingSection />
      <FinalCTA />
      <LandingFooter />
    </div>
  );
}
