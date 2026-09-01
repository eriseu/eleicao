const AVAILABLE_UFS = [
  'BR',
  'AC',
  'AL',
  'AM',
  'AP',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MG',
  'MS',
  'MT',
  'PA',
  'PB',
  'PE',
  'PI',
  'PR',
  'RJ',
  'RN',
  'RO',
  'RR',
  'RS',
  'SC',
  'SE',
  'SP',
  'TO',
] as const;

const STATE_NAMES: Record<string, string> = {
  AC: 'Acre',
  AL: 'Alagoas',
  AP: 'Amapá',
  AM: 'Amazonas',
  BA: 'Bahia',
  CE: 'Ceará',
  DF: 'Distrito Federal',
  ES: 'Espírito Santo',
  GO: 'Goiás',
  MA: 'Maranhão',
  MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais',
  PA: 'Pará',
  PB: 'Paraíba',
  PR: 'Paraná',
  PE: 'Pernambuco',
  PI: 'Piauí',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul',
  RO: 'Rondônia',
  RR: 'Roraima',
  SC: 'Santa Catarina',
  SP: 'São Paulo',
  SE: 'Sergipe',
  TO: 'Tocantins',
  BR: 'Brasil',
};

export const STATE_CAPITAIS: Record<string, string> = {
  AC: 'Rio Branco',
  AL: 'Maceió',
  AP: 'Macapá',
  AM: 'Manaus',
  BA: 'Salvador',
  CE: 'Fortaleza',
  DF: 'Brasília',
  ES: 'Vitória',
  GO: 'Goiânia',
  MA: 'São Luís',
  MT: 'Cuiabá',
  MS: 'Campo Grande',
  MG: 'Belo Horizonte',
  PA: 'Belém',
  PB: 'João Pessoa',
  PR: 'Curitiba',
  PE: 'Recife',
  PI: 'Teresina',
  RJ: 'Rio de Janeiro',
  RN: 'Natal',
  RS: 'Porto Alegre',
  RO: 'Porto Velho',
  RR: 'Boa Vista',
  SC: 'Florianópolis',
  SP: 'São Paulo',
  SE: 'Aracaju',
  TO: 'Palmas',
};

export type SelectOption = {
  value: string;
  label: string;
};

export function normalizeText(value: string | null | undefined): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

export function getStateNameFromUf(uf: string): string {
  return STATE_NAMES[uf?.toUpperCase()] || uf || 'Brasil';
}

export function normalizeMunicipioOption(value: string | null | undefined, uf: string): string {
  const raw = String(value ?? '').trim().replace(/\s+/g, ' ');
  const stateCode = uf?.toUpperCase();
  if (!raw) return '';

  const upper = raw.toUpperCase();
  const normalizedUpper = normalizeText(raw);
  const normalizedStateName = normalizeText(getStateNameFromUf(uf));
  if (upper === stateCode || normalizedUpper === normalizedStateName) return '';
  if (normalizedUpper === normalizeText(`${stateCode} ${getStateNameFromUf(uf)}`)) return '';

  if (stateCode && upper.startsWith(`${stateCode} `)) {
    const withoutCode = raw.slice(stateCode.length).trim();
    return withoutCode && normalizeText(withoutCode) !== normalizedStateName ? withoutCode : '';
  }

  return raw;
}

export function buildMunicipioOptions(rawMunicipios: Array<string | { municipio?: string } | null | undefined>, uf: string): SelectOption[] {
  const stateCode = uf?.toUpperCase();
  const capital = STATE_CAPITAIS[stateCode];

  const normalizedMunicipios = rawMunicipios
    .map((item) => normalizeMunicipioOption(typeof item === 'string' ? item : item?.municipio, uf))
    .filter((municipio): municipio is string => Boolean(municipio) && municipio.trim() !== '')
    .map((municipio) => municipio.trim());

  const uniqueMunicipios = Array.from(
    new Map(normalizedMunicipios.map((municipio) => [normalizeText(municipio), municipio])).values(),
  );

  const sortedOptions = uniqueMunicipios
    .map((municipio) => ({
      value: municipio,
      label: municipio.toUpperCase(),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
    .map(({ value, label }) => ({ value, label }));

  const capitalOptions = capital
    ? [{ value: capital, label: capital.toUpperCase() }, ...sortedOptions]
    : sortedOptions;

  return capitalOptions;
}

export function buildStateOptions(): SelectOption[] {
  return AVAILABLE_UFS.filter((uf) => uf !== 'BR').map((uf) => ({
    value: uf,
    label: `${uf} - ${getStateNameFromUf(uf)}`,
  }));
}
