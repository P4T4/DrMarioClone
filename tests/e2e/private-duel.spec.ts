import { expect, test } from '@playwright/test';

test('two sessions create a private room and exchange match state and chat', async ({
  browser,
}) => {
  const ownerContext = await browser.newContext({ hasTouch: true });
  const guestContext = await browser.newContext();
  const thirdContext = await browser.newContext();

  try {
    const owner = await ownerContext.newPage();
    const guest = await guestContext.newPage();
    const third = await thirdContext.newPage();

    await owner.goto('/');
    await expect(owner.getByLabel('Tu alias')).toBeVisible({ timeout: 1_000 });
    await owner.getByLabel('Tu alias').fill('Owner');
    await owner.getByRole('button', { name: 'Crear sala' }).click();
    await expect(
      owner.getByRole('heading', { name: 'Sala creada' }),
    ).toBeVisible();
    const roomCode = await owner
      .getByRole('textbox', { name: 'Código para invitar' })
      .inputValue();
    expect(roomCode).toMatch(/^[0-9A-HJKMNP-TV-Z]{8}$/);

    await third.goto('/');
    await third.getByLabel('Alias para unirte').fill('Third');
    await third.getByLabel('Código de sala').fill('INVALID!');
    await third.getByRole('button', { name: 'Unirse a sala' }).click();
    await expect(third.getByRole('alert')).toContainText('no es válido');

    await guest.goto('/');
    await guest.getByLabel('Alias para unirte').fill('Guest');
    await guest.getByLabel('Código de sala').fill(roomCode);
    await guest.getByRole('button', { name: 'Unirse a sala' }).click();
    await expect(owner.locator('#room-status')).toContainText(
      'Cuenta regresiva',
    );
    await expect(guest.locator('#room-status')).toContainText(
      'Cuenta regresiva',
    );
    await expect(owner.locator('#room-status')).toContainText(
      'Partida en curso',
    );
    await expect(guest.locator('#room-status')).toContainText(
      'Partida en curso',
    );
    await expect(owner.locator('#own-board canvas')).toBeVisible();
    await expect(guest.locator('#own-board canvas')).toBeVisible();

    await third.getByLabel('Código de sala').fill(roomCode);
    await third.getByRole('button', { name: 'Unirse a sala' }).click();
    await expect(third.getByRole('alert')).toContainText('llena');

    const ownerBoardCells = owner.locator('#own-board [role="gridcell"]');
    const guestOpponentCells = guest.locator(
      '#opponent-board [role="gridcell"]',
    );
    const initialOwnerBoard = await ownerBoardCells.evaluateAll((cells) =>
      cells.map((cell) => cell.getAttribute('aria-label')),
    );
    await expect(owner.locator('#own-stats')).toContainText(
      'Virus restantes: 15',
    );
    await expect(owner.locator('#own-stats')).toContainText(
      'Carga de ataque: 0 puntos',
    );
    await expect(owner.locator('#opponent-stats')).toContainText(
      'Obstáculos pendientes: 0',
    );
    await expect(guest.locator('#own-stats')).toContainText(
      'Virus restantes: 15',
    );
    await expect(guest.locator('#opponent-stats')).toContainText(
      'Carga de ataque: 0 puntos',
    );
    await expect(owner.locator('#match-time')).toHaveText(/^\d{2}:\d{2}$/);
    await expect(owner.locator('#next-capsule')).toContainText(
      /rojo|azul|amarillo/,
    );
    await expect(guest.locator('#next-capsule')).toContainText(
      /rojo|azul|amarillo/,
    );
    const initialMatchTime = await owner.locator('#match-time').innerText();
    await expect
      .poll(() => owner.locator('#match-time').innerText())
      .not.toBe(initialMatchTime);
    const movementKey = await ownerBoardCells.evaluateAll((cells) => {
      const labels = cells.map((cell) => cell.getAttribute('aria-label') ?? '');
      const activeCells = labels.flatMap((label, index) =>
        label.includes('cápsula activa') ? [index] : [],
      );
      const activeSet = new Set(activeCells);
      const canMove = (columnDelta: number) =>
        activeCells.every((index) => {
          const column = index % 8;
          const target = index + columnDelta;
          return (
            column + columnDelta >= 0 &&
            column + columnDelta < 8 &&
            (activeSet.has(target) || labels[target]?.endsWith(': vacío'))
          );
        });

      return canMove(-1) ? 'ArrowLeft' : canMove(1) ? 'ArrowRight' : null;
    });

    if (movementKey === null) {
      throw new Error('Active capsule has no valid horizontal keyboard move');
    }
    await owner.locator('#own-board').click();
    await owner.keyboard.press(movementKey);
    await expect(owner.locator('#action-status')).toContainText(
      'Entrada enviada',
    );
    await expect
      .poll(async () => {
        const [ownerState, guestState] = await Promise.all([
          ownerBoardCells.evaluateAll((cells) =>
            cells.map((cell) => cell.getAttribute('aria-label')),
          ),
          guestOpponentCells.evaluateAll((cells) =>
            cells.map((cell) => cell.getAttribute('aria-label')),
          ),
        ]);
        return (
          JSON.stringify(ownerState) !== JSON.stringify(initialOwnerBoard) &&
          JSON.stringify(ownerState) === JSON.stringify(guestState)
        );
      })
      .toBe(true);

    const touchInput = await ownerBoardCells.evaluateAll((cells) => {
      const labels = cells.map((cell) => cell.getAttribute('aria-label') ?? '');
      const activeCells = labels.flatMap((label, index) =>
        label.includes('cápsula activa') ? [index] : [],
      );
      const activeSet = new Set(activeCells);
      const canMove = (columnDelta: number) =>
        activeCells.every((index) => {
          const column = index % 8;
          const target = index + columnDelta;
          return (
            column + columnDelta >= 0 &&
            column + columnDelta < 8 &&
            (activeSet.has(target) || labels[target]?.endsWith(': vacío'))
          );
        });

      return canMove(-1) ? 'MoveLeft' : canMove(1) ? 'MoveRight' : null;
    });
    if (touchInput === null) {
      throw new Error('Active capsule has no valid horizontal touch move');
    }
    const beforeTouchState = await ownerBoardCells.evaluateAll((cells) =>
      cells.map((cell) => cell.getAttribute('aria-label')),
    );
    await owner
      .getByRole('button', {
        name:
          touchInput === 'MoveLeft'
            ? 'Mover a la izquierda'
            : 'Mover a la derecha',
      })
      .tap();
    await expect
      .poll(() =>
        ownerBoardCells.evaluateAll((cells) =>
          cells.map((cell) => cell.getAttribute('aria-label')),
        ),
      )
      .not.toEqual(beforeTouchState);
    await expect
      .poll(async () => {
        const [ownerState, guestState] = await Promise.all([
          ownerBoardCells.evaluateAll((cells) =>
            cells.map((cell) => cell.getAttribute('aria-label')),
          ),
          guestOpponentCells.evaluateAll((cells) =>
            cells.map((cell) => cell.getAttribute('aria-label')),
          ),
        ]);
        return JSON.stringify(ownerState) === JSON.stringify(guestState);
      })
      .toBe(true);

    await owner.getByLabel('Mensaje de chat').fill('Hola desde owner');
    await owner.getByRole('button', { name: 'Enviar mensaje' }).click();
    await expect(owner.getByText('Hola desde owner')).toBeVisible();
    await expect(guest.getByText('Hola desde owner')).toBeVisible();

    await guest.getByRole('button', { name: 'Silenciar rival' }).click();
    const sendButton = owner.getByRole('button', { name: 'Enviar mensaje' });
    await expect(sendButton).toBeDisabled();
    await expect(sendButton).toBeEnabled();
    await owner.getByLabel('Mensaje de chat').fill('mensaje silenciado');
    await sendButton.click();
    await expect(owner.getByText('mensaje silenciado')).toBeVisible();
    await expect(guest.getByText('mensaje silenciado')).toHaveCount(0);

    await guestContext.setOffline(true);
    await expect(owner.locator('#room-status')).toContainText(
      'Partida pausada',
      { timeout: 10_000 },
    );
    await expect(guest.locator('#room-status')).toContainText(
      'Conexión perdida',
      { timeout: 10_000 },
    );
    const pausedMatchTime = await owner.locator('#match-time').innerText();
    await owner.waitForTimeout(1_200);
    await expect(owner.locator('#match-time')).toHaveText(pausedMatchTime);
    await guestContext.setOffline(false);
    await guest.getByRole('button', { name: 'Reconectar' }).click();
    await expect(owner.locator('#room-status')).toContainText(
      'Partida en curso',
    );
    await expect(guest.locator('#room-status')).toContainText(
      'Partida en curso',
    );

    await owner.locator('#room-status').click();
    for (let drop = 0; drop < 20; drop += 1) {
      await owner.keyboard.press('Space');
    }
    await expect(owner.locator('#result-text')).toContainText('Ganó Guest', {
      timeout: 10_000,
    });
    await expect(guest.locator('#result-text')).toContainText('Ganaste', {
      timeout: 10_000,
    });
    await expect(owner.locator('#result-stats')).toContainText('cadenas');
    await expect(
      owner.getByRole('button', { name: 'Volver al inicio' }),
    ).toBeVisible();
    await owner.getByRole('button', { name: 'Volver al inicio' }).click();
    await expect(owner.getByLabel('Tu alias')).toBeVisible();
  } finally {
    await Promise.all([
      ownerContext.close(),
      guestContext.close(),
      thirdContext.close(),
    ]);
  }
});

