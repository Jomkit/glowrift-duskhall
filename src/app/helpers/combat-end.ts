import { currentCombat, resetCombat } from '@helpers/combat';
import { logCombatMessage } from '@helpers/combat-log';
import { getEntry } from '@helpers/content';
import { gainCurrency, updateCurrencyClaims } from '@helpers/currency';
import {
  gainDroppableItem,
  makeDroppableIntoRealItem,
} from '@helpers/droppable';
import {
  exploreProgressPercent,
  travelHome,
  updateExploringAndGlobalStatusText,
} from '@helpers/explore';
import { allHeroes } from '@helpers/hero';
import { heroGainXp } from '@helpers/hero-xp';
import { addItemElement, isEquipment } from '@helpers/item';
import { notify } from '@helpers/notify';
import { claimNode, getWorldNode } from '@helpers/world';
import type { Combat, Combatant, DroppableEquippable } from '@interfaces';

export function currentCombatHasGuardiansAlive(): boolean {
  const combat = currentCombat();
  if (!combat) return false;
  return combat.guardians.some((guardian) => !isDead(guardian));
}

export function isDead(combatant: Combatant): boolean {
  return combatant.hp <= 0;
}

export function isCombatOver(combat: Combat): boolean {
  const allHeroesDead = combat.heroes.every((hero) => isDead(hero));
  const allGuardiansDead = combat.guardians.every((guardian) =>
    isDead(guardian),
  );

  return allHeroesDead || allGuardiansDead;
}

export function didHeroesWin(combat: Combat): boolean {
  return combat.guardians.every((guardian) => isDead(guardian));
}

export function handleCombatVictory(combat: Combat): void {
  logCombatMessage(combat, 'Heroes have won the combat!');

  const currentNode = getWorldNode(
    combat.locationPosition.x,
    combat.locationPosition.y,
  );

  if (currentNode) {
    const xpGainedForClaim =
      currentNode.encounterLevel * currentNode.guardianIds.length;
    notify(`You have claimed ${currentNode.name}!`, 'LocationClaim');

    logCombatMessage(combat, `Heroes claimed **${currentNode.name}**!`);
    updateExploringAndGlobalStatusText('');
    exploreProgressPercent.set(0);

    allHeroes().forEach((hero) => {
      logCombatMessage(
        combat,
        `**${hero.name}** gained ${xpGainedForClaim} XP!`,
      );
      heroGainXp(hero, xpGainedForClaim);
    });

    gainCurrency('Soul Essence', xpGainedForClaim);
    logCombatMessage(combat, `You gained ${xpGainedForClaim} Soul Essence!`);

    currentNode.claimLootIds.forEach((lootDefId) => {
      const lootDef = getEntry<DroppableEquippable>(lootDefId);
      if (!lootDef) return;

      const created = makeDroppableIntoRealItem(lootDef);

      if (isEquipment(created)) {
        currentNode.elements.forEach((el) => {
          addItemElement(created, el);
        });
      }

      gainDroppableItem(created);

      logCombatMessage(
        combat,
        `Heroes found \`rarity:${created.rarity}:${created.name}\`!`,
      );
    });

    claimNode(currentNode);
  }

  resetCombat();
  updateCurrencyClaims();
}

export function handleCombatDefeat(combat: Combat): void {
  logCombatMessage(combat, 'Heroes have lost the combat!');
  logCombatMessage(combat, 'Heroes have been sent home for recovery!');

  travelHome();
}

export function checkCombatOver(combat: Combat): boolean {
  if (!isCombatOver(combat)) return false;

  logCombatMessage(combat, 'Combat is over.');

  if (didHeroesWin(combat)) {
    handleCombatVictory(combat);
  } else {
    handleCombatDefeat(combat);
  }

  resetCombat();

  logCombatMessage(combat, '');

  return true;
}
