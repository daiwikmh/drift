import Nav from "@/features/landing/components/Nav";
import Hero from "@/features/landing/components/Hero";
import { PlatformShowcase } from "@/features/landing/components/PlatformShowcase";
import { FeatureCarousel } from "@/features/landing/components/FeatureCarousel";
import { Security } from "@/features/landing/components/Security";
import { TrustedBy } from "@/features/landing/components/TrustedBy";
import { DeployAgents } from "@/features/landing/components/DeployAgents";
import Footer from "@/features/landing/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Nav />
      <Hero />
      <PlatformShowcase />
      <FeatureCarousel />
      <Security />
      <TrustedBy />
      <DeployAgents />
      <Footer />
    </div>
  );
}
