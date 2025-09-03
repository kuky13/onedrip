import React from 'react';
import { useNavigate } from 'react-router-dom';
import { OptimizedNotificationPanel } from '@/components/notifications/OptimizedNotificationPanel';
import { Bell, ArrowLeft } from 'lucide-react';

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header com design consistente */}
      <div className="glass-card border-0 shadow-soft">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Botão de voltar */}
              <button
                onClick={handleGoBack}
                className="p-3 bg-gradient-to-br from-muted/10 to-muted/5 rounded-xl shadow-soft border border-muted/20 hover:from-muted/20 hover:to-muted/10 transition-all duration-200 hover:shadow-md"
                aria-label="Voltar"
              >
                <ArrowLeft className="h-6 w-6 text-muted-foreground hover:text-foreground transition-colors" />
              </button>
              
              <div className="p-3 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl shadow-soft border border-primary/20">
                <Bell className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Mensagens
                </h1>
                <p className="text-muted-foreground text-lg">
                  Gerencie suas mensagens e alertas
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Conteúdo principal */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <OptimizedNotificationPanel />
      </div>
    </div>
  );
};

export default NotificationsPage;