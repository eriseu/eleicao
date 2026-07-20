import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const COOKIE_NAME = 'duelos_concluidos';
const MAX_DUELOS_POR_SESSAO = 150;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assinatura(payload: string, secret: string) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function lerDuelos(cookie: string | undefined, secret: string): string[] {
  if (!cookie) return [];

  const separator = cookie.lastIndexOf('.');
  if (separator < 1) return [];

  const payload = cookie.slice(0, separator);
  const receivedSignature = cookie.slice(separator + 1);
  const expectedSignature = assinatura(payload, secret);
  const receivedBuffer = Buffer.from(receivedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    return [];
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function chaveDoDuelo(firstId: string, secondId: string) {
  const pair = [firstId, secondId].sort().join(':');
  return createHash('sha256').update(pair).digest('base64url').slice(0, 22);
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Serviço indisponível.' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const vencedorId = typeof body.vencedorId === 'string' ? body.vencedorId : '';
    const perdedorId = typeof body.perdedorId === 'string' ? body.perdedorId : '';

    if (
      !UUID_PATTERN.test(vencedorId) ||
      !UUID_PATTERN.test(perdedorId) ||
      vencedorId === perdedorId
    ) {
      return NextResponse.json({ error: 'Escolha inválida.' }, { status: 400 });
    }

    const cookieHeader = request.headers.get('cookie') || '';
    const rawCookie = cookieHeader
      .split(';')
      .map((item) => item.trim())
      .find((item) => item.startsWith(`${COOKIE_NAME}=`))
      ?.slice(COOKIE_NAME.length + 1);
    const duelosConcluidos = lerDuelos(rawCookie, serviceRoleKey);
    const dueloAtual = chaveDoDuelo(vencedorId, perdedorId);

    if (duelosConcluidos.includes(dueloAtual)) {
      return NextResponse.json(
        { error: 'Esta comparação já foi concluída nesta sessão.' },
        { status: 409 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await supabase.rpc('registrar_voto_seguro', {
      vencedor_id: vencedorId,
      perdedor_id: perdedorId,
    });

    if (error) {
      console.error('Erro ao registrar escolha:', error.message);
      return NextResponse.json({ error: 'Não foi possível concluir a escolha.' }, { status: 500 });
    }

    const updatedHistory = [...duelosConcluidos, dueloAtual].slice(-MAX_DUELOS_POR_SESSAO);
    const payload = Buffer.from(JSON.stringify(updatedHistory)).toString('base64url');
    const response = NextResponse.json({ success: true });
    response.cookies.set(COOKIE_NAME, `${payload}.${assinatura(payload, serviceRoleKey)}`, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
    return response;
  } catch (error) {
    console.error('Erro interno na escolha:', error);
    return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 });
  }
}
