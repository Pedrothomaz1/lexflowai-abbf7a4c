import { useRef } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { HeroCards, QuickGuides, FAQSection, SupportContact } from "@/components/Help";

export default function CentralAjuda() {
  const guidesRef = useRef<HTMLDivElement>(null);
  const faqRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <PageHeader
        title="Central de Ajuda"
        description="Encontre respostas e aprenda a usar o sistema"
      />

      {/* Hero Cards */}
      <HeroCards
        onScrollToGuides={() => scrollToSection(guidesRef)}
        onScrollToFAQ={() => scrollToSection(faqRef)}
        onScrollToContact={() => scrollToSection(contactRef)}
      />

      {/* Quick Guides Section */}
      <div ref={guidesRef} className="scroll-mt-6">
        <QuickGuides />
      </div>

      {/* FAQ Section */}
      <div ref={faqRef} className="scroll-mt-6">
        <FAQSection />
      </div>

      {/* Support Contact Section */}
      <div ref={contactRef} className="scroll-mt-6">
        <SupportContact />
      </div>
    </div>
  );
}
