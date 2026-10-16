import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
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
} as const

describe('architecture boundaries', () => {
  for (const [layer, allowed] of Object.entries(boundaries)) {
    it(`${layer} cannot depend on feature UI or higher layers`, () => {
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
            const dependency = relative(source, resolve(dirname(file), target)).split(sep)[0]
            assert.ok((allowed as readonly string[]).includes(dependency), `${layer}/${name} depends on ${target}`)
            if (layer === 'data' || layer === 'chart-model' || layer === 'dashboards') {
              assert.ok(!target.endsWith('.tsx'), `${layer}/${name} imports a React component`)
            }
          } else if (layer !== 'charts') {
            assert.ok(!target.startsWith('react'), `${layer}/${name} imports React`)
          }
        }
      }
    })
  }
})
