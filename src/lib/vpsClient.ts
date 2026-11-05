import { Candidatura } from "@/types";

const VPS_API_URL = process.env.NEXT_PUBLIC_VPS_API_URL || 'https://api.centraleti.com.br';

type FetchCandidaturasOptions = {
  throwOnError?: boolean;
};

/**
 * Busca os dados de candidaturas da API no VPS para uma lista de IDs de perfis.
 * @param perfilIds - Um array de IDs de perfis de candidatos.
 * @returns Uma promessa que resolve para um array de candidaturas.
 */
export async function fetchCandidaturasFromVPS(
  perfilIds: string[],
  options: FetchCandidaturasOptions = {},
): Promise<Candidatura[]> {
  if (!perfilIds || perfilIds.length === 0) return [];

  try {
    const response = await fetch(`${VPS_API_URL}/api/candidaturas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        perfil_id: `in.(${perfilIds.join(',')})`
      })
    });
    
    if (!response.ok) {
      const error = new Error(`VPS candidaturas respondeu HTTP ${response.status}`);
      if (options.throwOnError) throw error;
      console.error('Erro ao buscar candidaturas da VPS:', error.message);
      return [];
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      const error = new Error('VPS candidaturas retornou um formato inválido');
      if (options.throwOnError) throw error;
      console.error('Erro ao buscar candidaturas da VPS:', error.message);
      return [];
    }

    return data as Candidatura[];
  } catch (error) {
    console.error('Erro ao buscar candidaturas da VPS:', error);
    if (options.throwOnError) throw error;
    return [];
  }
}
