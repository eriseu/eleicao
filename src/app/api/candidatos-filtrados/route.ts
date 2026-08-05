import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  try {
    // Força explicitamente a URL correta da VPS que está respondendo na imagem 1
    const vpsApiUrl = process.env.NEXT_PUBLIC_VPS_API_URL || 'https://api.centraleti.com.br';
    
    // Constrói a URL de destino repassando todos os parâmetros recebidos (uf, cargos, municipio)
    const targetUrl = new URL(`${vpsApiUrl}/api/candidatos-filtrados`);
    
    searchParams.forEach((value, key) => {
      targetUrl.searchParams.append(key, value);
    });

    const response = await fetch(targetUrl.toString(), {
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro retornado pela VPS:', errorText);
      return NextResponse.json({ error: 'Erro no servidor VPS', details: errorText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Erro na API interna de proxy:', error);
    return NextResponse.json({ error: 'Falha de comunicação com o VPS', details: error.message }, { status: 500 });
  }
}
