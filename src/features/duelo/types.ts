// features/duelo/types.ts
export interface Proposta {
  id: string;
  candidatoId: string;
  candidatoNome: string;
  fotoUrl?: string;
  texto: string;
  partido: string;
}

export interface RodadaDuelo {
  id: string;
  opcaoA: Proposta;
  opcaoB: Proposta;
}

export interface EstadoDuelo {
  rodadas: RodadaDuelo[];
  rodadaAtualIndex: number;
  votos: Record<string, string>; // { [rodadaId]: propostaIdEscolhida }
}
