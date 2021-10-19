import {NodePackageManager, NpmAccess, JsiiProject} from 'projen'

const repository = 'https://github.com/AminFazlMondo/Lerna-Projen.git'

const project = new JsiiProject({
  projenrcTs: true,
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
  repository,
  repositoryUrl: repository,
  authorAddress: 'amin.fazl@mondo.com.au',
  author: 'Amin Fazl',
  peerDeps: [
    'projen',
  ],
  devDeps: [
    '@types/babel__core',
    '@types/fs-extra',
  ],
  bundledDeps: [
    'commander',
    'fs-extra',
  ],
  releaseToNpm: true,
  npmAccess: NpmAccess.PUBLIC,
  docgen: true,
  tsconfig: {
    compilerOptions: {
      lib: ['es2019'],
    },
  },
  minNodeVersion: '12.7.0',
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

project.eslint?.addRules(additionalRules)

project.synth()