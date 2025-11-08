# Documentação Técnica: Migração Formspree para Brevo

## 1. Análise da Implementação Atual

### 1.1 Formulário de Leads - Lumy Cajamar

O formulário atual na página `lumy-cajamar-vendas.html` utiliza o Formspree com as seguintes características:

**Endpoint atual:** `https://formspree.io/f/xpwkazvy`

**Campos do formulário:**
- `fullName` (obrigatório) - Nome completo
- `cpf` (obrigatório) - CPF com validação de dígitos verificadores
- `whatsapp` (obrigatório) - Telefone WhatsApp
- `email` (obrigatório) - Email com validação
- `incomeProfile` (obrigatório) - Perfil de renda (CLT/Autônomo/Servidor)
- `incomeProof` (obrigatório) - Comprovação de renda
- `incomeBRL` (obrigatório) - Renda familiar mensal em BRL
- `cityUf` (obrigatório) - Cidade/UF
- `accelerate` (opcional) - Checkbox para acelerar pré-análise
- `lgpdConsent` (obrigatório) - Consentimento LGPD

**Funcionalidades atuais:**
- Validação em tempo real com máscaras (CPF, telefone, valor monetário)
- Integração com API do IBGE para sugestões de cidades
- Salvamento de rascunho no localStorage
- Feedback visual com estados de loading
- Redirecionamento para página de agradecimento após sucesso

### 1.2 Processo de Envio Atual

```javascript
// Endpoint atual
const ENDPOINT = 'https://formspree.io/f/xpwkazvy';

// Envio usando FormData
const fd = new FormData();
Object.entries(payload).forEach(([k,v])=>{
  fd.append(k, typeof v==='boolean' ? (v? 'true' : 'false') : String(v||''));
});

const res = await fetch(ENDPOINT, { 
  method:'POST', 
  headers:{ 'Accept':'application/json' }, 
  body: fd 
});
```

## 2. Configuração da API do Brevo

### 2.1 Credenciais e Configurações

**API Key:** `<INSERIR_API_KEY>`

**Pipeline:** `BREVO_PIPELINE_LUMY`

**List ID:** `5`

**Nome da Lista:** `Lumy`

### 2.2 Endpoint da API Brevo

```
POST https://api.brevo.com/v3/contacts
```

**Headers necessários:**
```
api-key: <INSERIR_API_KEY>
Content-Type: application/json
```

### 2.3 Estrutura do Payload para Brevo

```json
{
  "email": "email@exemplo.com",
  "attributes": {
    "NOME": "Nome Completo",
    "CPF": "000.000.000-00",
    "WHATSAPP": "(11) 99999-9999",
    "PERFIL_RENDA": "CLT",
    "COMPROVACAO_RENDA": "holerite",
    "RENDA_FAMILIAR": "3500.00",
    "CIDADE_UF": "Cajamar - SP",
    "ACELERAR_ANALISE": "true",
    "ORIGEM": "Lumy Cajamar - Website"
  },
  "listIds": [5],
  "updateEnabled": true
}
```

## 3. Implementação do Novo Sistema

### 3.1 Alterações no JavaScript

Substituir a função `submitForm()` para usar a API do Brevo:

```javascript
async function submitForm() {
  clearErrors();
  if(!validateAll()) return;
  
  submitBtn.classList.add('loading');
  submitBtn.textContent = 'Enviando...';
  setStatus('');

  try {
    // Preparar payload para Brevo
    const payload = {
      email: fields.email.value.trim(),
      attributes: {
        NOME: fields.fullName.value.trim(),
        CPF: fields.cpf.value.trim(),
        WHATSAPP: fields.whatsapp.value.trim(),
        PERFIL_RENDA: fields.incomeProfile.value,
        COMPROVACAO_RENDA: fields.incomeProof.value,
        RENDA_FAMILIAR: parseBRL(fields.incomeBRL.value).toString(),
        CIDADE_UF: fields.cityUf.value.trim(),
        ACELERAR_ANALISE: fields.accelerate.checked ? 'true' : 'false',
        ORIGEM: 'Lumy Cajamar - Website'
      },
      listIds: [5],
      updateEnabled: true
    };

    // Enviar para Brevo
    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'api-key': '<INSERIR_API_KEY>',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Erro ao enviar para Brevo');
    }

    // Sucesso
    localStorage.removeItem(DRAFT_KEY);
    form.reset();
    setStatus('✅ Dados enviados com sucesso. Em breve entraremos em contato.', 'success');
    
    // Redirecionar para página de agradecimento
    setTimeout(() => { 
      window.location.href = '/obrigado.html'; 
    }, 600);
    
  } catch (err) {
    console.error('Erro ao enviar para Brevo:', err);
    
    // Salvar rascunho em caso de erro
    try { 
      const draftData = {
        email: fields.email.value.trim(),
        attributes: {
          NOME: fields.fullName.value.trim(),
          CPF: fields.cpf.value.trim(),
          WHATSAPP: fields.whatsapp.value.trim(),
          PERFIL_RENDA: fields.incomeProfile.value,
          COMPROVACAO_RENDA: fields.incomeProof.value,
          RENDA_FAMILIAR: parseBRL(fields.incomeBRL.value).toString(),
          CIDADE_UF: fields.cityUf.value.trim(),
          ACELERAR_ANALISE: fields.accelerate.checked ? 'true' : 'false',
          ORIGEM: 'Lumy Cajamar - Website'
        }
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
    } catch (e) { 
      /* ignore */ 
    }
    
    setStatus('❌ Não foi possível enviar agora. Seus dados foram salvos localmente.', 'error');
  } finally {
    submitBtn.classList.remove('loading');
    submitBtn.textContent = 'Enviar';
  }
}
```

