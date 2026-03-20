// Interface para publicações externas
export interface Publication {
  id: string;
  category: string;
  title: string;
  source: string;
  description: string;
  url: string;
  dateAdded?: string;
}

// Publicações externas curadas manualmente
export const publicationsData: Publication[] = [
  // ==========================================
  // JURISPRUDÊNCIA E BIOÉTICA - MARÇO 2026
  // ==========================================
  {
    id: "2026-03-20-001",
    category: "Jurisprudência Europeia (TEDH)",
    title: "Sentença Histórica: Pindo Mulla v. Espanha",
    source: "European Court of Human Rights (Grand Chamber)",
    description: "Decisão unânime que reafirma o direito absoluto de um adulto competente recusar transfusões de sangue, condenando falhas no sistema de saúde em respeitar diretivas antecipadas.",
    url: "https://hudoc.echr.coe.int/eng?i=001-236065",
    dateAdded: "2026-03-20"
  },
  {
    id: "2026-03-20-002",
    category: "Bioética e Políticas de Saúde",
    title: "Autonomia do Paciente e PBM: Lições do Caso Pindo Mulla",
    source: "Blood Transfusion Journal",
    description: "Análise que demonstra como o respeito pela recusa informada depende da prontidão do sistema de saúde (PBM) e não de decisões judiciais ad hoc.",
    url: "https://www.bloodtransfusion.it/bt/article/view/1292",
    dateAdded: "2026-03-20"
  },

  // ==========================================
  // BIOTECNOLOGIA E SANGUE ARTIFICIAL
  // ==========================================
  {
    id: "art-001",
    category: "Biotecnologia e Sangue Artificial",
    title: "Ensaios de Fase I com Vesículas de Hemoglobina",
    source: "Nara Medical University (Japão)",
    description: "Início dos ensaios em humanos para o primeiro substituto de sangue universal. O produto utiliza vesículas de hemoglobina, é estável por 2 anos à temperatura ambiente e não requer compatibilidade de grupo sanguíneo.",
    url: "https://trial.medpath.com/news/6f9dac528c3e9037/japan-launches-world-s-first-clinical-trials-for-artificial-blood-in-2025"
  },
  {
    id: "art-002",
    category: "Biotecnologia e Sangue Artificial",
    title: "ErythroMer - Nanotecnologia Liofilizada (Sangue em Pó)",
    source: "University of Maryland (EUA)",
    description: "Avanços no financiamento e desenvolvimento do ErythroMer, um substituto sanguíneo liofilizado (em pó) que mimetiza a função dos glóbulos vermelhos, concebido para ressuscitação imediata em cenários de trauma extremo.",
    url: "https://www.medschool.umaryland.edu/news/2023/artificial-blood-product-one-step-closer-to-reality-with-46-million-in-federal-funding.html"
  },

  // ==========================================
  // CIRURGIAS DE ALTA COMPLEXIDADE E PBM
  // ==========================================
  {
    id: "cir-001",
    category: "Cirurgias de Alta Complexidade e PBM",
    title: "Primeiro Transplante Combinado Coração-Fígado Sem Sangue",
    source: "Tampa General Hospital",
    description: "Sucesso clínico documentado do primeiro transplante simultâneo destes dois órgãos realizado inteiramente sem transfusão alogénica, utilizando hemostasia avançada e recuperação celular (Cell Saver).",
    url: "https://www.tgh.org/news/tgh-press-releases/2025/july/tgh-usf-health-successfully-perform-world-first-recorded-bloodless-heart-liver-transplant-surgery"
  },
  {
    id: "cir-002",
    category: "Cirurgias de Alta Complexidade e PBM",
    title: "Transplante Cardíaco Sem Transfusão: Estudo Longitudinal de 11 Anos",
    source: "PubMed",
    description: "Revisão retrospectiva que confirma que os pacientes que recusam sangue têm taxas de sobrevivência e desfechos clínicos idênticos aos submetidos a métodos convencionais, validando a eficácia dos protocolos PBM.",
    url: "https://pubmed.ncbi.nlm.nih.gov/40935286/"
  },

  // ==========================================
  // DIRETRIZES, CONSENSOS E GESTÃO CLÍNICA
  // ==========================================
  {
    id: "dir-001",
    category: "Diretrizes e Consensos Clínicos",
    title: "Guia Global para Implementação do Patient Blood Management (PBM)",
    source: "Organização Mundial da Saúde (OMS)",
    description: "O documento definitivo da OMS que estabelece o PBM como um padrão de segurança global. Foca-se nos três pilares: otimização da hematopoiese, minimização de perdas sanguíneas e otimização da tolerância fisiológica à anemia.",
    url: "https://www.who.int/publications/i/item/9789240104662"
  },
  {
    id: "dir-002",
    category: "Diretrizes e Consensos Clínicos",
    title: "Validação da Escala VIBe na Gestão de Sangramento Intraoperatório",
    source: "HTCT Journal (Hematology, Transfusion and Cell Therapy)",
    description: "Estudo sobre a Visual Intraoperative Bleeding Scale (VIBe), uma escala visual validada que permite aos cirurgiões padronizar e quantificar o sangramento em tempo real, agilizando o uso de selantes farmacológicos.",
    url: "https://www.htct.com.br/pt-when-innovation-meets-patient-blood-articulo-S2531137924003080"
  },
  {
    id: "dir-003",
    category: "Diretrizes e Consensos Clínicos",
    title: "Novas Diretrizes para Transfusão de Plaquetas: Menos é Mais",
    source: "NYSORA",
    description: "Recomendações recentes que promovem uma abordagem altamente restritiva para a transfusão de plaquetas, priorizando o uso de ácido tranexâmico e concentrados de fibrinogénio guiados por tromboelastometria.",
    url: "https://www.nysora.com/pt/not%C3%ADcias-sobre-educa%C3%A7%C3%A3o/novas-diretrizes-para-transfus%C3%A3o-de-plaquetas%3A-menos-%C3%A9-mais/"
  }
];

// Converter publicações para formato de artigo
export function convertPublicationsToArticles(): {
  id: string;
  title: string;
  url: string;
  source: string;
  snippet: string;
  publicationDate: string | null;
  dateFound: string;
  isExternal: boolean;
  category: string;
}[] {
  return publicationsData.map(pub => ({
    id: pub.id,
    title: pub.title,
    url: pub.url,
    source: pub.source,
    snippet: pub.description,
    publicationDate: null,
    dateFound: new Date().toISOString(),
    isExternal: true,
    category: pub.category
  }));
}