test('alias input accepts twenty non-BMP Unicode code points', async ({
  page,
}) => {
  await page.goto('/');

  const alias = page.getByLabel('Tu alias');
  await alias.pressSequentially('😀'.repeat(20));

  await expect(alias).toHaveValue('😀'.repeat(20));
  await alias.fill('😀'.repeat(21));
  expect(
    await alias.evaluate((input: HTMLInputElement) => input.checkValidity()),
  ).toBe(false);
});

test('an expired room explains how to recover on both sessions', async ({
  browser,
}) => {
  const creatorContext = await browser.newContext();
  const joinerContext = await browser.newContext();

  try {
    const creator = await creatorContext.newPage();
    const joiner = await joinerContext.newPage();

    await creator.goto('/');
    await creator.getByLabel('Tu alias').fill('Owner');
    await creator.getByRole('button', { name: 'Crear sala' }).click();
    await expect(
      creator.getByRole('textbox', { name: 'Código para invitar' }),
    ).toBeVisible();
    const roomCode = await creator
      .getByRole('textbox', { name: 'Código para invitar' })
      .inputValue();

    await expect(creator.locator('#room-alert')).toContainText('caducado', {
      timeout: 10_000,
    });
    await expect(
      creator.getByRole('button', { name: 'Intentar de nuevo' }),
    ).toBeVisible();

    await joiner.goto('/');
    await joiner.getByLabel('Alias para unirte').fill('Guest');
    await joiner.getByLabel('Código de sala').fill(roomCode);
    await joiner.getByRole('button', { name: 'Unirse a sala' }).click();
    await expect(joiner.getByRole('alert')).toContainText('caducado');
    await expect(
      joiner.getByRole('button', { name: 'Intentar de nuevo' }),
    ).toBeVisible();
  } finally {
    await Promise.all([creatorContext.close(), joinerContext.close()]);
  }
});
