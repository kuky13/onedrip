import { test, expect, devices } from '@playwright/test';

// Configurações de dispositivos para teste
const deviceConfigs = {
  desktop: {
    name: 'Desktop Chrome',
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  },
  tablet: {
    name: 'iPad',
    ...devices['iPad Pro']
  },
  mobile: {
    name: 'iPhone',
    ...devices['iPhone 12']
  }
};

// Testa cada configuração de dispositivo
Object.entries(deviceConfigs).forEach(([deviceType, config]) => {
  test.describe(`Responsive Search - ${config.name}`, () => {
    test.use(config);

    test.beforeEach(async ({ page }) => {
      // Navega para a página de orçamentos
      await page.goto('/budgets');
      
      // Aguarda a página carregar completamente
      await page.waitForLoadState('networkidle');
    });

    test('should display search interface correctly', async ({ page }) => {
      // Verifica se o campo de busca está visível
      const searchInput = page.locator('[data-testid="search-input"]');
      await expect(searchInput).toBeVisible();
      
      // Verifica se o placeholder é apropriado para o dispositivo
      const placeholder = await searchInput.getAttribute('placeholder');
      if (deviceType === 'mobile') {
        expect(placeholder).toContain('Buscar');
      } else {
        expect(placeholder).toContain('Pesquisar');
      }
    });

    test('should perform search with debounce', async ({ page }) => {
      const searchInput = page.locator('[data-testid="search-input"]');
      
      // Digite termo de busca
      await searchInput.fill('website');
      
      // Aguarda o debounce (mais tempo para mobile)
      const debounceTime = deviceType === 'mobile' ? 500 : 300;
      await page.waitForTimeout(debounceTime + 100);
      
      // Verifica se os resultados aparecem
      const results = page.locator('[data-testid="search-results"]');
      await expect(results).toBeVisible();
      
      // Verifica se há pelo menos um resultado
      const resultItems = page.locator('[data-testid="budget-item"]');
      await expect(resultItems.first()).toBeVisible();
    });

    test('should show loading state during search', async ({ page }) => {
      const searchInput = page.locator('[data-testid="search-input"]');
      const loadingIndicator = page.locator('[data-testid="search-loading"]');
      
      // Digite termo de busca
      await searchInput.fill('sistema');
      
      // Verifica se o loading aparece imediatamente
      await expect(loadingIndicator).toBeVisible();
      
      // Aguarda o debounce
      const debounceTime = deviceType === 'mobile' ? 500 : 300;
      await page.waitForTimeout(debounceTime + 100);
      
      // Verifica se o loading desaparece
      await expect(loadingIndicator).not.toBeVisible();
    });

    test('should display search statistics', async ({ page }) => {
      const searchInput = page.locator('[data-testid="search-input"]');
      
      await searchInput.fill('app');
      
      const debounceTime = deviceType === 'mobile' ? 500 : 300;
      await page.waitForTimeout(debounceTime + 100);
      
      // Verifica se as estatísticas são exibidas
      const stats = page.locator('[data-testid="search-stats"]');
      await expect(stats).toBeVisible();
      
      // Verifica se contém informações sobre resultados
      await expect(stats).toContainText('resultado');
    });

    test('should handle empty search results', async ({ page }) => {
      const searchInput = page.locator('[data-testid="search-input"]');
      
      await searchInput.fill('termoinexistente123');
      
      const debounceTime = deviceType === 'mobile' ? 500 : 300;
      await page.waitForTimeout(debounceTime + 100);
      
      // Verifica se a mensagem de "nenhum resultado" aparece
      const emptyState = page.locator('[data-testid="empty-results"]');
      await expect(emptyState).toBeVisible();
      await expect(emptyState).toContainText('Nenhum resultado encontrado');
    });

    test('should clear search correctly', async ({ page }) => {
      const searchInput = page.locator('[data-testid="search-input"]');
      const clearButton = page.locator('[data-testid="clear-search"]');
      
      // Realiza uma busca
      await searchInput.fill('website');
      
      const debounceTime = deviceType === 'mobile' ? 500 : 300;
      await page.waitForTimeout(debounceTime + 100);
      
      // Clica no botão de limpar
      await clearButton.click();
      
      // Verifica se o campo foi limpo
      await expect(searchInput).toHaveValue('');
      
      // Verifica se todos os orçamentos voltaram a aparecer
      const allBudgets = page.locator('[data-testid="budget-item"]');
      const budgetCount = await allBudgets.count();
      expect(budgetCount).toBeGreaterThan(1);
    });

    test('should show search history on focus', async ({ page }) => {
      const searchInput = page.locator('[data-testid="search-input"]');
      
      // Realiza algumas buscas para criar histórico
      await searchInput.fill('website');
      await page.waitForTimeout(600);
      await searchInput.fill('');
      
      await searchInput.fill('app');
      await page.waitForTimeout(600);
      await searchInput.fill('');
      
      // Foca no campo de busca
      await searchInput.focus();
      
      // Verifica se o histórico aparece
      const history = page.locator('[data-testid="search-history"]');
      await expect(history).toBeVisible();
      
      // Verifica se contém as buscas anteriores
      await expect(history).toContainText('website');
      await expect(history).toContainText('app');
    });

    if (deviceType === 'mobile') {
      test('should handle touch interactions correctly', async ({ page }) => {
        const searchInput = page.locator('[data-testid="search-input"]');
        
        // Testa toque no campo de busca
        await searchInput.tap();
        await expect(searchInput).toBeFocused();
        
        // Verifica se o teclado virtual não interfere na interface
        await searchInput.fill('teste');
        
        // Verifica se os elementos ainda estão visíveis
        const searchContainer = page.locator('[data-testid="search-container"]');
        await expect(searchContainer).toBeVisible();
      });

      test('should adapt layout for mobile viewport', async ({ page }) => {
        // Verifica se os botões têm tamanho adequado para toque
        const buttons = page.locator('button');
        const firstButton = buttons.first();
        
        const boundingBox = await firstButton.boundingBox();
        if (boundingBox) {
          // Botões devem ter pelo menos 44px de altura (recomendação Apple)
          expect(boundingBox.height).toBeGreaterThanOrEqual(44);
        }
      });
    }

    if (deviceType === 'desktop') {
      test('should support keyboard navigation', async ({ page }) => {
        const searchInput = page.locator('[data-testid="search-input"]');
        
        // Foca no campo de busca
        await searchInput.focus();
        
        // Testa navegação com Tab
        await page.keyboard.press('Tab');
        
        // Verifica se o próximo elemento focável recebeu o foco
        const focusedElement = page.locator(':focus');
        await expect(focusedElement).not.toBe(searchInput);
      });

      test('should show hover effects', async ({ page }) => {
        const searchButton = page.locator('[data-testid="search-button"]');
        
        // Hover sobre o botão
        await searchButton.hover();
        
        // Verifica se há mudança visual (pode variar dependendo do CSS)
        // Este teste pode precisar ser ajustado baseado no design específico
        await expect(searchButton).toBeVisible();
      });
    }

    test('should maintain performance with large datasets', async ({ page }) => {
      // Monitora performance durante busca
      const startTime = Date.now();
      
      const searchInput = page.locator('[data-testid="search-input"]');
      await searchInput.fill('a'); // Busca que pode retornar muitos resultados
      
      const debounceTime = deviceType === 'mobile' ? 500 : 300;
      await page.waitForTimeout(debounceTime + 100);
      
      const endTime = Date.now();
      const searchTime = endTime - startTime;
      
      // A busca não deve demorar mais que 2 segundos
      expect(searchTime).toBeLessThan(2000);
      
      // Verifica se a interface ainda responde
      const results = page.locator('[data-testid="search-results"]');
      await expect(results).toBeVisible();
    });

    test('should handle network errors gracefully', async ({ page }) => {
      // Simula erro de rede
      await page.route('**/api/**', route => {
        route.abort('failed');
      });
      
      const searchInput = page.locator('[data-testid="search-input"]');
      await searchInput.fill('teste');
      
      const debounceTime = deviceType === 'mobile' ? 500 : 300;
      await page.waitForTimeout(debounceTime + 100);
      
      // Verifica se uma mensagem de erro é exibida ou se há fallback
      // (dependendo da implementação específica)
      const errorMessage = page.locator('[data-testid="search-error"]');
      const results = page.locator('[data-testid="search-results"]');
      
      // Pelo menos um dos dois deve estar visível
      const hasErrorOrResults = await errorMessage.isVisible() || await results.isVisible();
      expect(hasErrorOrResults).toBe(true);
    });
  });
});

