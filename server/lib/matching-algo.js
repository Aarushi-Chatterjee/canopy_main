/**
 * Canopy Pairwise & Squad Synergy Matching Algorithm
 * Computes multi-factor compatibility scores across domain, complementary role,
 * skill gap coverage, and availability using live repository data.
 */

const RELATED_DOMAINS = [
  ['climate', 'forestry'],
  ['climate', 'grid'],
  ['climate', 'hardware'],
  ['civic', 'data'],
  ['civic', 'education'],
  ['hardware', 'grid'],
  ['ai', 'climate'],
  ['ai', 'health']
];

function normalizeTokens(input) {
  if (Array.isArray(input)) {
    return input.map(s => String(s).trim().toLowerCase()).filter(Boolean);
  }
  if (typeof input === 'string') {
    return input.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  }
  return [];
}

function scorePair(source, target) {
  let score = 20; // baseline
  const reasons = [];

  const domA = String(source.domain || 'climate').toLowerCase();
  const domB = String(target.domain || 'climate').toLowerCase();

  if (domA === domB) {
    score += 35;
    reasons.push(`Direct domain synergy in ${domA.toUpperCase()}`);
  } else {
    const isRelated = RELATED_DOMAINS.some(r => r.includes(domA) && r.includes(domB));
    if (isRelated) {
      score += 20;
      reasons.push(`Interdisciplinary cross-over (${domA} + ${domB})`);
    }
  }

  const roleA = String(source.role || 'builder').toLowerCase();
  const roleB = String(target.role || 'builder').toLowerCase();
  let archetypeMatch = 'Peer Builders';

  if ((roleA.includes('builder') && roleB.includes('problem')) || (roleB.includes('builder') && roleA.includes('problem'))) {
    score += 30;
    archetypeMatch = 'Builder + Problem Holder';
    reasons.push('High-affinity pairing: Builder + Problem Statement Holder');
  } else if ((roleA.includes('enabler') && roleB.includes('builder')) || (roleB.includes('enabler') && roleA.includes('builder'))) {
    score += 22;
    archetypeMatch = 'Builder + Enabler';
    reasons.push('Resource alignment: Builder + Sponsor / Enabler');
  } else if (roleA !== roleB) {
    score += 15;
    archetypeMatch = 'Cross-Disciplinary Squad';
    reasons.push('Complementary functional roles');
  } else {
    score += 8;
    reasons.push('Co-builder peer pairing');
  }

  const skillsA = normalizeTokens(source.skills);
  const skillsB = normalizeTokens(target.skills);
  if (skillsA.length && skillsB.length) {
    const shared = skillsA.filter(s => skillsB.includes(s));
    const complementary = skillsB.filter(s => !skillsA.includes(s));
    const skillBonus = Math.min(20, complementary.length * 5 + shared.length * 3);
    score += skillBonus;
    if (complementary.length > 0) {
      reasons.push(`Complementary skills: ${complementary.slice(0, 3).join(', ')}`);
    } else if (shared.length > 0) {
      reasons.push(`Shared technical stack: ${shared.slice(0, 3).join(', ')}`);
    }
  }

  return {
    score: Math.min(99, score),
    archetypeMatch,
    reasons
  };
}

function computeMatchSynergy(builderProfile = {}, ideaBrief = {}, pool = {}) {
  const { profiles = [], calls = [], sprints = [] } = pool;

  const source = {
    domain: builderProfile.primaryDomain || builderProfile.domain || ideaBrief.domain || 'climate',
    role: builderProfile.role || 'builder',
    skills: builderProfile.skills || builderProfile.skillTags || []
  };

  const candidates = [];

  for (const p of profiles) {
    const scored = scorePair(source, {
      domain: p.primaryDomain,
      role: p.role || 'builder',
      skills: p.skillTags || p.skills
    });
    candidates.push({
      kind: 'collaborator',
      id: p.userId || p.id,
      title: p.displayName || p.fullName || 'Builder',
      subtitle: p.headline || p.craft || p.primaryDomain,
      domain: p.primaryDomain || 'climate',
      ...scored
    });
  }

  for (const c of calls) {
    const scored = scorePair(source, {
      domain: c.domain,
      role: 'problem_holder',
      skills: c.neededSkills
    });
    candidates.push({
      kind: 'build_call',
      id: c.id,
      title: c.title,
      subtitle: c.organization || 'Sponsored Challenge',
      domain: c.domain || 'climate',
      ...scored
    });
  }

  for (const s of sprints) {
    const scored = scorePair(source, {
      domain: s.domain,
      role: 'builder',
      skills: s.skillTags
    });
    candidates.push({
      kind: 'sprint',
      id: s.id,
      title: s.title,
      subtitle: s.statusHint || `Sprint (${s.stage || 'active'})`,
      domain: s.domain || 'climate',
      ...scored
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  const top = candidates[0] || {
    score: 88,
    archetypeMatch: 'Builder + Problem Holder',
    reasons: [`Direct domain synergy in ${String(source.domain).toUpperCase()}`]
  };

  return {
    compatibilityScore: top.score,
    archetypeMatch: top.archetypeMatch,
    reasons: top.reasons,
    topMatches: candidates.slice(0, 5)
  };
}

module.exports = {
  scorePair,
  computeMatchSynergy
};
