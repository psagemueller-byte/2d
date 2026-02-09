import Hero from '@/components/landing/Hero';
import HowItWorks from '@/components/landing/HowItWorks';
import Features from '@/components/landing/Features';
import ExampleGallery from '@/components/landing/ExampleGallery';
import Pricing from '@/components/landing/Pricing';

export default function Home() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <Features />
      <ExampleGallery />
      <Pricing />
    </>
  );
}
