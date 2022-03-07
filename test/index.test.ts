import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import {LogLevel, javascript, typescript, cdk} from 'projen'
import {synthSnapshot} from 'projen/lib/util/synth'
import {LernaProject} from '../src'

const tasksFilePath = '.projen/tasks.json'
const lernaFilePath = 'lerna.json'

interface GenerateProjectsParams {
  /**
   * @default false
   */
  docgen?: boolean;

  /**
   * @default true
   */
  subProjectHasDocs?: boolean;

  /**
   * @default false
   */
  sinceLastRelease?: boolean;

  /**
   * @default false
   */
  projenrcTs?: boolean;
}

function mkdtemp() {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'projen-test-'))
  return tmpdir
}

function generateProjects(parentDocsFolder: string, subProjectDirectory: string, params: GenerateProjectsParams = {}): LernaProject {
  const parentProject = new LernaProject({
    name: 'test',
    defaultReleaseBranch: 'test',
    logging: {
      level: LogLevel.OFF,
    },
    docsDirectory: parentDocsFolder,
    docgen: params.docgen ?? false,
    sinceLastRelease: params.sinceLastRelease ?? false,
    projenrcTs: params.projenrcTs ?? false,
  })

  const SubProjectType = (params.subProjectHasDocs ?? true) ? typescript.TypeScriptProject : javascript.NodeProject
  const subProject = new SubProjectType({
    name: 'test-sub-project',
    parent: parentProject,
    outdir: subProjectDirectory,
    defaultReleaseBranch: 'test',
    logging: {
      level: LogLevel.OFF,
    },
  })
  parentProject.addSubProject(subProject)
  return parentProject
}

const parentDocsFolder = 'stub-docs'
const subProjectDirectory = 'packages/test-sub-project'
const expectedDocsCommand = `lerna-projen move-docs ${parentDocsFolder} ${subProjectDirectory} docs`

describe('Happy Path for Typescript', () => {
  let parentProject: LernaProject

  beforeEach(() => {
    parentProject = generateProjects(parentDocsFolder, subProjectDirectory)
  })

  test('lerna file', () => {
    const synthOutput = synthSnapshot(parentProject)
    expect(synthOutput[lernaFilePath]).toMatchObject({
      packages: [subProjectDirectory],
      version: '4.0.0',
    })
  })

  describe('tasks', () => {
    test('default', () => {
      const synthOutput = synthSnapshot(parentProject)
      expect(synthOutput[tasksFilePath]).toEqual(
        expect.objectContaining({
          tasks: expect.objectContaining({
            default: expect.objectContaining({
              steps: expect.not.arrayContaining([{
                exec: 'lerna run test --stream',
              }]),
            }),
          }),
        }),
      )

    })

    test('test', () => {
      const synthOutput = synthSnapshot(parentProject)
      expect(synthOutput[tasksFilePath]).toEqual(
        expect.objectContaining({
          tasks: expect.objectContaining({
            test: expect.objectContaining({
              steps: expect.arrayContaining([{
                exec: 'lerna run test --stream',
              }]),
            }),
          }),
        }),
      )

    })

    test('build', () => {
      const synthOutput = synthSnapshot(parentProject)
      expect(synthOutput[tasksFilePath]).toEqual(
        expect.objectContaining({
          tasks: expect.objectContaining({
            build: expect.objectContaining({
              steps: expect.not.arrayContaining([
                {
                  exec: 'lerna run build --stream',
                },
                {
                  exec: 'lerna-projen clean-dist',
                },
                {
                  exec: `lerna-projen copy-dist ${subProjectDirectory}`,
                },
              ]),
            }),
          }),
        }),
      )

    })

    test('pre-compile', () => {
      const synthOutput = synthSnapshot(parentProject)
      expect(synthOutput[tasksFilePath]).toEqual(
        expect.objectContaining({
          tasks: expect.objectContaining({
            ['pre-compile']: expect.objectContaining({
              steps: expect.arrayContaining([
                {
                  exec: 'lerna-projen clean-dist',
                },
                {
                  exec: 'lerna run pre-compile --stream',
                },
              ]),
            }),
          }),
        }),
      )

    })

    test('package', () => {
      const synthOutput = synthSnapshot(parentProject)
      expect(synthOutput[tasksFilePath]).toEqual(
        expect.objectContaining({
          tasks: expect.objectContaining({
            package: expect.objectContaining({
              steps: expect.arrayContaining([
                {
                  exec: 'lerna run package --stream',
                },
                {
                  exec: `lerna-projen copy-dist ${subProjectDirectory}`,
                },
              ]),
            }),
          }),
        }),
      )

    })

    test('should not include docs tasks by default', ()=> {
      const synthOutput = synthSnapshot(parentProject)
      expect(synthOutput[tasksFilePath]).toEqual(
        expect.objectContaining({
          tasks: expect.objectContaining({
            build: expect.objectContaining({
              steps: expect.not.arrayContaining([
                {
                  exec: expectedDocsCommand,
                },
              ]),
            }),
          }),
        }),
      )

    })

    test('upgrade', () => {
      const synthOutput = synthSnapshot(parentProject)
      expect(synthOutput[tasksFilePath]).toEqual(
        expect.objectContaining({
          tasks: expect.objectContaining({
            upgrade: expect.objectContaining({
              steps: expect.arrayContaining([
                {exec: 'lerna run upgrade --stream'},
              ]),
            }),
          }),
        }),
      )

    })

    test('post-upgrade', () => {
      const synthOutput = synthSnapshot(parentProject)
      expect(synthOutput[tasksFilePath]).toEqual(
        expect.objectContaining({
          tasks: expect.objectContaining({
            ['post-upgrade']: expect.objectContaining({
              steps: expect.arrayContaining([
                {exec: 'lerna run post-upgrade --stream'},
              ]),
            }),
          }),
        }),
      )

    })

  })
})

