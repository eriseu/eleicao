import { Candidatura } from "@/types";

const VPS_API_URL = process.env.NEXT_PUBLIC_VPS_API_URL;

/**
 * Busca os dados de candidaturas da API no VPS para uma lista de IDs de perfis.
 * @param perfilIds - Um array de IDs de perfis de candidatos.
 * @returns Uma promessa que resolve para um array de candidaturas.
 */
export async function fetchCandidaturasFromVPS(perfilIds: string[]) {
  if (!perfilIds || perfilIds.length === 0) return [];

  // Garante o formato correto que o FastAPI espera
  const idsParam = `in.(${perfilIds.join(',')})`;
  
  const response = await fetch(`${process.env.NEXT_PUBLIC_VPS_API_URL}/api/candidaturas?perfil_id=${encodeURIComponent(idsParam)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Falha ao buscar candidaturas do VPS: ${response.statusText}`);
  }

  return await response.json();
}
