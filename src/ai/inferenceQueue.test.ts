import { describe, expect, it } from 'vitest';

import { InferenceSkippedError, createInferenceQueue } from './inferenceQueue';

// Tarea controlable a mano: permite decidir cuándo "termina" una inferencia.
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('inferenceQueue', () => {
  it('runs chat completions one at a time, in arrival order', async () => {
    const queue = createInferenceQueue();
    const first = deferred<string>();
    const log: string[] = [];

    const a = queue.run('chat', () => {
      log.push('a:start');
      return first.promise;
    });
    const b = queue.run('chat', async () => {
      log.push('b:start');
      return 'b';
    });

    await flush();
    expect(log).toEqual(['a:start']);

    first.resolve('a');
    await expect(a).resolves.toBe('a');
    await expect(b).resolves.toBe('b');
    expect(log).toEqual(['a:start', 'b:start']);
  });

  it('skips a background completion instead of queueing it while the engine is busy', async () => {
    const queue = createInferenceQueue();
    const chat = deferred<string>();
    let backgroundRan = false;

    const chatResult = queue.run('chat', () => chat.promise);
    const background = queue.run('background', async () => {
      backgroundRan = true;
      return 'briefing';
    });

    await expect(background).rejects.toBeInstanceOf(InferenceSkippedError);
    chat.resolve('reply');
    await expect(chatResult).resolves.toBe('reply');
    await flush();
    expect(backgroundRan).toBe(false);
  });

  it('lets chat preempt a running background completion and discards its partial result', async () => {
    const queue = createInferenceQueue();
    const background = deferred<string>();
    let stopCalls = 0;
    let chatStarted = false;

    const backgroundResult = queue.run(
      'background',
      () => background.promise,
      () => {
        stopCalls += 1;
      },
    );
    await flush();

    const chatResult = queue.run('chat', async () => {
      chatStarted = true;
      return 'reply';
    });
    expect(stopCalls).toBe(1);

    // El chat no arranca hasta que la de fondo suelta el contexto.
    await flush();
    expect(chatStarted).toBe(false);

    // El nativo devuelve texto parcial al cortarse: no debe llegar a la UI.
    background.resolve('partial text');
    await expect(backgroundResult).rejects.toBeInstanceOf(InferenceSkippedError);
    await expect(chatResult).resolves.toBe('reply');
  });

  it('cancelling chat never stops an unrelated background completion', async () => {
    const queue = createInferenceQueue();
    const background = deferred<string>();
    let stopCalls = 0;

    const backgroundResult = queue.run(
      'background',
      () => background.promise,
      () => {
        stopCalls += 1;
      },
    );
    await flush();

    queue.cancel('chat');
    expect(stopCalls).toBe(0);

    background.resolve('briefing');
    await expect(backgroundResult).resolves.toBe('briefing');
  });

  it('cancelling chat stops the running chat completion and reports it as skipped', async () => {
    const queue = createInferenceQueue();
    const chat = deferred<string>();
    let stopCalls = 0;

    const chatResult = queue.run(
      'chat',
      () => chat.promise,
      () => {
        stopCalls += 1;
      },
    );
    await flush();

    queue.cancel('chat');
    expect(stopCalls).toBe(1);

    chat.resolve('half a reply');
    await expect(chatResult).rejects.toBeInstanceOf(InferenceSkippedError);
  });

  it('drops a cancelled chat that was still waiting, without running it', async () => {
    const queue = createInferenceQueue();
    const first = deferred<string>();
    let waitingRan = false;
    let waitingStopCalls = 0;

    const running = queue.run('chat', () => first.promise);
    await flush();
    const waiting = queue.run(
      'chat',
      async () => {
        waitingRan = true;
        return 'late';
      },
      () => {
        waitingStopCalls += 1;
      },
    );

    queue.cancel('chat');
    first.resolve('x');

    await expect(running).rejects.toBeInstanceOf(InferenceSkippedError);
    await expect(waiting).rejects.toBeInstanceOf(InferenceSkippedError);
    expect(waitingRan).toBe(false);
    // No estaba corriendo: no hay nada nativo que cortar en su nombre.
    expect(waitingStopCalls).toBe(0);
  });

  it('keeps working after a completion fails and surfaces the real error', async () => {
    const queue = createInferenceQueue();

    await expect(
      queue.run('chat', async () => {
        throw new Error('native crash');
      }),
    ).rejects.toThrow('native crash');

    await expect(queue.run('background', async () => 'ok')).resolves.toBe('ok');
  });
});
