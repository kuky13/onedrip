/**
 * Componente de Headers de Segurança
 * OneDrip - CSP e Meta Security Tags
 */

import { useEffect, useRef } from 'react';

// Flag global para evitar múltiplos overrides
let consoleErrorOverridden = false;
let originalConsoleError: typeof console.error | null = null;

export const SecurityHeaders = () => {
  const isInitialized = useRef(false);

  useEffect(() => {
    // Evitar múltiplas inicializações
    if (isInitialized.current) return;
    isInitialized.current = true;
    // Configurar Content Security Policy
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://oghjlypdnmqecaavekyr.supabase.co wss://oghjlypdnmqecaavekyr.supabase.co https://api.stripe.com",
      "frame-src 'self' https://www.youtube.com https://www.google.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests"
    ];

    // Aplicar CSP via meta tag
    let cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (!cspMeta) {
      cspMeta = document.createElement('meta');
      cspMeta.setAttribute('http-equiv', 'Content-Security-Policy');
      document.head.appendChild(cspMeta);
    }
    cspMeta.setAttribute('content', cspDirectives.join('; '));

    // Meta tags de segurança adicionais
    const securityMetas = [
      { name: 'referrer', content: 'strict-origin-when-cross-origin' },
      { name: 'robots', content: 'noindex, nofollow' }, // Pode ser ajustado conforme necessário
      { 'http-equiv': 'X-Content-Type-Options', content: 'nosniff' },
      { 'http-equiv': 'X-Frame-Options', content: 'DENY' },
      { 'http-equiv': 'X-XSS-Protection', content: '1; mode=block' },
      { 'http-equiv': 'Permissions-Policy', content: 'camera=(), microphone=(), geolocation=()' }
    ];

    securityMetas.forEach(meta => {
      const identifier = meta.name || meta['http-equiv'];
      let existingMeta = document.querySelector(`meta[${meta.name ? 'name' : 'http-equiv'}="${identifier}"]`);
      
      if (!existingMeta) {
        existingMeta = document.createElement('meta');
        if (meta.name) {
          existingMeta.setAttribute('name', meta.name);
        } else if (meta['http-equiv']) {
          existingMeta.setAttribute('http-equiv', meta['http-equiv']);
        }
        document.head.appendChild(existingMeta);
      }
      
      existingMeta.setAttribute('content', meta.content);
    });

    // Configurar headers de performance e segurança
    if ('serviceWorker' in navigator) {
      // Registrar service worker para cache seguro
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Falha silenciosa
      });
    }

    // Configurações de segurança do localStorage
    try {
      // Limpar dados sensíveis antigos, mas preservar tokens de autenticação do Supabase
      const sensitiveKeys = Object.keys(localStorage).filter(key => 
        (key.includes('password') || 
         key.includes('token') ||
         key.includes('secret')) &&
        !key.includes('sb-') && // Preservar tokens do Supabase
        !key.includes('supabase') // Preservar dados do Supabase
      );
      
      sensitiveKeys.forEach(key => {
        localStorage.removeItem(key);
      });
    } catch {
      // Falha silenciosa
    }

    // Detectar tentativas de XSS - apenas uma vez
    if (!consoleErrorOverridden) {
      originalConsoleError = console.error;
      consoleErrorOverridden = true;
      
      console.error = (...args) => {
        try {
          const message = args.join(' ');
          
          // Ignorar warnings do React/Sonner para evitar loops
          if (message.includes('Cannot update a component') || 
              message.includes('setState') ||
              message.includes('Sonner') ||
              message.includes('Toast')) {
            if (originalConsoleError) {
              originalConsoleError.apply(console, args);
            }
            return;
          }
          
          // Detectar apenas XSS real
          if (message.includes('script') || message.includes('eval') || message.includes('javascript:')) {
            // Log potencial tentativa de XSS de forma assíncrona
            setTimeout(() => {
              fetch('/api/security-log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'POTENTIAL_XSS',
                  message,
                  timestamp: new Date().toISOString(),
                  userAgent: navigator.userAgent
                })
              }).catch(() => {}); // Falha silenciosa
            }, 0);
          }
          
          if (originalConsoleError) {
            originalConsoleError.apply(console, args);
          }
        } catch (error) {
          // Fallback para console original em caso de erro
          if (originalConsoleError) {
            originalConsoleError.apply(console, args);
          }
        }
      };
    }

    return () => {
      // Cleanup apenas se este componente foi o responsável pelo override
      if (consoleErrorOverridden && originalConsoleError) {
        console.error = originalConsoleError;
        consoleErrorOverridden = false;
        originalConsoleError = null;
      }
    };
  }, []);

  return null; // Componente só para efeitos colaterais
};

export default SecurityHeaders;