import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { gunzipSync } from 'node:zlib';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const part = process.argv[i];
  if (!part.startsWith('--')) continue;
  const [key, value] = part.split('=');
  args.set(key.slice(2), value ?? 'true');
}

const dryRun = args.get('dry-run') === 'true' || args.get('dryRun') === 'true' || args.get('dryrun') === 'true';
const prefix = args.get('prefix') || 'candidatos';
const bucket = process.env.R2_BUCKET || 'eleicao';
const endpoint = process.env.R2_ENDPOINT;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

if (!endpoint || !accessKeyId || !secretAccessKey) {
  console.error('Faltam variáveis de ambiente: R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.');
  console.error('Exemplo:');
  console.error('R2_ENDPOINT=https://... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... R2_BUCKET=eleicao node scripts/repair-r2-jsons.mjs');
  process.exit(1);
}

function safeJsonParse(rawText) {
  if (typeof rawText !== 'string') return null;

  const candidates = new Set();
  const trimmed = rawText.replace(/^\uFEFF/, '').trim();

  if (!trimmed) return null;

  candidates.add(trimmed);

  const withoutTrailingGarbage = trimmed.replace(/[\u0000-\u001F\u007F]+$/g, '');
  if (withoutTrailingGarbage !== trimmed) {
    candidates.add(withoutTrailingGarbage);
  }

  const lastIndex = Math.max(trimmed.lastIndexOf(']'), trimmed.lastIndexOf('}'));
  if (lastIndex > 0) {
    candidates.add(trimmed.slice(0, lastIndex + 1));
  }

  const noTrailingCommas = trimmed.replace(/,\s*([}\]])/g, '$1');
  if (noTrailingCommas !== trimmed) {
    candidates.add(noTrailingCommas);
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // tenta o próximo corte
    }
  }

  return null;
}

function unwrapArrayish(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    for (const key of ['candidatos', 'items', 'result', 'data', 'ids']) {
      const candidateList = value[key];
      if (Array.isArray(candidateList)) return candidateList;
    }
  }
  return null;
}

async function listKeys(s3Client, prefixValue) {
  const keys = [];
  let continuationToken = undefined;

  do {
    const response = await s3Client.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefixValue,
      ContinuationToken: continuationToken,
      MaxKeys: 1000,
    }));

    const items = response.Contents || [];
    items.forEach((item) => {
      if (item.Key) keys.push(item.Key);
    });

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return keys;
}

async function readObjectBody(s3Client, key) {
  const response = await s3Client.send(new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  }));

  const body = response.Body;
  if (!body) return null;

  const chunks = [];
  for await (const chunk of body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const rawBuffer = Buffer.concat(chunks);
  if (!rawBuffer.length) return null;

  const normalized = response.ContentEncoding === 'gzip' ? gunzipSync(rawBuffer) : rawBuffer;
  return normalized.toString('utf8');
}

async function repairObject(s3Client, key) {
  const originalText = await readObjectBody(s3Client, key);
  if (!originalText || originalText.trim() === '') {
    return { key, status: 'empty', fixed: false };
  }

  const parsed = safeJsonParse(originalText);
  const normalized = unwrapArrayish(parsed);

  if (Array.isArray(normalized)) {
    return { key, status: 'valid', fixed: false, count: normalized.length };
  }

  if (parsed === null) {
    return { key, status: 'invalid', fixed: false };
  }

  return { key, status: 'not-array', fixed: false };
}

async function rewriteObject(s3Client, key, value) {
  const payload = JSON.stringify(value);

  await s3Client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: payload,
    ContentType: 'application/json',
    CacheControl: 'no-store',
  }));
}

async function main() {
  const client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  const keys = await listKeys(client, prefix.endsWith('/') ? prefix : `${prefix}/`);
  const targets = keys.filter((key) => key.endsWith('.json'));

  console.log(`Encontrados ${targets.length} arquivos JSON no prefixo ${prefix}.`);

  let fixedCount = 0;
  let invalidCount = 0;

  for (const key of targets) {
    const result = await repairObject(client, key);
    if (result.status === 'valid') {
      console.log(`[OK] ${key} (${result.count ?? 0})`);
      continue;
    }

    invalidCount += 1;
    console.log(`[INVALID] ${key} (${result.status})`);

    const rawText = await readObjectBody(client, key);
    if (!rawText) continue;

    const parsed = safeJsonParse(rawText);
    const arrayLike = unwrapArrayish(parsed);

    if (arrayLike && Array.isArray(arrayLike)) {
      if (dryRun) {
        console.log(`  --dry-run: o arquivo seria corrigido sem escrita.`);
      } else {
        await rewriteObject(client, key, arrayLike);
        fixedCount += 1;
        console.log(`  -> corrigido e reescrito`);
      }
      continue;
    }

    if (!dryRun && parsed !== null) {
      const fallback = Array.isArray(parsed) ? parsed : [parsed];
      await rewriteObject(client, key, fallback);
      fixedCount += 1;
      console.log('  -> reescrito como array seguro');
    }
  }

  console.log(`Resumo: ${invalidCount} arquivos inválidos, ${fixedCount} corrigidos. Dry-run: ${dryRun}`);
}

main().catch((error) => {
  console.error('Erro ao reparar arquivos do R2:', error);
  process.exit(1);
});
