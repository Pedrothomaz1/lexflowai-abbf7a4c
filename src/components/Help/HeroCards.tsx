import { Rocket, HelpCircle, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface HeroCardsProps {
  onScrollToGuides: () => void;
  onScrollToFAQ: () => void;
  onScrollToContact: () => void;
}

export function HeroCards({ onScrollToGuides, onScrollToFAQ, onScrollToContact }: HeroCardsProps) {
  const cards = [
    {
      icon: Rocket,
      title: "Primeiros Passos",
      description: "Comece por aqui",
      onClick: onScrollToGuides,
      color: "hsl(var(--lexflow-verde-principal))",
    },
    {
      icon: HelpCircle,
      title: "FAQ",
      description: "Perguntas frequentes",
      onClick: onScrollToFAQ,
      color: "hsl(var(--lexflow-mostarda))",
    },
    {
      icon: MessageCircle,
      title: "Fale Conosco",
      description: "Precisa de ajuda?",
      onClick: onScrollToContact,
      color: "hsl(var(--primary))",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map((card) => (
        <Card
          key={card.title}
          className={cn(
            "cursor-pointer transition-all duration-200",
            "hover:shadow-md hover:-translate-y-0.5",
            "border-border/50"
          )}
          onClick={card.onClick}
        >
          <CardContent className="flex items-center gap-4 p-5">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${card.color}20` }}
            >
              <card.icon className="h-6 w-6" style={{ color: card.color }} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{card.title}</h3>
              <p className="text-sm text-muted-foreground">{card.description}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
