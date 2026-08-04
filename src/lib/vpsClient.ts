import { Candidatura } from "@/types";

const VPS_API_URL = process.env.NEXT_PUBLIC_VPS_API_URL;

/**
 * Busca os dados de candidaturas da API no VPS para uma lista de IDs de perfis.
 * @param perfilIds - Um array de IDs de perfis de candidatos.
 * @returns Uma promessa que resolve para um array de candidaturas.
 */
export async function fetchCandidaturasFromVPS(perfilIds: string[]): Promise<Candidatura[]> {
  if (!VPS_API_URL) {
    console.error("A variável de ambiente NEXT_PUBLIC_VPS_API_URL não está definida.");
    return [];
  }

  if (!perfilIds || perfilIds.length === 0) {
    return [];
  }

  try {
    const response = await fetch(`${VPS_API_URL}/candidaturas?perfil_id=in.(${perfilIds.join(',')})`);
    if (!response.ok) {
      throw new Error(`Falha ao buscar candidaturas do VPS: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Erro na comunicação com a API de candidaturas do VPS:", error);
    return [];
  }
}