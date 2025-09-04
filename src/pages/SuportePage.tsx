import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  MessageCircle, 
  Mail, 
  Phone, 
  Clock, 
  ChevronDown, 
  ChevronUp,
  ExternalLink,
  HelpCircle,
  Users,
  Headphones,
  MessageSquare
} from "lucide-react";
import { toast } from "sonner";

interface FAQItem {
  question: string;
  answer: string;
}

const SuportePage = () => {
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  const supportChannels = [
    {
      title: "WhatsApp",
      description: "Suporte rápido e direto via WhatsApp",
      icon: MessageCircle,
      color: "bg-green-500 hover:bg-green-600",
      link: "https://wa.me/5564996028022",
      availability: "24/7",
      responseTime: "Imediato",
      instructions: [
        "Clique no botão abaixo para abrir o WhatsApp",
        "Envie sua dúvida ou problema",
        "Aguarde o retorno da nossa equipe",
        "Mantenha o chat aberto para acompanhar a conversa"
      ]
    },
    {
      title: "Discord",
      description: "Comunidade e suporte técnico especializado",
      icon: Users,
      color: "bg-indigo-500 hover:bg-indigo-600",
      link: "https://discord.gg/a3X4DC8rjY",
      availability: "24/7",
      responseTime: "1-2 horas",
      instructions: [
        "Entre no nosso servidor Discord",
        "Acesse o canal #suporte",
        "Descreva seu problema detalhadamente",
        "Interaja com a comunidade e moderadores"
      ]
    },
    {
      title: "E-mail",
      description: "Central de ajuda para questões detalhadas",
      icon: Mail,
      color: "bg-blue-500 hover:bg-blue-600",
      link: "mailto:suporte@onedrip.email",
      availability: "Seg-Sex 9h-18h",
      responseTime: "4-8 horas",
      instructions: [
        "Envie um e-mail para suporte@onedrip.email",
        "Inclua o máximo de detalhes possível",
        "Anexe prints ou arquivos se necessário",
        "Aguarde nossa resposta em até 8 horas úteis"
      ]
    },
    {
      title: "Telefone",
      description: "Suporte por voz para casos urgentes",
      icon: Phone,
      color: "bg-orange-500 hover:bg-orange-600",
      link: "tel:+5564996028022",
      availability: "Seg-Sex 9h-17h",
      responseTime: "Imediato",
      instructions: [
        "Ligue para (64) 9-9602-8022",
        "Tenha em mãos seus dados de acesso",
        "Explique claramente o problema",
        "Siga as orientações do atendente"
      ]
    }
  ];

  const faqItems: FAQItem[] = [
    {
      question: "Como faço para redefinir minha senha?",
      answer: "Acesse a página de login e clique em 'Esqueci minha senha'. Digite seu e-mail e siga as instruções enviadas para sua caixa de entrada."
    },
    {
      question: "Como posso alterar meus dados pessoais?",
      answer: "Entre no seu painel, vá em 'Configurações' > 'Perfil' e edite as informações desejadas. Não se esqueça de salvar as alterações."
    },
    {
      question: "O que fazer se não estou recebendo e-mails do sistema?",
      answer: "Verifique sua caixa de spam/lixo eletrônico. Adicione nosso domínio (@onedrip.email) à sua lista de remetentes confiáveis."
    },
    {
      question: "Como cancelar minha assinatura?",
      answer: "Acesse 'Configurações' > 'entre em contato conosco' para cancelar sua assinatura."
    },
    {
      question: "Posso usar o sistema em dispositivos móveis?",
      answer: "Sim! Nosso sistema é totalmente responsivo e funciona perfeitamente em smartphones e tablets através do navegador."
    },
    {
      question: "Como faço backup dos meus dados?",
      answer: "Vá em 'Configurações' > 'Dados' e clique em 'Exportar dados'. Você receberá um arquivo com todas suas informações."
    }
  ];

  const handleChannelClick = (link: string, title: string) => {
    window.open(link, '_blank');
    toast.success(`Redirecionando para ${title}...`);
  };

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <div className="bg-background/80 backdrop-blur-sm border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center justify-center gap-3">
              <HelpCircle className="h-8 w-8 text-primary" />
              Precisa de Ajuda?
            </h1>
            <p className="text-muted-foreground text-lg">
              Estamos aqui para ajudar você! Escolha o canal de suporte que preferir.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-12">
        {/* Canais de Suporte */}
        <section>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-semibold text-foreground mb-4 flex items-center justify-center gap-2">
              <Headphones className="h-6 w-6 text-primary" />
              Canais de Suporte
            </h2>
            <p className="text-muted-foreground">
              Escolha o canal que melhor atende às suas necessidades
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {supportChannels.map((channel, index) => {
              const IconComponent = channel.icon;
              return (
                <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20">
                  <CardHeader className="text-center pb-4">
                    <div className={`w-16 h-16 rounded-full ${channel.color} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <IconComponent className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-xl">{channel.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {channel.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Disponível:</span>
                      </div>
                      <Badge variant="outline">{channel.availability}</Badge>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Resposta:</span>
                      <Badge variant="secondary">{channel.responseTime}</Badge>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Como usar:</h4>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {channel.instructions.map((instruction, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-primary font-bold">{idx + 1}.</span>
                            <span>{instruction}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Button 
                      onClick={() => handleChannelClick(channel.link, channel.title)}
                      className={`w-full ${channel.color} text-white hover:scale-105 transition-all duration-200`}
                    >
                      Acessar {channel.title}
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* FAQ Section */}
        <section>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-semibold text-foreground mb-4 flex items-center justify-center gap-2">
              <HelpCircle className="h-6 w-6 text-primary" />
              Perguntas Frequentes
            </h2>
            <p className="text-muted-foreground">
              Encontre respostas rápidas para as dúvidas mais comuns
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-4">
            {faqItems.map((item, index) => (
              <Card key={index} className="overflow-hidden">
                <CardHeader 
                  className="cursor-pointer hover:bg-muted/50 transition-colors duration-200"
                  onClick={() => toggleFAQ(index)}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-medium">
                      {item.question}
                    </CardTitle>
                    {expandedFAQ === index ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
                {expandedFAQ === index && (
                  <CardContent className="pt-0">
                    <Separator className="mb-4" />
                    <p className="text-muted-foreground leading-relaxed">
                      {item.answer}
                    </p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </section>

        {/* Call to Action */}
        <section className="text-center py-12">
          <Card className="max-w-2xl mx-auto bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
            <CardContent className="pt-8">
              <h3 className="text-2xl font-semibold mb-4">Ainda precisa de ajuda?</h3>
              <p className="text-muted-foreground mb-6">
                Nossa equipe está sempre pronta para ajudar você. Entre em contato através do canal que preferir!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  onClick={() => handleChannelClick("https://wa.me/5564996028022", "WhatsApp")}
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  WhatsApp Rápido
                </Button>
                <Button 
                  onClick={() => handleChannelClick("https://discord.gg/a3X4DC8rjYp", "Discord")}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white"
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Abrir Ticket Discord
                </Button>
                <Button 
                  onClick={() => handleChannelClick("mailto:suporte@onedrip.email", "E-mail")}
                  variant="outline"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Enviar E-mail
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
};

export default SuportePage;