describe('Happy Path for Jsii sub project', () => {
  test('sub project has docs', () => {
    const parentProject = new LernaProject({
      name: 'test',
      defaultReleaseBranch: 'test',
      logging: {
        level: LogLevel.OFF,
      },
    })

    const subProject = new cdk.JsiiProject({
      name: 'test-sub-project',
      defaultReleaseBranch: 'test',
      logging: {
        level: LogLevel.OFF,
      },
      outdir: subProjectDirectory,
      parent: parentProject,
      repositoryUrl: '',
      author: '',
      authorAddress: '',
    })
    parentProject.addSubProject(subProject)
    const synthOutput = synthSnapshot(parentProject)
    const subProjectTaskFilePath = path.join(subProjectDirectory, '.projen', 'tasks.json')
    expect(synthOutput[subProjectTaskFilePath]).toEqual(
      expect.objectContaining({
        tasks: expect.objectContaining({
          ['package']: expect.objectContaining({
            steps: expect.arrayContaining([
              {
                spawn: 'package-all',
              },
            ]),
          }),
        }),
      }),
    )
  })
})

describe('docgen set to true', () => {
  test('sub project has docs', () => {
    const parentProject = generateProjects(parentDocsFolder, subProjectDirectory, {docgen: true})
    const synthOutput = synthSnapshot(parentProject)
    expect(synthOutput[tasksFilePath]).toEqual(
      expect.objectContaining({
        tasks: expect.objectContaining({
          ['post-compile']: expect.objectContaining({
            steps: expect.arrayContaining([
              {
                exec: expectedDocsCommand,
              },
            ]),
          }),
        }),
      }),
    )
  })

  test('sub project does not have docs', () => {
    const parentProject = generateProjects(parentDocsFolder, subProjectDirectory, {docgen: true, subProjectHasDocs: false})
    const synthOutput = synthSnapshot(parentProject)
    expect(synthOutput[tasksFilePath]).toEqual(
      expect.objectContaining({
        tasks: expect.objectContaining({
          build: expect.objectContaining({
            steps: expect.not.arrayContaining([
              {
                exec: expectedDocsCommand,
              },
            ]),
          }),
        }),
      }),
    )
  })
})

describe('since last release', () => {
  test('should include since filter', () => {
    const parentProject = generateProjects(parentDocsFolder, subProjectDirectory, {sinceLastRelease: true})
    const synthOutput = synthSnapshot(parentProject)
    expect(synthOutput[tasksFilePath]).toEqual(
      expect.objectContaining({
        tasks: expect.objectContaining({
          compile: expect.objectContaining({
            steps: expect.arrayContaining([
              {
                exec: 'lerna run compile --stream --since $(git describe --abbrev=0 --tags --match "v*")',
              },
            ]),
          }),
        }),
      }),
    )
  })
})

describe('typescript projenrc file', () => {
  test('should use the projenrc.ts file', () => {
    const parentProject = generateProjects(parentDocsFolder, subProjectDirectory, {projenrcTs: true})
    const synthOutput = synthSnapshot(parentProject)
    expect(synthOutput[tasksFilePath]).toEqual(
      expect.objectContaining({
        tasks: expect.objectContaining({
          default: expect.objectContaining({
            steps: expect.arrayContaining([
              {
                exec: 'ts-node --skip-project .projenrc.ts',
              },
            ]),
          }),
        }),
      }),
    )
  })
})

describe('Unhappy Path', () => {

  describe('output directory', () => {

    test('Should fail if sub project does not have output directory', () => {
      const project = new LernaProject({
        name: 'test',
        defaultReleaseBranch: 'test',
        logging: {
          level: LogLevel.OFF,
        },
      })

      const subProject = new typescript.TypeScriptProject({
        name: 'test-sub-project',
        defaultReleaseBranch: 'test',
        logging: {
          level: LogLevel.OFF,
        },
      })
      expect(() => project.addSubProject(subProject)).toThrow('A sub project out dir should exists within the lerna package')
    })

    test('Should fail if sub project does not have output directory outside of parent root', () => {
      const project = new LernaProject({
        name: 'test',
        defaultReleaseBranch: 'test',
        logging: {
          level: LogLevel.OFF,
        },
      })

      const subProject = new typescript.TypeScriptProject({
        name: 'test-sub-project',
        outdir: mkdtemp(),
        defaultReleaseBranch: 'test',
        logging: {
          level: LogLevel.OFF,
        },
      })
      expect(() => project.addSubProject(subProject)).toThrow('A sub project out dir should exists within the lerna package')
    })

  })

})