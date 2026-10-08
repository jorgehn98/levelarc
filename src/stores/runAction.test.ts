import { describe, expect, it, vi } from 'vitest';

import { runAction, type ActionHost } from './runAction';

function createHost(overrides: Partial<ActionHost> = {}) {
  const state = { isBusy: false, pendingHabitIds: [] as string[] };
  const host: ActionHost = {
    getState: () => state,
    setState: (update) => Object.assign(state, update(state)),
    refresh: vi.fn(async () => undefined),
    reportFailure: vi.fn(),
    onAfterError: vi.fn(),
    ...overrides,
  };
  return { host, state };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve };
}

describe('runAction', () => {
  it('returns the value of the task and refreshes while the action is still marked busy', async () => {
    const { host, state } = createHost();
    const busyDuringRefresh: boolean[] = [];
    host.refresh = vi.fn(async () => {
      busyDuringRefresh.push(state.isBusy);
    });

    const outcome = await runAction(host, async () => 'saved');

    expect(outcome).toEqual({ ok: true, value: 'saved' });
    expect(busyDuringRefresh).toEqual([true]);
    expect(state.isBusy).toBe(false);
  });

  it('reports a failed task, clears the busy flag and resolves to the failure result', async () => {
    const { host, state } = createHost();
    const error = new Error('disk full');
    const after = vi.fn();

    const outcome = await runAction(
      host,
      async () => {
        throw error;
      },
      { after },
    );

    expect(outcome).toEqual({ ok: false, reason: 'failed' });
    expect(host.reportFailure).toHaveBeenCalledWith(error);
    expect(state.isBusy).toBe(false);
    // Nada se escribió: ni se relee ni corre lo posterior.
    expect(host.refresh).not.toHaveBeenCalled();
    expect(after).not.toHaveBeenCalled();
  });

  it('uses the action own report instead of the default one', async () => {
    const { host } = createHost();
    const report = vi.fn();
    const error = new Error('not a backup');

    await runAction(
      host,
      async () => {
        throw error;
      },
      { report },
    );

    expect(report).toHaveBeenCalledWith(error);
    expect(host.reportFailure).not.toHaveBeenCalled();
  });

  it('drops a re-entrant global action as busy without running or reporting it', async () => {
    const { host, state } = createHost();
    const gate = deferred<string>();
    const second = vi.fn(async () => 'second');

    const first = runAction(host, () => gate.promise);
    expect(state.isBusy).toBe(true);

    expect(await runAction(host, second)).toEqual({ ok: false, reason: 'busy' });
    expect(second).not.toHaveBeenCalled();
    expect(host.reportFailure).not.toHaveBeenCalled();
    // La acción descartada no suelta la marca de la que sigue en curso.
    expect(state.isBusy).toBe(true);

    gate.resolve('first');
    expect(await first).toEqual({ ok: true, value: 'first' });
    expect(state.isBusy).toBe(false);
  });

  it('blocks only the habit that has an action in flight', async () => {
    const { host, state } = createHost();
    const gate = deferred<void>();

    const first = runAction(host, () => gate.promise, { habitId: 'a' });
    expect(state.pendingHabitIds).toEqual(['a']);

    expect(await runAction(host, async () => undefined, { habitId: 'a' })).toEqual({ ok: false, reason: 'busy' });
    expect(await runAction(host, async () => 'other', { habitId: 'b' })).toEqual({ ok: true, value: 'other' });
    expect(state.isBusy).toBe(false);

    gate.resolve();
    await first;
    expect(state.pendingHabitIds).toEqual([]);
  });

  it('keeps the success when the refresh after the write fails', async () => {
    const error = new Error('read failed');
    const { host, state } = createHost({
      refresh: vi.fn(async () => {
        throw error;
      }),
    });
    const after = vi.fn();

    const outcome = await runAction(host, async () => 'saved', { after });

    expect(outcome).toEqual({ ok: true, value: 'saved' });
    expect(host.reportFailure).not.toHaveBeenCalled();
    expect(host.onAfterError).toHaveBeenCalledWith(error);
    expect(state.isBusy).toBe(false);
    // Lo posterior se sigue intentando.
    expect(after).toHaveBeenCalledWith('saved');
  });

  it('keeps the success when the work after the write fails', async () => {
    const { host } = createHost();
    const error = new Error('achievement check failed');

    const outcome = await runAction(host, async () => 'saved', {
      after: async () => {
        throw error;
      },
    });

    expect(outcome).toEqual({ ok: true, value: 'saved' });
    expect(host.reportFailure).not.toHaveBeenCalled();
    expect(host.onAfterError).toHaveBeenCalledWith(error);
  });

  it('releases the habit before the slow work after the write, so the next tap is not swallowed', async () => {
    const { host, state } = createHost();
    const gate = deferred<void>();
    const order: string[] = [];
    host.refresh = vi.fn(async () => {
      order.push(`refresh:${state.pendingHabitIds.join()}`);
    });

    const first = runAction(host, async () => 'one', {
      habitId: 'a',
      after: async () => {
        order.push(`after:${state.pendingHabitIds.join()}`);
        await gate.promise;
      },
    });
    await vi.waitFor(() => expect(order).toEqual(['refresh:a', 'after:']));

    // La primera acción sigue con su trabajo posterior, pero el hábito ya admite otro toque.
    expect(await runAction(host, async () => 'two', { habitId: 'a' })).toEqual({ ok: true, value: 'two' });

    gate.resolve();
    expect(await first).toEqual({ ok: true, value: 'one' });
  });

  it('skips the refresh for actions that do not change repository data', async () => {
    const { host } = createHost();

    await runAction(host, async () => undefined, { refresh: false });

    expect(host.refresh).not.toHaveBeenCalled();
  });
});
