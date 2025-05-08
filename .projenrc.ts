import { javascript, cdk, TextFile } from 'projen';

const repository = 'https://github.com/AminFazlMondo/Lerna-Projen.git';
const nodeVersion = '20';

const project = new cdk.JsiiProject({
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
  packageManager: javascript.NodePackageManager.NPM,
  pnpmVersion: '8',
  repository,
  repositoryUrl: repository,
  authorAddress: 'amin.fazl@mondo.com.au',
  author: 'Amin Fazl',
  peerDeps: [
    'projen',
    'constructs',
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
  npmAccess: javascript.NpmAccess.PUBLIC,
  docgen: true,
  tsconfig: {
    compilerOptions: {
      lib: ['es2019'],
    },
  },
  workflowNodeVersion: nodeVersion,
  minNodeVersion: `${nodeVersion}.0.0`,
  publishTasks: true,
  autoApproveOptions: {
    allowedUsernames: ['AminFazlMondo'],
  },
  autoApproveUpgrades: true,
  jsiiVersion: '5.8.x',
  releaseFailureIssue: true,
});

new TextFile(project, '.nvmrc', {
  lines: [nodeVersion],
});

project.synth();