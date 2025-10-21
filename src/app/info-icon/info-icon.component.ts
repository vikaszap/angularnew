
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'app-info-icon',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatMenuModule],
  template: `
    <mat-icon
      *ngIf="infoText"
      class="info-icon"
      [matMenuTriggerFor]="infoMenu"
      >info</mat-icon
    >
    <mat-menu #infoMenu="matMenu">
      <div class="info-menu-panel">
        {{ infoText }}
      </div>
    </mat-menu>
  `,
  styles: [`
    .info-icon {
      font-size: 16px;
      vertical-align: middle;
      margin-left: 4px;
      color: #888;
      cursor: pointer;
    }
    .info-menu-panel {
      padding: 8px 12px;
      max-width: 250px;
      font-size: 13px;
    }
  `]
})
export class InfoIconComponent {
  @Input() infoText: string | null = null;
}
