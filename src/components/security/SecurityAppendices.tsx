import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExternalLink, BookOpen, Users, FileSignature } from "lucide-react";

const GLOSSARY = [
  { term: "RBAC", definition: "Role-Based Access Control - permissões baseadas em papéis" },
  { term: "RLS", definition: "Row Level Security - segurança em nível de linha (PostgreSQL)" },
  { term: "IDOR", definition: "Insecure Direct Object Reference - acesso direto a objetos sem validação" },
  { term: "XSS", definition: "Cross-Site Scripting - injeção de código malicioso em páginas web" },
  { term: "CSRF", definition: "Cross-Site Request Forgery - forjar requisições em nome do usuário" },
  { term: "MFA", definition: "Multi-Factor Authentication - autenticação de múltiplos fatores" },
  { term: "TOTP", definition: "Time-based One-Time Password - senha única baseada em tempo" },
  { term: "PII", definition: "Personally Identifiable Information - dados pessoais identificáveis" },
  { term: "LGPD", definition: "Lei Geral de Proteção de Dados - regulação brasileira de privacidade" },
  { term: "SOC 2", definition: "Service Organization Control 2 - padrão de auditoria de segurança" },
  { term: "MTTD", definition: "Mean Time to Detect - tempo médio para detectar incidente" },
  { term: "MTTR", definition: "Mean Time to Respond - tempo médio para responder a incidente" },
];

const REFERENCES = [
  { name: "OWASP Top 10", url: "https://owasp.org/www-project-top-ten/", description: "Principais vulnerabilidades web" },
  { name: "Supabase Security Docs", url: "https://supabase.com/docs/guides/auth", description: "Documentação de autenticação" },
  { name: "PostgreSQL RLS", url: "https://www.postgresql.org/docs/current/ddl-rowsecurity.html", description: "Row Level Security" },
  { name: "LGPD Official Text", url: "http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm", description: "Lei Geral de Proteção de Dados" },
  { name: "NIST Cybersecurity", url: "https://www.nist.gov/cyberframework", description: "Framework de segurança cibernética" },
];

const CONTACTS = [
  { role: "Product Owner", name: "Pedro Thomaz", email: "pedro@lexflowai.com.br", phone: "+55 11 XXXXX-XXXX" },
  { role: "Tech Lead", name: "A definir", email: "tech@lexflowai.com.br", phone: "-" },
  { role: "Security Lead", name: "A definir / Externo", email: "security@lexflowai.com.br", phone: "-" },
  { role: "DPO (LGPD)", name: "A definir", email: "dpo@lexflowai.com.br", phone: "-" },
  { role: "On-Call (Critical)", name: "Rotação", email: "oncall@lexflowai.com.br", phone: "+55 11 XXXXX-XXXX" },
];

const STAKEHOLDERS = [
  { name: "Pedro Thomaz", role: "Head Backoffice / Product Owner" },
  { name: "[CEO Name]", role: "CEO" },
  { name: "[CTO Name]", role: "CTO" },
  { name: "[CFO Name]", role: "CFO" },
];

export function SecurityAppendices() {
  return (
    <Tabs defaultValue="glossary" className="space-y-4">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="glossary" className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Glossário
        </TabsTrigger>
        <TabsTrigger value="references" className="flex items-center gap-2">
          <ExternalLink className="h-4 w-4" />
          Referências
        </TabsTrigger>
        <TabsTrigger value="contacts" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Contatos
        </TabsTrigger>
        <TabsTrigger value="signoff" className="flex items-center gap-2">
          <FileSignature className="h-4 w-4" />
          Sign-Off
        </TabsTrigger>
      </TabsList>

      <TabsContent value="glossary">
        <Card>
          <CardHeader>
            <CardTitle>Glossário de Segurança</CardTitle>
            <CardDescription>Termos técnicos e definições utilizados neste documento</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Termo</TableHead>
                  <TableHead>Definição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {GLOSSARY.map((item) => (
                  <TableRow key={item.term}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {item.term}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.definition}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="references">
        <Card>
          <CardHeader>
            <CardTitle>Referências Técnicas</CardTitle>
            <CardDescription>Documentação e padrões de segurança utilizados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {REFERENCES.map((ref) => (
                <a
                  key={ref.name}
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="font-medium flex items-center gap-2">
                      {ref.name}
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">{ref.description}</p>
                  </div>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="contacts">
        <Card>
          <CardHeader>
            <CardTitle>Contatos de Segurança</CardTitle>
            <CardDescription>Equipe responsável por segurança e compliance</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Função</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {CONTACTS.map((contact) => (
                  <TableRow key={contact.role}>
                    <TableCell>
                      <Badge variant="secondary">{contact.role}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{contact.name}</TableCell>
                    <TableCell>
                      <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                        {contact.email}
                      </a>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{contact.phone}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="signoff">
        <Card>
          <CardHeader>
            <CardTitle>Aprovação do Documento</CardTitle>
            <CardDescription>Sign-off dos stakeholders para implementação</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stakeholder</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Assinatura</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {STAKEHOLDERS.map((stakeholder) => (
                  <TableRow key={stakeholder.name}>
                    <TableCell className="font-medium">{stakeholder.name}</TableCell>
                    <TableCell className="text-muted-foreground">{stakeholder.role}</TableCell>
                    <TableCell>
                      <div className="w-32 h-8 border-b border-dashed border-muted-foreground/50" />
                    </TableCell>
                    <TableCell>
                      <div className="w-24 h-8 border-b border-dashed border-muted-foreground/50" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-xs text-muted-foreground mt-6 text-center">
              Este documento requer aprovação de todos os stakeholders antes da implementação em produção.
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
