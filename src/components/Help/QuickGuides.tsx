import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { guideItems, guideCategories } from "@/lib/faq-data";
import { cn } from "@/lib/utils";

export function QuickGuides() {
  const [activeCategory, setActiveCategory] = useState("Todos");
  const navigate = useNavigate();

  const filteredGuides = activeCategory === "Todos"
    ? guideItems
    : guideItems.filter((guide) => guide.category === activeCategory);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Guias Rápidos</h2>
      </div>

      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {guideCategories.map((category) => (
            <TabsTrigger
              key={category}
              value={category}
              className={cn(
                "text-xs px-3 py-1.5",
                "data-[state=active]:bg-background data-[state=active]:shadow-sm"
              )}
            >
              {category}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeCategory} className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGuides.map((guide) => {
              const Icon = guide.icon;
              return (
                <Card
                  key={guide.id}
                  className={cn(
                    "cursor-pointer transition-all duration-200 group",
                    "hover:shadow-md hover:border-primary/30"
                  )}
                  onClick={() => navigate(guide.link)}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <Badge variant="secondary" className="text-xs flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {guide.duration}
                      </Badge>
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {guide.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {guide.description}
                      </p>
                    </div>

                    <div className="flex items-center text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>Ver guia</span>
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredGuides.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum guia encontrado nesta categoria.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
