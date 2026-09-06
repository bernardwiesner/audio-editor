export class EditHistory<T> {
  private undoStack: T[] = []
  private redoStack: T[] = []

  constructor (private readonly limit = 20) {}

  public commit (current: T): void {
    this.undoStack.push(current)
    if (this.undoStack.length > this.limit) {
      this.undoStack.shift()
    }
    this.redoStack = []
  }

  public undo (current: T): T | null {
    const previous = this.undoStack.pop()
    if (!previous) return null

    this.redoStack.push(current)
    return previous
  }

  public redo (current: T): T | null {
    const next = this.redoStack.pop()
    if (!next) return null

    this.undoStack.push(current)
    return next
  }

  public get canUndo (): boolean {
    return this.undoStack.length > 0
  }

  public get canRedo (): boolean {
    return this.redoStack.length > 0
  }
}
