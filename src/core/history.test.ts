import { describe, expect, it } from 'vitest'
import { EditHistory } from './history'

describe('EditHistory', () => {
  it('undoes and redoes multiple edits in order', () => {
    const history = new EditHistory<string>()
    history.commit('original')
    history.commit('trimmed')

    expect(history.undo('cut')).toBe('trimmed')
    expect(history.undo('trimmed')).toBe('original')
    expect(history.redo('original')).toBe('trimmed')
    expect(history.redo('trimmed')).toBe('cut')
  })

  it('clears redo history after a new edit', () => {
    const history = new EditHistory<string>()
    history.commit('original')
    history.commit('trimmed')
    history.undo('cut')
    history.commit('new-cut')

    expect(history.canRedo).toBe(false)
  })
})
