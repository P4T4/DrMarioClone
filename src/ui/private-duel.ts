import { Client, type Room as ClientRoom } from '@colyseus/sdk';
import type { MatchResult, VirusColor } from '../game/core/types';
import type { CapsulePreview } from '../game/core/types';
import type { ChatMessage } from '../server/chat/chat-service';
import type { RoomMatchSnapshot } from '../server/rooms/room-service';
import type {
  ChatErrorMessage,
  ConnectionStateMessage,
  RoomActionErrorMessage,
  RoomActionAcceptedMessage,
  RoomAuthMessage,
  RoomErrorMessage,
  RoomViewMessage,
} from '../shared/room-protocol';
import { mapKeyboard, mapTouch, presentRoomFailure } from './controls';
import type { RecoveryAction, RoomFailure, TouchAction } from './controls';
import { PhaserBoard } from './phaser-board';

type PublicGameState = RoomMatchSnapshot['states'][number];

const BOARD_COLUMNS = 8;
const BOARD_ROWS = 16;
const COLOR_NAMES: Record<VirusColor, string> = {
  red: 'rojo',
  blue: 'azul',
  yellow: 'amarillo',
} as const;

function requiredElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (element === null) {
    throw new Error(`Required duel UI element is missing: ${selector}`);
  }
  return element;
}

function isRoomFailure(reason: unknown): reason is RoomFailure {
  return (
    reason === 'InvalidAlias' ||
    reason === 'InvalidCode' ||
    reason === 'Expired' ||
    reason === 'Full' ||
    reason === 'CapacityUnavailable' ||
    reason === 'Disconnected'
  );
}

function failureFromError(error: unknown): RoomFailure {
  const message =
    error instanceof Error ? error.message : String(error ?? 'Unknown error');
  const failure =
    /ROOM_FAILURE:(InvalidAlias|InvalidCode|Expired|Full|CapacityUnavailable|Disconnected)/.exec(
      message,
    );
  if (failure !== null && isRoomFailure(failure[1])) {
    return failure[1];
  }
  if (/not found|404|invalid room|MATCHMAKE_INVALID_ROOM_ID/i.test(message)) {
    return 'InvalidCode';
  }
  if (/room is full|maximum number|maximum clients/i.test(message)) {
    return 'Full';
  }
  return 'Disconnected';
}

function inputName(input: string): string {
  switch (input) {
    case 'MoveLeft':
      return 'mover a la izquierda';
    case 'MoveRight':
      return 'mover a la derecha';
    case 'SoftDrop':
      return 'bajar una fila';
    case 'HardDrop':
      return 'fijar la cápsula';
    case 'RotateClockwise':
      return 'girar a la derecha';
    case 'RotateCounterclockwise':
      return 'girar a la izquierda';
    default:
      return 'acción';
  }
}

