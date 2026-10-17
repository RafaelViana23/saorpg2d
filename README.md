# Pixel Forge — Medieval Studio (React + Vite)

Editor de mapas 2D inspirado em RPG Maker, com UI dark minimalista baseada na referência aprovada.

## Executar

```bash
npm install
npm run dev
```

Abrir o endereço mostrado pelo Vite (geralmente `http://localhost:5173`). Para gerar build: `npm run build`.

## Organização

- `src/main.jsx`: interface React, gerenciamento de projeto, seleção, drag-and-drop, ferramentas, modais, Places, importação/exportação e modo de teste.
- `src/engine.js`: formato de dados, assets de exemplo, renderização Canvas, autotile, iluminação.
- `src/style.css`: design aprovado (preto, bordas finas, pastas expansíveis e miniaturas no próprio menu).

## Funcionalidades

- Cursor acima de Assets; clique no sprite seleciona para pintar; **duplo clique abre modal para renomear**.
- Pastas e subpastas expansíveis, sem painel de pré-visualização duplicado.
- Seleção de objetos no mapa, drag-and-drop com encaixe na grade; botão direito remove.
- Água/caminhos com bordas automáticas, camadas com visibilidade e bloqueio.
- Undo/redo, importação PNG como Data URL, exportação JSON e PNG.
- Places de tamanhos independentes (até 100×26), portais configuráveis, colisões, NPCs e diálogos.
- Modo Play com setas/WASD, espaço para diálogos, dia/tarde/noite e ciclo automático.
- Controle pelo celular via QR Code e canais de presença/broadcast do Supabase Realtime.

## Supabase

O Supabase é obrigatório para autenticação, biblioteca de projetos, saves e controle remoto. Copie `.env.example` para `.env`, informe a URL e a chave publicável do projeto e aplique, em ordem, as migrações de `supabase/migrations`.

O controle remoto usa canais públicos do Supabase Realtime. Eles precisam estar habilitados no projeto para que o navegador do jogo e o celular entrem na mesma sessão.

## Notas para o Codex

Este projeto é uma **base funcional**, não um jogo finalizado. Os sprites internos são placeholders desenhados por Canvas. Prioridades recomendadas:

### Regra obrigatória para criação de assets

- Sempre usar diretamente o PNG fornecido pelo usuário como fonte visual; não redesenhar, regenerar ou reinterpretar os sprites.
- Recortar cada asset pelo contorno real dos pixels visíveis e pela transparência do próprio PNG.
- Nunca separar sprites usando linhas, faixas, grades ou retângulos fixos quando isso puder incluir pedaços de assets vizinhos.
- Cada PNG final deve conter somente um asset completo, sem sobras, linhas, bordas brancas ou fragmentos de outros sprites.
- Remover somente o fundo branco/transparente solicitado, preservando todos os pixels pertencentes ao asset.
- Antes de cadastrar os recortes no editor, conferir visualmente cada PNG individual e corrigir qualquer contaminação entre sprites.

1. Migrar o estado do editor para um reducer e consolidar ações de histórico por gesto (um traço = um undo).
2. Implementar autotile de 8 vizinhos com spritesheets reais; atualmente as bordas são geométricas.
3. Permitir mais de 26 linhas com coordenadas AA, AB etc. e editor de colisão visual.
4. Melhorar os portais: indicadores no mapa, destino por clique, chegada segura e portas vinculadas a edifícios.
5. Adicionar validação robusta de JSON, persistência IndexedDB, testes de interação e tratamento de erros.
6. Suporte a sprite animation frames, câmera no modo Play e NPCs com movimentação.

**Observação:** o JSON exportado inclui imagens PNG importadas como Data URLs, então pode ficar grande.
