import { Component, computed, input, signal, Signal } from '@angular/core';
import { heroRemainingTalentPoints } from '../../helpers';
import { GameElement, Hero } from '../../interfaces';
import { IconElementComponent } from '../icon-element/icon-element.component';
import { PanelHeroesTalentsTreeComponent } from '../panel-heroes-talents-tree/panel-heroes-talents-tree.component';

@Component({
  selector: 'app-panel-heroes-talents',
  imports: [IconElementComponent, PanelHeroesTalentsTreeComponent],
  templateUrl: './panel-heroes-talents.component.html',
  styleUrl: './panel-heroes-talents.component.scss',
})
export class PanelHeroesTalentsComponent {
  public hero = input.required<Hero>();

  public currentElement = signal<GameElement>('Fire');

  public pointsAvailable = computed(() =>
    heroRemainingTalentPoints(this.hero()),
  );

  public allTalents: Signal<Array<{ element: GameElement }>> = computed(() => [
    {
      element: 'Fire',
    },
    {
      element: 'Water',
    },
    {
      element: 'Air',
    },
    {
      element: 'Earth',
    },
  ]);

  public changeElement(element: GameElement): void {
    this.currentElement.set(element);
  }
}
