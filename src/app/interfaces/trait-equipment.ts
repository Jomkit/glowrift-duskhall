import type { HasRarity } from '@interfaces/droppable';
import type { EquipmentModifiable } from '@interfaces/equipment';
import type { Branded, IsContentItem } from '@interfaces/identifiable';

export type TraitEquipmentId = Branded<string, 'TraitEquipmentId'>;

export type TraitEquipmentContent = IsContentItem &
  HasRarity &
  EquipmentModifiable & {
    __type: 'traitequipment';
    id: TraitEquipmentId;
  };
