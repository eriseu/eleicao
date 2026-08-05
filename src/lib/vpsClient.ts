import { Candidatura } from "@/types";

const VPS_API_URL = process.env.NEXT_PUBLIC_VPS_API_URL || 'https://api.centraleti.com.br';

/**
 * Busca os dados de candidaturas da API no VPS para uma lista de IDs de perfis.
 * @param perfilIds - Um array de IDs de perfis de candidatos.
 * @returns Uma promessa que resolve para um array de candidaturas.
 */
export async function fetchCandidaturasFromVPS(perfilIds: string[]) {
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
    
    if (!response.ok) return [];
    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar candidaturas da VPS:', error);
    return [];
  }
}
