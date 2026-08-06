import { test } from 'node:test'
import assert from 'node:assert/strict'
import { debounce } from './debounce'

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

test('collapses a burst of calls into a single trailing call', async () => {
  let calls = 0
  const debounced = debounce(() => {
    calls += 1
  }, 20)

  debounced()
  debounced()
  debounced()
  assert.equal(calls, 0) // not yet — still within the quiet window

  await wait(40)
  assert.equal(calls, 1)
})

test('a new call after the quiet window fires again', async () => {
  let calls = 0
  const debounced = debounce(() => {
    calls += 1
  }, 20)

  debounced()
  await wait(40)
  assert.equal(calls, 1)

  debounced()
  await wait(40)
  assert.equal(calls, 2)
})

test('passes through the arguments of the last call in the burst', async () => {
  const seen: number[] = []
  const debounced = debounce((n: number) => {
    seen.push(n)
  }, 20)

  debounced(1)
  debounced(2)
  debounced(3)
  await wait(40)
  assert.deepEqual(seen, [3])
})
