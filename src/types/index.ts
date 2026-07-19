export interface Candidatura {
  sq_candidato: number; // bigint no banco
  perfil_id: string;
  nome_urna?: string;
  partido?: string;
  cargo: string;
  uf: string;
  municipio: string;
  ano_eleicao: number;
  created_at: string;
  foto?: string | null; // Caso você guarde o nome do arquivo ou caminho
}

export interface Candidato {
  id: string; // uuid
  cpf: string;
  titulo_eleitoral: string;
  nome_completo: string;
  elo_score: number;
  matches_count: number;
  created_at: string;
  nome_urna?: string;
  partido?: string;
  cargo?: string;
  uf?: string;
  municipio?: string;
  foto?: string | null;
  ano?: number;
  sg_partido?: string;
  // Relacionamento com a candidatura mais recente trazida pelo backend
  ultima_candidatura?: Candidatura | null;
}