import { getProfileData } from './profileData';

export async function getSocialCandidate(id: string) {
  const data = await getProfileData(id);
  if (!data) return null;
  return { ...data.candidato, candidacy: data.historico[0], candidaturas: data.historico };
}