### 3.2 Tratamento de Respostas da API

**Sucesso (201):**
- Contato criado/atualizado com sucesso
- Limpar formulário e rascunho
- Mostrar mensagem de sucesso
- Redirecionar para página de agradecimento

**Erro 400 (Bad Request):**
- Email inválido ou já existe
- Mostrar mensagem específica ao usuário

**Erro 401 (Unauthorized):**
- API key inválida
- Mostrar mensagem genérica e registrar erro

**Erro 429 (Too Many Requests):**
- Rate limit excedido
- Mostrar mensagem para tentar novamente mais tarde

**Outros erros (500+):**
- Erro do servidor
- Salvar rascunho e mostrar mensagem de erro

## 4. Testes e Validação

### 4.1 Testes de Funcionalidade

1. **Teste de envio bem-sucedido:**
   - Preencher todos os campos obrigatórios
   - Verificar redirecionamento para página de agradecimento
   - Confirmar criação do contato no Brevo

2. **Teste de email duplicado:**
   - Enviar formulário com email já existente
   - Verificar atualização dos dados (updateEnabled: true)

3. **Teste de validação:**
   - Testar validação de CPF com números inválidos
   - Testar validação de email com formatos inválidos
   - Verificar campos obrigatórios

4. **Teste de erro de rede:**
   - Simular falha de conexão
   - Verificar salvamento de rascunho
   - Testar recuperação de rascunho

### 4.2 Validação no Console do Navegador

```javascript
// Testar conexão com Brevo
fetch('https://api.brevo.com/v3/contacts', {
  method: 'POST',
  headers: {
    'api-key': '<INSERIR_API_KEY>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'teste@exemplo.com',
    attributes: {
      NOME: 'Teste',
      ORIGEM: 'Teste - Console'
    },
    listIds: [5]
  })
}).then(res => console.log('Status:', res.status))
.catch(err => console.error('Erro:', err));
```

## 5. Manutenção e Monitoramento

### 5.1 Logs e Monitoramento

- Implementar console.log para debugging em ambiente de desenvolvimento
- Monitorar taxa de sucesso de envios
- Verificar logs de erro no console do navegador

### 5.2 Atualização de Credenciais

- API key deve ser armazenada de forma segura
- Considerar uso de variáveis de ambiente para produção
- Atualizar documentação quando houver mudanças nas credenciais

### 5.3 Backup do Código Original

Manter backup da implementação original do Formspree para referência futura ou rollback se necessário.

## 6. Status da Implementação

✅ **Migração concluída com sucesso!**

A implementação da migração do Formspree para o Brevo foi concluída na página `lumy-cajamar-vendas.html` com as seguintes alterações:

### 6.1 Alterações Realizadas

1. **Adicionadas constantes do Brevo:**
   - `BREVO_ENDPOINT`: URL da API do Brevo
   - `BREVO_API_KEY`: Chave de API fornecida

2. **Função submitForm() atualizada:**
   - Substituído envio para Formspree por envio para Brevo
   - Implementado payload específico para API do Brevo
   - Adicionado tratamento de erros melhorado
   - Mantido salvamento de rascunho em caso de erro

3. **Estrutura de dados mapeada:**
   - NOME → fullName
   - CPF → cpf
   - WHATSAPP → whatsapp
   - PERFIL_RENDA → incomeProfile
   - COMPROVACAO_RENDA → incomeProof
   - RENDA_FAMILIAR → incomeBRL (convertido para número)
   - CIDADE_UF → cityUf
   - ACELERAR_ANALISE → accelerate (boolean)
   - ORIGEM → "Lumy Cajamar - Website"

### 6.2 Testes Recomendados

Ant de colocar em produção, testar:

1. **Envio bem-sucedido com dados completos**
2. **Validação de campos obrigatórios**
3. **Tratamento de email duplicado**
4. **Salvamento e recuperação de rascunho**
5. **Redirecionamento para página de agradecimento**

### 6.3 Próximos Passos

1. **Migrar outros formulários:**
   - Página principal (index.html)
   - Página de consórcios (consorcios.html)
   - Outros formulários de contato

2. **Implementar funcionalidades avançadas:**
   - Webhooks para notificações em tempo real
   - Integração com CRM interno
   - Dashboard de analytics

3. **Otimizações:**
   - Implementar rate limiting no cliente
   - Adicionar retry automático em caso de falha
   - Cache de respostas para melhor performance