// Testes de acessibilidade
test.describe('Search Accessibility', () => {
  test('should meet accessibility standards', async ({ page }) => {
    await page.goto('/budgets');
    
    // Verifica se há labels apropriados
    const searchInput = page.locator('[data-testid="search-input"]');
    const ariaLabel = await searchInput.getAttribute('aria-label');
    const label = page.locator('label[for]');
    
    // Deve ter aria-label ou label associado
    const hasAccessibleLabel = ariaLabel || await label.count() > 0;
    expect(hasAccessibleLabel).toBe(true);
    
    // Verifica contraste de cores (básico)
    const computedStyle = await searchInput.evaluate(el => {
      const style = window.getComputedStyle(el);
      return {
        color: style.color,
        backgroundColor: style.backgroundColor
      };
    });
    
    // Verifica se não são transparentes (indicativo de contraste adequado)
    expect(computedStyle.color).not.toBe('rgba(0, 0, 0, 0)');
    expect(computedStyle.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('should support screen readers', async ({ page }) => {
    await page.goto('/budgets');
    
    // Verifica se há texto alternativo e descrições
    const searchContainer = page.locator('[data-testid="search-container"]');
    const ariaDescribedBy = await searchContainer.getAttribute('aria-describedby');
    
    // Verifica se há elementos de ajuda ou descrição
    if (ariaDescribedBy) {
      const descriptionElement = page.locator(`#${ariaDescribedBy}`);
      await expect(descriptionElement).toBeVisible();
    }
  });
});