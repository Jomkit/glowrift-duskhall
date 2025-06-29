import { Component, computed, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { getEntriesByType } from '../../helpers';
import { Currency } from '../../interfaces';
import { IconItemComponent } from '../icon-currency/icon-currency.component';

@Component({
  selector: 'app-selector-currency',
  imports: [NgSelectModule, FormsModule, IconItemComponent],
  templateUrl: './selector-currency.component.html',
  styleUrl: './selector-currency.component.scss',
})
export class SelectorCurrencyComponent {
  public currency = model<Currency>();

  public allCurrencies = computed(() => getEntriesByType<Currency>('currency'));
}
