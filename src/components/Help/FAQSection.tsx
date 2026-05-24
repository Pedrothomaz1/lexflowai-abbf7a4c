import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqItems, categoryLabels, type FAQCategory } from "@/lib/faq-data";
import { cn } from "@/lib/utils";

export function FAQSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<FAQCategory | "all">("all");
  const navigate = useNavigate();

  const categories = Object.entries(categoryLabels) as [FAQCategory, string][];

  const filteredFAQs = useMemo(() => {
    return faqItems.filter((faq) => {
      const matchesSearch = searchQuery === "" || 
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === "all" || faq.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return parts.map((part, i) => 
        part.toLowerCase() === query.toLowerCase() 
          ? <mark key={i} className="bg-accent text-accent-foreground rounded px-0.5">{part}</mark>
          : part
    );
  };

  // Parse markdown-like bold text
  const parseAnswer = (text: string, query: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        const boldText = part.slice(2, -2);
        return <strong key={i}>{highlightText(boldText, query)}</strong>;
      }
      return <span key={i}>{highlightText(part, query)}</span>;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Perguntas Frequentes</h2>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar pergunta..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        <Badge
          variant={selectedCategory === "all" ? "default" : "outline"}
          className={cn(
            "cursor-pointer transition-colors",
            selectedCategory === "all" && "bg-primary"
          )}
          onClick={() => setSelectedCategory("all")}
        >
          Todas
        </Badge>
        {categories.map(([key, label]) => (
          <Badge
            key={key}
            variant={selectedCategory === key ? "default" : "outline"}
            className={cn(
              "cursor-pointer transition-colors",
              selectedCategory === key && "bg-primary"
            )}
            onClick={() => setSelectedCategory(key)}
          >
            {label}
          </Badge>
        ))}
      </div>

      {/* FAQ Accordion */}
      <Accordion type="single" collapsible className="space-y-2">
        {filteredFAQs.map((faq) => (
          <AccordionItem
            key={faq.id}
            value={faq.id}
            className="border rounded-lg px-4 bg-card"
          >
            <AccordionTrigger className="text-left hover:no-underline py-4">
              <div className="flex items-start gap-3 pr-4">
                <Badge variant="outline" className="text-xs shrink-0 mt-0.5">
                  {categoryLabels[faq.category]}
                </Badge>
                <span className="font-medium text-foreground">
                  {highlightText(faq.question, searchQuery)}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="pl-0 md:pl-[calc(theme(spacing.3)+80px)] space-y-3">
                <p className="text-muted-foreground leading-relaxed">
                  {parseAnswer(faq.answer, searchQuery)}
                </p>
                {faq.relatedLink && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => navigate(faq.relatedLink!)}
                  >
                    Ir para a página
                    <ExternalLink className="h-3 w-3 ml-1.5" />
                  </Button>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {filteredFAQs.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>Nenhuma pergunta encontrada.</p>
          <p className="text-sm mt-1">Tente buscar com outros termos ou selecione outra categoria.</p>
        </div>
      )}
    </div>
  );
}
