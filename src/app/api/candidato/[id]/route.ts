import { NextResponse } from 'next/server';
import { AVAILABLE_UFS } from '@/constants/elections';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    let candidatoAlvo: any = null;
    const candidaturasUnificadas: any[] = [];

    // Faz o fetch em paralelo no servidor Next.js (MUITO mais rápido)
    const resultadosUFs = await Promise.all(
      AVAILABLE_UFS.map(async (uf) => {
        try {
          const res = await fetch(`https://fotos.centraleti.com.br/candidatos/${uf}.json`, {
            next: { revalidate: 3600 } // Opcional: Cacheia a resposta por 1 hora no servidor Next
          });
          if (!res.ok) return [];
          return await res.json();
        } catch {
          return [];
        }
      })
    );

    // 1. Identifica o candidato alvo pelo ID
    for (const lista of resultadosUFs) {
      const achado = lista.find((item: any) => item.id === id);
      if (achado) {
        candidatoAlvo = achado;
        break;
      }
    }

    if (!candidatoAlvo) {
      return NextResponse.json({ error: 'Candidato não encontrado' }, { status: 404 });
    }

    const nomeNormalizadoAlvo =
      candidatoAlvo.nome_completo_normalizado || candidatoAlvo.nome_completo.toLowerCase();

    // 2. Filtra o histórico
    resultadosUFs.forEach((lista) => {
      lista.forEach((item: any) => {
        const nomeItem = item.nome_completo_normalizado || item.nome_completo?.toLowerCase();

        const eMesmaPessoa =
          (candidatoAlvo.titulo_eleitoral && item.titulo_eleitoral === candidatoAlvo.titulo_eleitoral) ||
          (nomeItem && nomeItem === nomeNormalizadoAlvo);

        if (eMesmaPessoa) {
          candidaturasUnificadas.push({
            id: item.id,
            ano_eleicao: item.ano_eleicao,
            cargo: item.cargo,
            partido: item.partido,
            municipio: item.municipio,
            uf: item.uf,
            nome_urna: item.nome_urna,
          });
        }
      });
    });

    const historicoOrdenado = candidaturasUnificadas.sort(
      (a, b) => Number(b.ano_eleicao) - Number(a.ano_eleicao)
    );

    return NextResponse.json({
      candidato: candidatoAlvo,
      historico: historicoOrdenado,
    });
  } catch (error) {
    console.error('Erro na API de Candidato:', error);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}
