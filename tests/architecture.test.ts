import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'
import ts from 'typescript'

const source = fileURLToPath(new URL('../src/', import.meta.url))
const boundaries = {
  data: ['data'],
  charts: ['charts'],
  'chart-model': ['chart-model', 'data', 'charts'],
  dashboards: ['dashboards', 'chart-model', 'data', 'charts'],
  components: ['components', 'data'],
  'features/charts': ['features/charts', 'chart-model', 'data', 'charts', 'components', 'format.ts'],
  'features/dashboards': ['features/dashboards', 'features/charts', 'dashboards', 'chart-model', 'data', 'charts', 'components'],
} as const
const pureLayers = new Set(['data', 'chart-model', 'dashboards'])

describe('architecture boundaries', () => {
  for (const [layer, allowed] of Object.entries(boundaries)) {
    it(`${layer} depends only on its allowed layers`, () => {
      const folder = resolve(source, layer)
      for (const name of readdirSync(folder, { recursive: true, encoding: 'utf8' }).filter(name => /\.tsx?$/.test(name))) {
        const file = resolve(folder, name)
        const tree = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest)
        for (const statement of tree.statements) {
          if (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) continue
          const specifier = statement.moduleSpecifier
          if (!specifier || !ts.isStringLiteral(specifier)) continue
          const target = specifier.text
          if (target.startsWith('.')) {
            const dependency = relative(source, resolve(dirname(file), target)).split(sep).join('/')
            assert.ok(allowed.some(prefix => dependency === prefix || dependency.startsWith(`${prefix}/`)), `${layer}/${name} depends on ${target}`)
            if (pureLayers.has(layer)) {
              const component = target.endsWith('.tsx') || (!/\.[^/]+$/.test(target) && existsSync(resolve(dirname(file), `${target}.tsx`)))
              assert.ok(!component, `${layer}/${name} imports a React component`)
            }
          } else if (pureLayers.has(layer)) {
            assert.ok(!target.startsWith('react'), `${layer}/${name} imports React`)
          }
        }
      }
    })
  }
})
