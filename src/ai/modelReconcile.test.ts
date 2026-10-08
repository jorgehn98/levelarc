import { describe, expect, it } from 'vitest';

import { planModelReconcile } from './modelReconcile';

describe('planModelReconcile', () => {
  it('adopts a complete model left on disk after a reset or backup import, without enabling the engine', () => {
    expect(planModelReconcile('none', true, false)).toEqual({ status: 'ready' });
  });

  it('leaves a clean profile alone when there is no model file', () => {
    expect(planModelReconcile('none', false, false)).toBeNull();
  });

  it('recovers an interrupted download that had actually finished', () => {
    expect(planModelReconcile('downloading', true, false)).toEqual({ status: 'ready', engine: 'llama' });
  });

  it('cleans up the partial file of an interrupted download', () => {
    expect(planModelReconcile('downloading', false, false)).toEqual({
      status: 'none',
      engine: 'template',
      deletePartial: true,
    });
  });

  it('degrades a ready profile whose file is gone', () => {
    expect(planModelReconcile('ready', false, false)).toEqual({ status: 'none', engine: 'template' });
    expect(planModelReconcile('ready', true, false)).toBeNull();
  });

  it('never interferes with a live download', () => {
    expect(planModelReconcile('downloading', false, true)).toBeNull();
    expect(planModelReconcile('none', true, true)).toBeNull();
  });

  it('keeps a failed download as an error so the screen can offer retry', () => {
    expect(planModelReconcile('error', false, false)).toBeNull();
  });
});
