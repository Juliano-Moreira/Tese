# Metodologia Preditiva e Otimizada para a Gestão Sustentável de Energia em Ecossistemas de Troca de Baterias para Veículos Elétricos

Este repositório reúne os arquivos de resultados gerados nos estudos de caso da tese. Os dados consolidados (finais) de cada estudo de caso estão organizados por pasta, e há também arquivos com as execuções parciais do fluxo interno do **MPC (Model Predictive Control)**.

## Estrutura do repositório

```
Resultados/
 ├─ Estudo de Caso 1/
 │   └─ Resultado Final/
 │       ├─ ID728_... .xlsx
 │       └─ ...
 │   └─ Resultados MPC/
 │       ├─ ID728_... .xlsx
 │       └─ ...
 ├─ Estudo de Caso 2/
 │   └─ Resultado Final/
 │       └─ ...
 │   └─ Resultados MPC/
 │       └─ ...
 ├─ ...
Códigos/
  └─ aguardando_definição_com_banca.md
```

* **Resultados Finais:** os arquivos `.xlsx` em `Resultados/Estudo de Caso N/Resultado Final/` são os dados finais usados nas análises e figuras.
* **Execuções parciais do MPC:** arquivos `.xlsx` em `Resultados/Estudo de Caso N/Resultados MPC/` registram o passo a passo do fluxo interno do MPC (séries intermediárias por período, decisões por slot, etc.).
> Observação: em alguns casos, há arquivos com sufixo `_RASP`, indicando execuções realizadas em Raspberry Pi (comparações de desempenho/portabilidade).

## 📈 Painel de Resultados Interativo
Você pode explorar, filtrar e comparar as séries diretamente no navegador usando o **Painel de Resultados Interativo**:

👉 **Painel de Resultados Interativo:** [https://juliano-moreira.github.io/Tese/](https://juliano-moreira.github.io/Tese/)

Recursos do painel:
* Seleção do *Estudo de Caso* e das execuções (agrupadas por cenário).
* Exibição/ocultação de séries por checkbox.
* Legenda adaptativa, eixo superior de horas, *tooltips* e exportação de figura (Plotly).
* Seções auxiliares:
  * **Resultados das execuções** (tabela consolidada por estudo).
  * **Chegadas de requisições de baterias** (gráfico e tabela).
* *Deep-links* (URL com parâmetros) para abrir o painel já configurado:
  * `?case=2` → abre o Estudo de Caso 2
  * `?runs=ID728_MOEAD_H_P1_RD0_G20;ID728_PLIM_P1_RD0` → carrega execuções específicas

## Como usar os dados
* Baixe qualquer `.xlsx` em `Resultado Final/` para reproduzir as análises.


