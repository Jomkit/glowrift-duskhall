import { allCombatantTalents } from '@helpers/combat';
import { isDead } from '@helpers/combat-end';
import { formatCombatMessage, logCombatMessage } from '@helpers/combat-log';
import {
  applyStatusEffectToTarget,
  createStatusEffect,
  statusEffectChanceTalentBoost,
} from '@helpers/combat-statuseffects';
import { getEntry } from '@helpers/content';
import { getDroppableEquippableBaseId } from '@helpers/droppable';
import {
  getCombatIncomingAttributeMultiplier,
  getCombatOutgoingAttributeMultiplier,
} from '@helpers/festival-combat';
import { succeedsChance } from '@helpers/rng';
import type {
  Combat,
  Combatant,
  EquipmentSkill,
  EquipmentSkillAttribute,
  EquipmentSkillContentTechnique,
  GameElement,
  GameStat,
  StatusEffectContent,
  TalentId,
} from '@interfaces';
import { intersection, sum } from 'es-toolkit/compat';

export function techniqueHasAttribute(
  technique: EquipmentSkillContentTechnique,
  attribute: EquipmentSkillAttribute,
): boolean {
  return technique.attributes?.includes(attribute);
}

export function combatantTalentLevel(
  combatant: Combatant,
  talentId: TalentId,
): number {
  return combatant.talents[talentId] ?? 0;
}

export function combatantTalentElementBoost(
  combatant: Combatant,
  elements: GameElement[],
  stat: GameStat,
): number {
  return sum(
    allCombatantTalents(combatant)
      .filter((t) => intersection(t.boostedElements ?? [], elements).length > 0)
      .map(
        (t) =>
          combatantTalentLevel(combatant, t.id) * (t.boostStats[stat] ?? 0),
      ),
  );
}

export function combatantTalentSkillBoost(
  combatant: Combatant,
  skill: EquipmentSkill,
  stat: GameStat,
): number {
  const skillContentId = getDroppableEquippableBaseId(skill);

  return sum(
    allCombatantTalents(combatant)
      .filter((t) => t.boostedSkillIds?.includes(skillContentId))
      .map(
        (t) =>
          combatantTalentLevel(combatant, t.id) * (t.boostStats[stat] ?? 0),
      ),
  );
}

export function getCombatantStatForTechnique(
  combatant: Combatant,
  skill: EquipmentSkill,
  technique: EquipmentSkillContentTechnique,
  stat: GameStat,
): number {
  const baseMultiplier = technique.damageScaling[stat] ?? 0;
  if (baseMultiplier === 0) return 0;

  const talentElementMultiplierBoost = combatantTalentElementBoost(
    combatant,
    technique.elements,
    stat,
  );

  const talentSkillMultiplierBoost = combatantTalentSkillBoost(
    combatant,
    skill,
    stat,
  );

  const totalMultiplier =
    baseMultiplier + talentSkillMultiplierBoost + talentElementMultiplierBoost;

  return combatant.totalStats[stat] * totalMultiplier;
}

export function combatantTakeDamage(combatant: Combatant, damage: number) {
  combatant.hp = Math.max(0, combatant.hp - damage);
}

export function applySkillToTarget(
  combat: Combat,
  combatant: Combatant,
  target: Combatant,
  skill: EquipmentSkill,
  technique: EquipmentSkillContentTechnique,
): void {
  const baseDamage =
    getCombatantStatForTechnique(combatant, skill, technique, 'Force') +
    getCombatantStatForTechnique(combatant, skill, technique, 'Aura') +
    getCombatantStatForTechnique(combatant, skill, technique, 'Health') +
    getCombatantStatForTechnique(combatant, skill, technique, 'Speed');

  if (baseDamage > 0) {
    const damage =
      technique.elements.length === 0
        ? baseDamage
        : sum(
            technique.elements.map((el) => baseDamage * combatant.affinity[el]),
          ) / technique.elements.length;

    const baseTargetDefense = target.totalStats.Aura;
    const targetDefense =
      technique.elements.length === 0
        ? baseTargetDefense
        : sum(
            technique.elements.map(
              (el) => baseTargetDefense * target.resistance[el],
            ),
          ) / technique.elements.length;

    let effectiveDamage = damage;

    if (!techniqueHasAttribute(technique, 'AllowNegative')) {
      effectiveDamage = Math.max(0, effectiveDamage);
    }

    if (!techniqueHasAttribute(technique, 'BypassDefense')) {
      effectiveDamage = Math.max(0, effectiveDamage - targetDefense);
    }

    if (techniqueHasAttribute(technique, 'AllowPlink')) {
      effectiveDamage = Math.max(damage > 0 ? 1 : 0, effectiveDamage);
    }

    let damageMultiplierFromFestivals = 1;
    if (combatant.isEnemy && !target.isEnemy && effectiveDamage > 0) {
      damageMultiplierFromFestivals =
        1 + getCombatIncomingAttributeMultiplier('damage');
    }

    if (!combatant.isEnemy && target.isEnemy && effectiveDamage > 0) {
      damageMultiplierFromFestivals =
        1 + getCombatOutgoingAttributeMultiplier('damage');
    }

    effectiveDamage *= damageMultiplierFromFestivals;
    effectiveDamage = Math.floor(effectiveDamage);

    combatantTakeDamage(target, effectiveDamage);

    const templateData = {
      combat,
      combatant,
      target,
      skill,
      technique,
      damage: effectiveDamage,
      absdamage: Math.abs(effectiveDamage),
    };

    const message = formatCombatMessage(technique.combatMessage, templateData);
    logCombatMessage(combat, message);
  }

  technique.statusEffects.forEach((effData) => {
    const effectContent = getEntry<StatusEffectContent>(effData.statusEffectId);
    if (!effectContent) return;

    const totalChance =
      effData.chance +
      statusEffectChanceTalentBoost(combatant, skill, effectContent);

    if (!succeedsChance(totalChance)) return;

    const statusEffect = createStatusEffect(effectContent, combatant, {
      duration: effData.duration,
    });

    applyStatusEffectToTarget(combat, target, statusEffect);
  });

  if (isDead(target)) {
    logCombatMessage(combat, `**${target.name}** has been defeated!`);
  }
}
