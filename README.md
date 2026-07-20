# TrackInteligente - Meta Conversions API (CAPI) WhatsApp MVP

Este projeto é um MVP para atribuição e envio de eventos via API de Conversões da Meta (CAPI) focado em vendas pelo WhatsApp.

## Estrutura do Projeto

```text
TrackInteligente/
├── backend/            # API em Node.js/TypeScript
│   ├── Dockerfile
│   └── src/
├── frontend/
│   ├── landing-page/   # Script JS que gera ref_code e injeta no WhatsApp
│   └── admin-dashboard/# Painel administrativo web simples do vendedor
└── docker-compose.yml
```

---

## 🛠️ Como Executar e Testar Localmente

### 1. Requisitos
- [Docker](https://www.docker.com/) e Docker Compose instalados.

### 2. Configurar as Credenciais (.env)
Crie um arquivo `.env` na raiz do projeto ou edite o arquivo `backend/.env` com as suas chaves da Meta:
```ini
DB_PASSWORD=postgres
META_PIXEL_ID=seu_pixel_id
META_ACCESS_TOKEN=seu_access_token_da_meta
# Use para testar na aba "Testar Eventos" do Gerenciador da Meta
META_TEST_EVENT_CODE=
```

### 3. Iniciar os Serviços
Na pasta raiz do projeto, execute o comando:
```bash
docker-compose up -d --build
```
> O banco de dados PostgreSQL é persistente (`postgres_data`) e inicializa a estrutura da tabela `leads_tracking` automaticamente no primeiro boot utilizando o arquivo `./backend/src/database/schema.sql`.

---

## 🚀 Fluxo de Testes do MVP

1. **Simular Clique**: Abra o arquivo `frontend/landing-page/index.html` em seu navegador com parâmetros de simulação na URL:
   `index.html?fbclid=TEST_CLICK_ID_5566&utm_source=instagram&utm_medium=stories`
2. **Atribuição**: O script `tracking.js` irá capturar os parâmetros, salvar o lead anonimamente no backend e gerar um código visual (ex: `REF-1092`). O link do botão de WhatsApp será atualizado automaticamente contendo esse código de referência.
3. **Painel do Vendedor**: Abra o painel `frontend/admin-dashboard/index.html` no navegador:
   - Pesquise pelo código visual (ex: `REF-1092`).
   - Insira o telefone do comprador e selecione o status (ex: **Compra Concluída** com o valor de venda).
   - Clique em **Atualizar & Disparar Evento** para processar os dados sensíveis no backend (com hash SHA-256) e enviá-los diretamente para a Meta CAPI!
