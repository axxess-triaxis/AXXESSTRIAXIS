import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Hero from "@/components/sections/Hero";
import Problem from "@/components/sections/Problem";
import FiveAxis from "@/components/sections/FiveAxis";
import Solution from "@/components/sections/Solution";
import AxxessPlatform from "@/components/sections/AxxessPlatform";
import RevenueModel from "@/components/sections/RevenueModel";
import Market from "@/components/sections/Market";
import Traction from "@/components/sections/Traction";
import Team from "@/components/sections/Team";
import Contact from "@/components/sections/Contact";
import useAnalytics from "@/hooks/useAnalytics";

export default function Home() {
  useAnalytics();
  return (
    <main data-testid="home-page" className="relative">
      <Nav />
      <Hero />
      <Problem />
      <FiveAxis />
      <Solution />
      <AxxessPlatform />
      <RevenueModel />
      <Market />
      <Traction />
      <Team />
      <Contact />
      <Footer />
    </main>
  );
}
