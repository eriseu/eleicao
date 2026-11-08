import { getVpsApiUrl } from '@/lib/vpsUrl';
import { NextResponse } from 'next/server';
import { fetchCandidaturasFromVPS } from '@/lib/vpsClient';
import { supabase } from '@/lib/supabaseClient';
import type { Candidatura } from '@/types';

type Perfil = {
  id?: string;
  nome_completo?: string | null;
  cpf?: string | null;
  elo_score?: number | null;
  matches_count?: number | null;
};

function asPerfil(value: unknown): Perfil | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const perfil = value as Perfil;
  return typeof perfil.id === 'string' && perfil.id ? perfil : null;
}


export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // 1. Busca as candidaturas do perfil no VPS usando a função já testada
    let candidaturas: Candidatura[] = [];
    let historicoDisponivel = true;
    try {
      candidaturas = await fetchCandidaturasFromVPS([id], { throwOnError: true });
    } catch (error) {
      historicoDisponivel = false;
      console.warn('[Perfil] histórico indisponível na VPS:', error);
    }

    // Ordena do ano mais recente ao mais antigo
    const candidaturasOrdenadas = candidaturas.sort(
      (a, b) => Number(b.ano_eleicao) - Number(a.ano_eleicao)
    );

    // 2. Busca os dados da tabela de perfil se disponível
    let perfil: Perfil | null = null;
    let perfilUpstreamIndisponivel = false;
    try {
      const perfilResponse = await fetch(`${getVpsApiUrl()}/perfis-candidatos?id=${encodeURIComponent(id)}`, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (perfilResponse.ok) {
        const perfis = await perfilResponse.json();
        perfil = Array.isArray(perfis) ? asPerfil(perfis[0]) : asPerfil(perfis);
      } else if (perfilResponse.status !== 404) {
        perfilUpstreamIndisponivel = true;
      }
    } catch {
      perfilUpstreamIndisponivel = true;
      console.warn('Não foi possível buscar perfil diretamente, usando dados das candidaturas');
    }

    if (!perfil) {
      const { data: perfilSupabase, error: perfilSupabaseError } = await supabase
        .from('perfis_candidatos')
        .select('id, nome_completo, cpf, elo_score, matches_count')
        .eq('id', id)
        .maybeSingle();

      if (perfilSupabaseError) {
        perfilUpstreamIndisponivel = true;
        console.warn('[Perfil] fallback Supabase indisponível:', perfilSupabaseError.message);
      } else if (perfilSupabase) {
        perfil = perfilSupabase;
      }
    }

    const candidaturaMaisRecente = candidaturasOrdenadas[0];

    // Se não encontrou nem perfil e nem histórico de candidaturas, aí sim é 404
    if (!perfil && !candidaturaMaisRecente) {
      if (perfilUpstreamIndisponivel || !historicoDisponivel) {
        return NextResponse.json(
          { error: 'Fontes de dados temporariamente indisponíveis' },
          { status: 502 },
        );
      }
      return NextResponse.json({ error: 'Candidato não encontrado' }, { status: 404 });
    }

    // 3. Consolida os dados do candidato (com fallback para os dados da candidatura mais recente)
    const candidato = {
      id: perfil?.id || candidaturaMaisRecente?.perfil_id || id,
      nome_completo: perfil?.nome_completo || candidaturaMaisRecente?.nome_urna || 'Candidato',
      cpf: perfil?.cpf || null,
      elo_score: perfil?.elo_score ?? 1200,
      matches_count: perfil?.matches_count ?? 0,
      ano_eleicao: candidaturaMaisRecente?.ano_eleicao || null,
      nome_urna: candidaturaMaisRecente?.nome_urna || perfil?.nome_completo,
      sq_candidato: candidaturaMaisRecente?.sq_candidato || null,
      cargo: candidaturaMaisRecente?.cargo || null,
      uf: candidaturaMaisRecente?.uf || null,
      municipio: candidaturaMaisRecente?.municipio || null,
      partido: candidaturaMaisRecente?.partido || 'S/P',
      foto: candidaturaMaisRecente?.foto || candidaturaMaisRecente?.sq_candidato || null,
    };

    return NextResponse.json({
      candidato,
      historico: candidaturasOrdenadas,
      historico_disponivel: historicoDisponivel,
    });

  } catch (error: unknown) {
    console.error('Erro ao buscar candidato na VPS:', error);
    return NextResponse.json(
      { error: 'Erro interno ao consultar o candidato' },
      { status: 500 }
    );
  }
}
