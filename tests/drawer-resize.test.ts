import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { clampDrawerWidth, draggedDrawerWidth, drawerWidthBounds, keyboardDrawerWidth } from '../src/features/experiments/drawerResize.ts'

describe('details drawer resizing', () => {
  it('grows when its left edge moves left and shrinks when it moves right', () => {
    assert.equal(draggedDrawerWidth(520, 900, 700, 1440), 720)
    assert.equal(draggedDrawerWidth(520, 900, 1000, 1440), 420)
    assert.equal(draggedDrawerWidth(520, 900, 900, 1440), 520)
  })

  it('keeps a readable minimum and stops at the viewport margins', () => {
    assert.equal(draggedDrawerWidth(520, 900, 2000, 1440), 380)
    assert.equal(draggedDrawerWidth(520, 900, -2000, 1440), 1416)
    assert.equal(clampDrawerWidth(900, 800), 776)
    assert.deepEqual(drawerWidthBounds(320), { min: 296, max: 296 })
    assert.equal(clampDrawerWidth(520, 320), 296)
  })

  it('lets the keyboard move the edge in the same direction as a drag', () => {
    assert.equal(keyboardDrawerWidth(520, 'ArrowLeft', 1440), 530)
    assert.equal(keyboardDrawerWidth(520, 'ArrowRight', 1440), 510)
    assert.equal(keyboardDrawerWidth(520, 'ArrowLeft', 1440, true), 570)
    assert.equal(keyboardDrawerWidth(520, 'ArrowRight', 1440, true), 470)
    assert.equal(keyboardDrawerWidth(380, 'ArrowRight', 1440), 380)
    assert.equal(keyboardDrawerWidth(1416, 'ArrowLeft', 1440), 1416)
  })

  it('supports minimum and maximum shortcuts without consuming unrelated keys', () => {
    assert.equal(keyboardDrawerWidth(520, 'Home', 1440), 380)
    assert.equal(keyboardDrawerWidth(520, 'End', 1440), 1416)
    assert.equal(keyboardDrawerWidth(520, 'Escape', 1440), undefined)
    assert.equal(keyboardDrawerWidth(520, 'Tab', 1440), undefined)
  })
})
