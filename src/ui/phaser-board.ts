import Phaser from 'phaser';
import type { BoardCell, VirusColor } from '../game/core/types';
import type { RoomMatchSnapshot } from '../server/rooms/room-service';

type PublicGameState = RoomMatchSnapshot['states'][number];
type CapsuleAxis = 'horizontal' | 'vertical';

const COLUMNS = 8;
const ROWS = 16;
const CELL_SIZE = 40;
const COLORS: Record<VirusColor, number> = {
  red: 0xef4444,
  blue: 0x3b82f6,
  yellow: 0xfacc15,
};
const OUTLINE = 0x172033;
const GRID = 0xc8d0dc;
const BACKGROUND = 0xf5f7fa;

class BoardScene extends Phaser.Scene {
  private graphics: Phaser.GameObjects.Graphics | null = null;
  private state: PublicGameState | null = null;

  constructor() {
    super({ key: 'private-duel-board' });
  }

  create(): void {
    this.graphics = this.add.graphics();
    this.drawBoard();
  }

  setState(state: PublicGameState): void {
    this.state = state;
    this.drawBoard();
  }

  private drawBoard(): void {
    const graphics = this.graphics;
    const state = this.state;
    if (graphics === null || state === null) {
      return;
    }

    graphics.clear();
    graphics.fillStyle(BACKGROUND, 1);
    graphics.fillRect(0, 0, COLUMNS * CELL_SIZE, ROWS * CELL_SIZE);

    const active = new Map<number, { color: VirusColor; axis: CapsuleAxis }>();
    const capsule = state.activeCapsule;
    if (capsule !== null) {
      const axis = capsule.otherOffset.column === 0 ? 'vertical' : 'horizontal';
      active.set(capsule.pivot.row * COLUMNS + capsule.pivot.column, {
        color: capsule.pivotColor,
        axis,
      });
      active.set(
        (capsule.pivot.row + capsule.otherOffset.row) * COLUMNS +
          capsule.pivot.column +
          capsule.otherOffset.column,
        { color: capsule.otherColor, axis },
      );
    }

    const capsuleAxes = this.capsuleAxes(state.board.cells);
    state.board.cells.forEach((cell, index) => {
      const row = Math.floor(index / COLUMNS);
      const column = index % COLUMNS;
      const x = column * CELL_SIZE;
      const y = row * CELL_SIZE;
      const activeSegment = active.get(index);

      if (activeSegment !== undefined) {
        this.drawCapsule(
          graphics,
          x,
          y,
          activeSegment.color,
          activeSegment.axis,
        );
      } else {
        this.drawCell(graphics, cell, x, y, capsuleAxes.get(index));
      }

      graphics.lineStyle(1, GRID, 1);
      graphics.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
    });
  }

  private capsuleAxes(cells: readonly BoardCell[]): Map<number, CapsuleAxis> {
    const axes = new Map<number, CapsuleAxis>();
    const indicesById = new Map<number, number[]>();
    cells.forEach((cell, index) => {
      if (cell.kind === 'capsule' && cell.capsuleId !== undefined) {
        const indices = indicesById.get(cell.capsuleId) ?? [];
        indices.push(index);
        indicesById.set(cell.capsuleId, indices);
      }
    });

    for (const indices of indicesById.values()) {
      if (indices.length !== 2) {
        continue;
      }
      const [first, second] = indices;
      if (first === undefined || second === undefined) {
        continue;
      }
      const axis =
        Math.floor(first / COLUMNS) === Math.floor(second / COLUMNS)
          ? 'horizontal'
          : 'vertical';
      axes.set(first, axis);
      axes.set(second, axis);
    }
    return axes;
  }

  private drawCell(
    graphics: Phaser.GameObjects.Graphics,
    cell: BoardCell,
    x: number,
    y: number,
    capsuleAxis?: CapsuleAxis,
  ): void {
    switch (cell.kind) {
      case 'empty':
        return;
      case 'virus':
        this.drawVirus(graphics, x, y, cell.color);
        return;
      case 'obstacle':
        this.drawObstacle(graphics, x, y);
        return;
      case 'capsule':
        this.drawCapsule(
          graphics,
          x,
          y,
          cell.color,
          capsuleAxis ?? 'horizontal',
        );
        return;
    }
  }

  private drawVirus(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    color: VirusColor,
  ): void {
    const centerX = x + CELL_SIZE / 2;
    const centerY = y + CELL_SIZE / 2;
    graphics.fillStyle(COLORS[color], 1);
    graphics.fillCircle(centerX, centerY, 14);
    graphics.fillStyle(OUTLINE, 1);
    graphics.fillCircle(centerX - 5, centerY - 3, 2);
    graphics.fillCircle(centerX + 5, centerY - 3, 2);
    graphics.lineStyle(2, OUTLINE, 1);
    graphics.lineBetween(centerX - 4, centerY + 6, centerX + 4, centerY + 6);
  }

  private drawObstacle(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
  ): void {
    graphics.fillStyle(0x64748b, 1);
    graphics.fillRect(x + 4, y + 4, CELL_SIZE - 8, CELL_SIZE - 8);
    graphics.lineStyle(3, 0xffffff, 1);
    graphics.lineBetween(x + 8, y + 8, x + CELL_SIZE - 8, y + CELL_SIZE - 8);
    graphics.lineBetween(x + CELL_SIZE - 8, y + 8, x + 8, y + CELL_SIZE - 8);
  }

  private drawCapsule(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    color: VirusColor,
    axis: CapsuleAxis,
  ): void {
    graphics.fillStyle(COLORS[color], 1);
    if (axis === 'horizontal') {
      graphics.fillRoundedRect(x + 1, y + 5, CELL_SIZE - 2, CELL_SIZE - 10, 14);
      graphics.lineStyle(2, OUTLINE, 1);
      graphics.lineBetween(x + CELL_SIZE - 3, y + 8, x + CELL_SIZE - 3, y + 32);
    } else {
      graphics.fillRoundedRect(x + 5, y + 1, CELL_SIZE - 10, CELL_SIZE - 2, 14);
      graphics.lineStyle(2, OUTLINE, 1);
      graphics.lineBetween(x + 8, y + CELL_SIZE - 3, x + 32, y + CELL_SIZE - 3);
    }
  }
}

export class PhaserBoard {
  private readonly scene = new BoardScene();
  private readonly game: Phaser.Game;

  constructor(parent: HTMLElement) {
    this.game = new Phaser.Game({
      type: Phaser.CANVAS,
      width: COLUMNS * CELL_SIZE,
      height: ROWS * CELL_SIZE,
      backgroundColor: '#f5f7fa',
      parent,
      scene: this.scene,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    });
  }

  render(state: PublicGameState): void {
    this.scene.setState(state);
  }

  pause(): void {
    this.game.scene.pause('private-duel-board');
  }

  resume(): void {
    this.game.scene.resume('private-duel-board');
  }
}
