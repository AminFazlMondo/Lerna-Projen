const {NodePackageManager, NpmAccess, JsiiProject} = require('projen')

const project = new JsiiProject({
  defaultReleaseBranch: 'main',
  name: 'lerna-project',
  description: 'A lerna project for managing monorepo using lerna',
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
  peerDeps: [
    'projen',
  ],
  devDeps: [
    '@types/babel__core',
  ],
  releaseToNpm: true,
  npmAccess: NpmAccess.PUBLIC,
  docgen: true,
  tsconfig: {
    compilerOptions: {
      lib: ['es2019'],
    },
  },
  minNodeVersion: '12.0.0',
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

project.synth()