# Evidências dos Testes Pré-Venda

Pasta para artefatos de cada execução dos 48 testes definidos em [`../PRE_LAUNCH_TEST_SPEC.md`](../PRE_LAUNCH_TEST_SPEC.md).

## Convenção de nomes

```
<id>-<slug-curto>.<ext>
```

Exemplos:
- `1.2-bloqueio-login.png`
- `2.1-rls-regression.json`
- `3.7-headers-securityheaders.pdf`
- `5.3-gdpr-delete.md`

## Tipos aceitos

- `.png` / `.jpg` — screenshots
- `.json` — respostas de API, logs estruturados
- `.md` — anotações, transcrições
- `.pdf` — relatórios externos (pentest, securityheaders)
- `.har` — capturas de rede

## Boas práticas

- Sempre inclua timestamp e identidade do executor no arquivo (ou nas notas do painel).
- Nunca commitar evidências contendo dados pessoais reais — anonimizar antes.
- Para evidências grandes (> 5MB), subir no Storage e linkar via signed URL no campo `evidence_url`.