function endpoint(): string {
  const configured = import.meta.env.PUBLIC_GAME_SERVER_URL;
  if (configured) {
    return configured;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.hostname}:2567`;
}

function createCells(board: HTMLElement): HTMLElement[] {
  const fragment = document.createDocumentFragment();
  const cells: HTMLElement[] = [];

  for (let index = 0; index < BOARD_COLUMNS * BOARD_ROWS; index += 1) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.setAttribute('role', 'gridcell');
    fragment.append(cell);
    cells.push(cell);
  }

  board.replaceChildren(fragment);
  return cells;
}

function cellDescription(
  cell: RoomMatchSnapshot['states'][0]['board']['cells'][number],
  row: number,
  column: number,
): { className: string; symbol: string; label: string } {
  const coordinate = `Fila ${row + 1}, columna ${column + 1}`;
  if (cell.kind === 'empty') {
    return {
      className: 'cell',
      symbol: '',
      label: `${coordinate}: vacío`,
    };
  }
  if (cell.kind === 'obstacle') {
    return {
      className: 'cell cell--obstacle',
      symbol: '#',
      label: `${coordinate}: obstáculo`,
    };
  }
  if (cell.kind === 'virus') {
    return {
      className: `cell cell--virus cell--${cell.color}`,
      symbol: 'V',
      label: `${coordinate}: virus ${COLOR_NAMES[cell.color]}`,
    };
  }
  return {
    className: `cell cell--capsule cell--${cell.color}`,
    symbol: 'C',
    label: `${coordinate}: cápsula ${COLOR_NAMES[cell.color]}`,
  };
}

function renderBoard(
  elements: readonly HTMLElement[],
  state: PublicGameState,
  renderer: PhaserBoard,
): void {
  const activeSegments = new Map<number, VirusColor>();
  const capsule = state.activeCapsule;
  if (capsule !== null) {
    activeSegments.set(
      capsule.pivot.row * BOARD_COLUMNS + capsule.pivot.column,
      capsule.pivotColor,
    );
    const otherRow = capsule.pivot.row + capsule.otherOffset.row;
    const otherColumn = capsule.pivot.column + capsule.otherOffset.column;
    activeSegments.set(
      otherRow * BOARD_COLUMNS + otherColumn,
      capsule.otherColor,
    );
  }

  for (let index = 0; index < elements.length; index += 1) {
    const row = Math.floor(index / BOARD_COLUMNS);
    const column = index % BOARD_COLUMNS;
    const activeColor = activeSegments.get(index);
    const baseCell = state.board.cells[index];
    if (baseCell === undefined) {
      throw new Error(`Game board is missing cell ${index}`);
    }

    const description =
      activeColor === undefined
        ? cellDescription(baseCell, row, column)
        : {
            className: `cell cell--capsule cell--${activeColor}`,
            symbol: 'C',
            label: `Fila ${row + 1}, columna ${column + 1}: cápsula activa ${COLOR_NAMES[activeColor]}`,
          };
    const element = elements[index];
    element.className = description.className;
    element.textContent = description.symbol;
    element.setAttribute('aria-label', description.label);
  }
  renderer.render(state);
}

const lobby = requiredElement<HTMLElement>('#duel-lobby');
const roomPanel = requiredElement<HTMLElement>('#room-panel');
const roomHeading = requiredElement<HTMLHeadingElement>('#room-heading');
const roomCodeInput = requiredElement<HTMLInputElement>('#room-code');
const roomStatus = requiredElement<HTMLParagraphElement>('#room-status');
const roomError = requiredElement<HTMLParagraphElement>('#room-error');
const roomAlert = requiredElement<HTMLParagraphElement>('#room-alert');
const recoveryActions = requiredElement<HTMLDivElement>('#recovery-actions');
const roomRecoveryActions = requiredElement<HTMLDivElement>(
  '#room-recovery-actions',
);
const createForm = requiredElement<HTMLFormElement>('#create-room-form');
const createAlias = requiredElement<HTMLInputElement>('#create-alias');
const joinForm = requiredElement<HTMLFormElement>('#join-room-form');
const joinAlias = requiredElement<HTMLInputElement>('#join-alias');
const joinCode = requiredElement<HTMLInputElement>('#join-code');
const reconnectControls = requiredElement<HTMLDivElement>(
  '#connection-controls',
);
const reconnectButton = requiredElement<HTMLButtonElement>('#reconnect-button');
const leaveButton = requiredElement<HTMLButtonElement>('#leave-button');
const returnButton = requiredElement<HTMLButtonElement>('#return-button');
const matchPanel = requiredElement<HTMLElement>('#match-panel');
const actionStatus = requiredElement<HTMLParagraphElement>('#action-status');
const ownBoard = createCells(
  requiredElement<HTMLElement>('#own-board-accessible'),
);
const opponentBoard = createCells(
  requiredElement<HTMLElement>('#opponent-board-accessible'),
);
const ownBoardRendererContainer = requiredElement<HTMLElement>(
  '#own-board-renderer',
);
const opponentBoardRendererContainer = requiredElement<HTMLElement>(
  '#opponent-board-renderer',
);
let ownBoardRenderer: PhaserBoard | null = null;
let opponentBoardRenderer: PhaserBoard | null = null;
const ownStats = requiredElement<HTMLParagraphElement>('#own-stats');
const opponentStats = requiredElement<HTMLParagraphElement>('#opponent-stats');
const matchTime = requiredElement<HTMLElement>('#match-time');
const nextCapsule = requiredElement<HTMLElement>('#next-capsule');
const resultPanel = requiredElement<HTMLElement>('#result-panel');
const resultText = requiredElement<HTMLParagraphElement>('#result-text');
const resultStats = requiredElement<HTMLParagraphElement>('#result-stats');
const chatForm = requiredElement<HTMLFormElement>('#chat-form');
const chatInput = requiredElement<HTMLInputElement>('#chat-message');
const chatHistoryList = requiredElement<HTMLOListElement>('#chat-history');
const chatStatus = requiredElement<HTMLParagraphElement>('#chat-status');
const muteButton = requiredElement<HTMLButtonElement>('#mute-button');
const chatSendButton = chatForm.querySelector<HTMLButtonElement>(
  'button[type="submit"]',
);
if (chatSendButton === null) {
  throw new Error('Chat send button is missing');
}

const client = new Client(endpoint());
let activeRoom: ClientRoom | null = null;
let activeCode = '';
let activeAlias = '';
let seat: 0 | 1 | null = null;
let seatToken = '';
let inputSequence = 0;
let muted = false;
let intentionalLeave = false;
let latestMatch: RoomMatchSnapshot | null = null;
let nextCapsulePreview: CapsulePreview | null = null;
let elapsedBaseMs = 0;
let elapsedBaseAt = performance.now();
let matchClockPaused = true;
let chatMessages: ChatMessage[] = [];
let retryAction: (() => void) | null = null;

function currentElapsedMs(): number {
  return (
    elapsedBaseMs +
    (matchClockPaused ? 0 : Math.max(0, performance.now() - elapsedBaseAt))
  );
}

function renderMatchTime(): void {
  const totalSeconds = Math.floor(currentElapsedMs() / 1_000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  matchTime.textContent = `${minutes}:${seconds}`;
}

function syncMatchTime(elapsedMs: number, paused: boolean): void {
  if (!Number.isSafeInteger(elapsedMs) || elapsedMs < 0) {
    throw new RangeError('Match elapsed time must be a non-negative integer');
  }
  elapsedBaseMs = elapsedMs;
  elapsedBaseAt = performance.now();
  matchClockPaused = paused;
  renderMatchTime();
}

function pauseMatchTime(): void {
  syncMatchTime(Math.floor(currentElapsedMs()), true);
}

window.setInterval(() => {
  if (!matchClockPaused && latestMatch?.result === null) {
    renderMatchTime();
  }
}, 250);

function clearErrors(): void {
  roomError.hidden = true;
  roomError.textContent = '';
  roomAlert.hidden = true;
  roomAlert.textContent = '';
  recoveryActions.replaceChildren();
  roomRecoveryActions.replaceChildren();
  retryAction = null;
}

function showFailure(
  failure: RoomFailure,
  location: 'lobby' | 'room',
  retry?: () => void,
): void {
  const presentation = presentRoomFailure(failure);
  const target = location === 'room' ? roomAlert : roomError;
  const actionContainer =
    location === 'room' ? roomRecoveryActions : recoveryActions;
  target.textContent = presentation.message;
  target.hidden = false;
  actionContainer.replaceChildren();
  retryAction = retry ?? null;

  if (location === 'room') {
    roomStatus.textContent = presentation.message;
    reconnectControls.hidden = false;
  }

  for (const action of presentation.actions) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = recoveryActionLabel(action);
    button.addEventListener('click', () => handleRecoveryAction(action));
    actionContainer.append(button);
  }
}

function recoveryActionLabel(action: RecoveryAction): string {
  switch (action) {
    case 'CorrectInput':
      return 'Corregir código';
    case 'Retry':
      return 'Intentar de nuevo';
    case 'Reconnect':
      return 'Reconectar';
    case 'Leave':
      return 'Salir';
  }
}

function handleRecoveryAction(action: RecoveryAction): void {
  switch (action) {
    case 'CorrectInput':
      joinCode.focus();
      break;
    case 'Retry':
      if (retryAction !== null) {
        retryAction();
      } else {
        joinCode.focus();
      }
      break;
    case 'Reconnect':
      void reconnect();
      break;
    case 'Leave':
      void leaveRoom();
      break;
  }
}

function activateRoom(room: ClientRoom, alias: string, owner: boolean): void {
  activeRoom = room;
  activeCode = room.roomId.toUpperCase();
  activeAlias = alias;
  intentionalLeave = false;
  seat = null;
  seatToken = '';
  latestMatch = null;
  nextCapsulePreview = null;
  syncMatchTime(0, true);
  chatMessages = [];
  roomCodeInput.value = activeCode;
  roomHeading.textContent = owner ? 'Sala creada' : 'Sala unida';
  roomStatus.textContent = 'Conectado. Sincronizando la sala…';
  roomPanel.hidden = false;
  lobby.hidden = true;
  matchPanel.hidden = true;
  resultPanel.hidden = true;
  reconnectControls.hidden = true;
  chatHistoryList.replaceChildren();
  clearErrors();
  attachRoomListeners(room);
  room.send('ready');
}

function attachRoomListeners(room: ClientRoom): void {
  room.onMessage('seat', (message: RoomAuthMessage) => {
    if (message.seat !== 0 && message.seat !== 1) {
      showFailure('Disconnected', 'room');
      return;
    }
    seat = message.seat;
    seatToken = message.seatToken;
    activeAlias = message.alias;
    sessionStorage.setItem(storageKey('seat-token'), seatToken);
    sessionStorage.setItem(storageKey('alias'), activeAlias);
    sessionStorage.setItem(
      storageKey(`sequence-${seat}`),
      String(inputSequence),
    );
    const storedSequence = Number(
      sessionStorage.getItem(storageKey(`sequence-${seat}`)),
    );
    if (Number.isSafeInteger(storedSequence) && storedSequence >= 0) {
      inputSequence = storedSequence;
    }
    sessionStorage.setItem(
      storageKey(`sequence-${seat}`),
      String(inputSequence),
    );
  });

  room.onMessage('room-view', (message: RoomViewMessage) => {
    if (message.status === 'waiting') {
      roomStatus.textContent = 'Esperando a otra persona.';
    } else if (message.status === 'countdown') {
      roomStatus.textContent = `Cuenta regresiva: ${message.countdownSeconds ?? 0}`;
    } else {
      roomStatus.textContent = 'Partida en curso';
      matchPanel.hidden = false;
    }
  });

  room.onMessage('match-state', (match: RoomMatchSnapshot) => {
    latestMatch = match;
    renderMatch(match);
    if (match.paused) {
      roomStatus.textContent = 'Partida pausada. Esperando reconexión.';
    } else if (match.result === null) {
      roomStatus.textContent = 'Partida en curso';
    }
    matchPanel.hidden = false;
  });

  room.onMessage('next-capsule', (preview: CapsulePreview | null) => {
    nextCapsulePreview = preview;
    renderNextCapsule();
  });

  room.onMessage('connection-state', (message: ConnectionStateMessage) => {
    if (message.view === 'Paused') {
      pauseMatchTime();
      roomStatus.textContent = `Partida pausada. Quedan ${message.secondsRemaining ?? 0} segundos para reconectar.`;
      if (activeRoom === room && seatToken.length > 0) {
        reconnectControls.hidden = false;
      }
    } else if (message.view === 'Connected') {
      if (latestMatch !== null && latestMatch.result === null) {
        syncMatchTime(latestMatch.elapsedMs, false);
      }
      roomStatus.textContent = 'Partida en curso';
      reconnectControls.hidden = true;
      roomAlert.hidden = true;
    } else if (message.view === 'Finished') {
      pauseMatchTime();
      roomStatus.textContent = 'Partida finalizada';
      reconnectControls.hidden = true;
    }
  });

  room.onMessage('action-accepted', (message: RoomActionAcceptedMessage) => {
    actionStatus.textContent = `Entrada enviada al servidor (secuencia ${message.sequence}).`;
  });

  room.onMessage('action-error', (message: RoomActionErrorMessage) => {
    actionStatus.textContent = message.message;
  });

  room.onMessage('chat-history', (messages: readonly ChatMessage[]) => {
    chatMessages = [...messages];
    renderChat();
  });

  room.onMessage('chat-message', (message: ChatMessage) => {
    chatMessages = [...chatMessages, message];
    renderChat();
  });

  room.onMessage('chat-error', (message: ChatErrorMessage) => {
    chatStatus.textContent =
      message.reason === 'RateLimited'
        ? 'Espera un segundo antes de enviar otro mensaje.'
        : message.reason === 'InvalidText'
          ? 'Escribe un mensaje válido de hasta 200 caracteres.'
          : 'El chat no está disponible en este momento.';
  });

  room.onMessage('room-error', (message: RoomErrorMessage) => {
    showFailure(message.reason, 'room', () => void reconnect());
  });

  room.onMessage('match-result', (result: MatchResult) => {
    renderResult(result);
  });

  room.onDrop(() => {
    roomStatus.textContent =
      'Conexión perdida. La partida está en pausa; puedes reconectar.';
    reconnectControls.hidden = false;
    reconnectButton.disabled = false;
  });

  room.onLeave(() => {
    if (!intentionalLeave && !resultPanel.hidden) {
      roomStatus.textContent = 'Partida finalizada';
    } else if (!intentionalLeave && activeRoom === room) {
      roomStatus.textContent =
        'Conexión cerrada. Puedes reconectar o salir de la sala.';
      reconnectControls.hidden = false;
    }
  });
}

function renderMatch(match: RoomMatchSnapshot): void {
  if (seat === null) {
    return;
  }
  matchPanel.hidden = false;
  if (ownBoardRenderer === null) {
    ownBoardRenderer = new PhaserBoard(ownBoardRendererContainer);
    opponentBoardRenderer = new PhaserBoard(opponentBoardRendererContainer);
  }
  ownBoardRenderer.resume();
  opponentBoardRenderer?.resume();
  const opponentSeat = seat === 0 ? 1 : 0;
  const ownState = match.states[seat];
  const rivalState = match.states[opponentSeat];
  renderBoard(ownBoard, ownState, ownBoardRenderer);
  if (opponentBoardRenderer !== null) {
    renderBoard(opponentBoard, rivalState, opponentBoardRenderer);
  }
  ownStats.textContent = playerStatsDescription(ownState);
  opponentStats.textContent = playerStatsDescription(rivalState);
  syncMatchTime(match.elapsedMs, match.paused || match.result !== null);
}

function renderNextCapsule(): void {
  nextCapsule.textContent =
    nextCapsulePreview === null
      ? 'No disponible'
      : `${COLOR_NAMES[nextCapsulePreview.pivotColor]} y ${COLOR_NAMES[nextCapsulePreview.otherColor]}`;
}

function playerStatsDescription(state: PublicGameState): string {
  const virusesRemaining = state.board.cells.filter(
    (cell) => cell.kind === 'virus',
  ).length;
  return `Puntos: ${state.stats.score}. Virus eliminados: ${state.stats.virusesCleared}. Virus restantes: ${virusesRemaining}. Cadenas: ${state.stats.chains}. Carga de ataque: ${state.attackPoints} puntos. Obstáculos pendientes: ${state.pendingObstacles}.`;
}

function renderResult(result: MatchResult): void {
  syncMatchTime(result.durationMs, true);
  resultPanel.hidden = false;
  roomStatus.textContent = 'Partida finalizada';
  reconnectControls.hidden = true;
  matchPanel.hidden = false;
  const outcome =
    result.winnerIndex === null
      ? 'La partida terminó en empate.'
      : result.winnerIndex === seat
        ? 'Ganaste la partida.'
        : `Ganó ${latestMatch?.room.players[result.winnerIndex] ?? 'la otra persona'}.`;
  const reason = {
    AllVirusesCleared: 'Se eliminaron todos los virus.',
    BoardBlocked: 'Un tablero se bloqueó.',
    Disconnected: 'Una persona perdió la conexión.',
    SimultaneousTerminal: 'Ambos tableros terminaron a la vez.',
  }[result.reason];
  resultText.textContent = `${outcome} ${reason} Duración: ${Math.floor(result.durationMs / 1_000)} segundos.`;
  const players = latestMatch?.room.players ?? [activeAlias, 'Rival'];
  resultStats.textContent = result.stats
    .map(
      (stats, index) =>
        `${players[index] ?? `Jugador ${index + 1}`}: ${stats.score} puntos, ${stats.virusesCleared} virus eliminados y ${stats.chains} cadenas.`,
    )
    .join(' ');
}

function renderChat(): void {
  const visibleMessages = chatMessages.filter(
    (message) => !muted || message.seat === seat,
  );
  const items = visibleMessages.map((message) => {
    const item = document.createElement('li');
    const playerName =
      latestMatch?.room.players[message.seat] ??
      (message.seat === seat ? activeAlias : 'Rival');
    item.textContent = `${playerName}: ${message.text}`;
    return item;
  });
  chatHistoryList.replaceChildren(...items);
}

function storageKey(name: string): string {
  return `private-duel:${activeCode}:${name}`;
}

function sendInput(input: string | null): void {
  if (input === null || activeRoom === null || seat === null) {
    return;
  }
  if (
    latestMatch === null ||
    latestMatch.paused ||
    latestMatch.result !== null
  ) {
    actionStatus.textContent = 'La partida no acepta entradas ahora.';
    return;
  }

  inputSequence += 1;
  sessionStorage.setItem(storageKey(`sequence-${seat}`), String(inputSequence));
  activeRoom.send('input', { sequence: inputSequence, input });
  actionStatus.textContent = `Intento de ${inputName(input)} enviado.`;
}

async function createRoom(): Promise<void> {
  const alias = createAlias.value;
  if (!isAliasLengthValid(createAlias)) {
    createAlias.reportValidity();
    return;
  }
  const button = createForm.querySelector<HTMLButtonElement>(
    'button[type="submit"]',
  );
  if (button === null) {
    throw new Error('Create room button is missing');
  }
  button.disabled = true;
  clearErrors();

  try {
    const room = await client.create('private-duel', { alias });
    activateRoom(room, alias, true);
  } catch (error) {
    showFailure(failureFromError(error), 'lobby', () => void createRoom());
  } finally {
    button.disabled = false;
  }
}

async function joinRoom(): Promise<void> {
  const alias = joinAlias.value;
  if (!isAliasLengthValid(joinAlias)) {
    joinAlias.reportValidity();
    return;
  }
  const code = joinCode.value.trim().toUpperCase();
  const button = joinForm.querySelector<HTMLButtonElement>(
    'button[type="submit"]',
  );
  if (button === null) {
    throw new Error('Join room button is missing');
  }
  button.disabled = true;
  clearErrors();

  try {
    const room = await client.joinById(code, { alias });
    activateRoom(room, alias, false);
  } catch (error) {
    const failure = failureFromError(error);
    showFailure(failure, 'lobby', () => void joinRoom());
  } finally {
    button.disabled = false;
  }
}

async function reconnect(): Promise<void> {
  if (
    activeRoom === null ||
    seatToken.length === 0 ||
    activeCode.length === 0
  ) {
    showFailure('Disconnected', 'room');
    return;
  }

  reconnectButton.disabled = true;
  roomStatus.textContent = 'Reconectando…';
  clearErrors();
  try {
    await activeRoom.leave();
    const room = await client.joinById(activeCode, {
      alias: activeAlias,
      seatToken,
    });
    activateRoom(room, activeAlias, false);
  } catch (error) {
    reconnectButton.disabled = false;
    showFailure(failureFromError(error), 'room', () => void reconnect());
  }
}

async function leaveRoom(): Promise<void> {
  intentionalLeave = true;
  const room = activeRoom;
  activeRoom = null;
  if (room !== null) {
    await room.leave();
  }
  if (seat !== null) {
    sessionStorage.removeItem(storageKey('seat-token'));
    sessionStorage.removeItem(storageKey('alias'));
    sessionStorage.removeItem(storageKey(`sequence-${seat}`));
  }
  activeCode = '';
  activeAlias = '';
  seat = null;
  seatToken = '';
  latestMatch = null;
  chatMessages = [];
  roomPanel.hidden = true;
  lobby.hidden = false;
  ownBoardRenderer?.pause();
  opponentBoardRenderer?.pause();
  clearErrors();
}

function isAliasLengthValid(input: HTMLInputElement): boolean {
  const isValid = [...input.value.trim()].length <= 20;
  input.setCustomValidity(
    isValid ? '' : 'El alias debe tener 20 caracteres o menos.',
  );
  return isValid;
}

for (const aliasInput of [createAlias, joinAlias]) {
  aliasInput.addEventListener('input', () => {
    isAliasLengthValid(aliasInput);
  });
}

createForm.addEventListener('submit', (event) => {
  event.preventDefault();
  void createRoom();
});

joinForm.addEventListener('submit', (event) => {
  event.preventDefault();
  void joinRoom();
});

chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (
    activeRoom === null ||
    chatInput.value.length === 0 ||
    chatSendButton.disabled
  ) {
    return;
  }
  activeRoom.send('chat', { text: chatInput.value });
  chatInput.value = '';
  chatSendButton.disabled = true;
  window.setTimeout(() => {
    chatSendButton.disabled = false;
  }, 1_000);
  chatStatus.textContent = '';
});

reconnectButton.addEventListener('click', () => void reconnect());
leaveButton.addEventListener('click', () => void leaveRoom());
returnButton.addEventListener('click', () => void leaveRoom());

muteButton.addEventListener('click', () => {
  muted = !muted;
  muteButton.setAttribute('aria-pressed', String(muted));
  muteButton.textContent = muted
    ? 'Activar sonido del rival'
    : 'Silenciar rival';
  renderChat();
});

window.addEventListener('keydown', (event) => {
  if (
    event.target instanceof HTMLInputElement ||
    event.target instanceof HTMLTextAreaElement ||
    event.target instanceof HTMLButtonElement
  ) {
    return;
  }
  const input = mapKeyboard(event.key);
  if (input !== null) {
    event.preventDefault();
    sendInput(input);
  }
});

document
  .querySelectorAll<HTMLButtonElement>('[data-input]')
  .forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.input;
      if (isTouchAction(action)) {
        sendInput(mapTouch(action));
      }
    });
  });

function isTouchAction(value: string | undefined): value is TouchAction {
  return (
    value === 'MoveLeft' ||
    value === 'MoveRight' ||
    value === 'SoftDrop' ||
    value === 'HardDrop' ||
    value === 'RotateClockwise' ||
    value === 'RotateCounterclockwise'
  );
}
