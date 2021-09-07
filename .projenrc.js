const {TypeScriptProject, NodePackageManager, NpmAccess} = require('projen')

const project = new TypeScriptProject({
  defaultReleaseBranch: 'main',
  name: 'lerna-project',
  description: 'A Lerna Project for projen',
  keywords: [
    'lerna',
    'monorepo',
    'projen',
    'typescript',
  ],
  majorVersion: 0,
  packageName: 'lerna-projen',
  packageManager: NodePackageManager.NPM,
  repository: 'https://github.com/AminFazlMondo/Lerna-Projen.git',
  authorEmail: 'amin.fazl@mondo.com.au',
  authorName: 'Amin Fazl',
  bundledDeps: [
    'projen',
  ],
  devDeps: [
    '@types/babel__core',
  ],
  releaseToNpm: true,
  npmAccess: NpmAccess.PUBLIC,
  docgen: true,
})

const additionalRules = {
  'curly': [
    'error',
    'multi',
    'consistent',
  ],
  'semi': [
    'error',
    'never',
  ],
  'object-curly-spacing': 'error',
  'nonblock-statement-body-position': ['error', 'below'],
}

project.eslint.addRules(additionalRules)
project.addBins({'lerna-projen': './bin/lerna-projen'})

project.synth()