import Nav from "./components/Nav";
import Hero from "./components/Hero";
import Logos from "./components/Logos";
import Statement from "./components/Statement";
import FeatureRisk from "./components/FeatureRisk";
import FeatureRewards from "./components/FeatureRewards";
import FeatureAnalytics from "./components/FeatureAnalytics";
import FeatureUX from "./components/FeatureUX";
import BuiltFor from "./components/BuiltFor";
import Proven from "./components/Proven";
import Developers from "./components/Developers";
import FinalCta from "./components/FinalCta";
import Footer from "./components/Footer";

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
