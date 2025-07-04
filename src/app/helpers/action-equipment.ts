import { EquipmentItem, EquipmentItemDefinition } from '../interfaces';
import { gainCurrency } from './currency';
import { removeItemFromInventory } from './inventory-equipment';
import { getItemStat } from './item';
import { notifySuccess } from './notify';

export function itemSalvageValue(item: EquipmentItemDefinition): number {
  return (
    getItemStat(item, 'Aura') * 4 +
    getItemStat(item, 'Force') * 6 +
    getItemStat(item, 'Health') * 2 +
    getItemStat(item, 'Speed') * 10
  );
}

export function itemSalvage(item: EquipmentItem): void {
  const manaGained = itemSalvageValue(item);

  removeItemFromInventory(item);
  gainCurrency('Mana', manaGained);

  notifySuccess(`Salvaged ${item.name} for ${manaGained} mana!`);
}

export function itemBuyValue(item: EquipmentItemDefinition): number {
  return itemSalvageValue(item) * 10;
}
