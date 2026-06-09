import Nav from "@/features/landing/components/Nav";
import Hero from "@/features/landing/components/Hero";
import Logos from "@/features/landing/components/Logos";
import Statement from "@/features/landing/components/Statement";
import FeatureRisk from "@/features/landing/components/FeatureRisk";
import FeatureRewards from "@/features/landing/components/FeatureRewards";
import FeatureAnalytics from "@/features/landing/components/FeatureAnalytics";
import FeatureUX from "@/features/landing/components/FeatureUX";
import BuiltFor from "@/features/landing/components/BuiltFor";
import Proven from "@/features/landing/components/Proven";
import Developers from "@/features/landing/components/Developers";
import FinalCta from "@/features/landing/components/FinalCta";
import Footer from "@/features/landing/components/Footer";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Logos />
        <Statement />
        <FeatureRisk />
        <FeatureRewards />
        <FeatureAnalytics />
        <FeatureUX />
        <BuiltFor />
        <Proven />
        <Developers />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
