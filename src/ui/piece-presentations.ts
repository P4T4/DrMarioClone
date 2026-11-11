export type PieceKind = 'virus' | 'capsule' | 'obstacle';

export interface PiecePresentation {
  readonly kind: PieceKind;
  readonly label: string;
  readonly shape: string;
  readonly pattern: string;
}

export const PIECE_PRESENTATIONS: readonly PiecePresentation[] = [
  {
    kind: 'virus',
    label: 'Virus',
    shape: 'redonda',
    pattern: 'marcas faciales',
  },
  {
    kind: 'capsule',
    label: 'Cápsula',
    shape: 'dos segmentos alargados',
    pattern: 'unidos en una pieza',
  },
  {
    kind: 'obstacle',
    label: 'Obstáculo',
    shape: 'cuadrada',
    pattern: 'trama cruzada',
  },
];
