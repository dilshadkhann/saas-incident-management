import { describe, expect, it } from 'vitest'

// Guards against the Windows/PowerShell encoding corruption that previously put
// "â€¦" and "Â·" into user-visible strings, and against stray UTF-8 byte-order marks.
const MOJIBAKE = ['â€¦', 'Â·', 'â€™', 'Ã©']

const sources = import.meta.glob('../**/*.{ts,tsx,css}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const files = Object.entries(sources).filter(([path]) => !path.endsWith('encoding.test.ts'))

describe('source file encoding', () => {
  it('finds source files to check', () => {
    expect(files.length).toBeGreaterThan(5)
  })

  it.each(files)('%s has no BOM or mojibake', (_path, text) => {
    expect(text.charCodeAt(0)).not.toBe(0xfeff)
    for (const sequence of MOJIBAKE) {
      expect(text.includes(sequence), `contains corrupted sequence ${sequence}`).toBe(false)
    }
  })
})
