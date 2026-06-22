import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Standards } from "@/components/landing/Standards";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#070809] text-white">
      <Nav />
      <Hero />
      <HowItWorks />
      <Standards />
      <Footer />
    </div>
  );
}
