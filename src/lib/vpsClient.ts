import { Candidatura } from "@/types";

const VPS_API_URL = process.env.NEXT_PUBLIC_VPS_API_URL;

/**
 * Busca os dados de candidaturas da API no VPS para uma lista de IDs de perfis.
 * @param perfilIds - Um array de IDs de perfis de candidatos.
 * @returns Uma promessa que resolve para um array de candidaturas.
 */
export async function fetchCandidaturasFromVPS(perfilIds: string[]) {
  if (!perfilIds || perfilIds.length === 0) return [];

  try {
    // Em vez de chamar api.centraleti.br direto do browser (o que causa ERR_CONNECTION_CLOSED),
    // chamamos a rota interna ou a API configurada via variável pública correta.
    const baseUrl = process.env.NEXT_PUBLIC_VPS_API_URL || '';
    const response = await fetch(`${baseUrl}/api/candidaturas?perfil_id=in.(${perfilIds.join(',')})`);
    
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar candidaturas da VPS:', error);
    return [];
  }
}
