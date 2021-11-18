import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import {removeSync} from 'fs-extra'
import {LogLevel, NodeProject, TypeScriptProject} from 'projen'
import {LernaProject} from '../src'

const autoRemove = new Set<string>()

afterAll((done) => {
  Array.from(autoRemove).forEach(dir => removeSync(dir))
  done()
})

function mkdtemp() {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'projen-test-'))
  autoRemove.add(tmpdir)
  return tmpdir
}

interface SynthOutput {
  'lerna.json': any;
  'tasks.json': any;
}

function readJson(filePath: string): any {
  const content = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(content)
}

function captureSynth(project: LernaProject): SynthOutput {
  process.env.PROJEN_DISABLE_POST = 'true'
  project.synth()
  const {outdir} = project
  return {
    'lerna.json': readJson(path.join(outdir, 'lerna.json')),
    'tasks.json': readJson(path.join(outdir, '.projen', 'tasks.json')),
  }
}
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
// eslint-disable-next-line max-len
function generateProjects(parentDocsFolder: string, subProjectDirectory: string, params: GenerateProjectsParams = {}): LernaProject {
  const parentDirectory = mkdtemp()
  const parentProject = new LernaProject({
    name: 'test',
    outdir: parentDirectory,
    defaultReleaseBranch: 'test',
    logging: {
      level: LogLevel.OFF,
    },
    docsDirectory: parentDocsFolder,
    docgen: params.docgen ?? false,
    sinceLastRelease: params.sinceLastRelease ?? false,
    projenrcTs: params.projenrcTs ?? false,
  })

  const SubProjectType = (params.subProjectHasDocs ?? true) ? TypeScriptProject : NodeProject
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

describe('Happy Path', () => {
  let parentProject: LernaProject

  beforeEach(() => {
    parentProject = generateProjects(parentDocsFolder, subProjectDirectory)
  })

  test('lerna file', () => {
    const output = captureSynth(parentProject)
    expect(output['lerna.json']).toMatchObject({
      packages: [subProjectDirectory],
      version: '4.0.0',
    })
  })

  describe('tasks', () => {
    test('default', () => {
      const output = captureSynth(parentProject)
      expect(output['tasks.json']).toEqual(
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
      const output = captureSynth(parentProject)
      expect(output['tasks.json']).toEqual(
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
      const output = captureSynth(parentProject)
      expect(output['tasks.json']).toEqual(
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
      const output = captureSynth(parentProject)
      expect(output['tasks.json']).toEqual(
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
      const output = captureSynth(parentProject)
      expect(output['tasks.json']).toEqual(
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
      const output = captureSynth(parentProject)
      expect(output['tasks.json']).toEqual(
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
})


describe('docgen set to true', () => {
  test('sub project has docs', () => {
    const parentProject = generateProjects(parentDocsFolder, subProjectDirectory, {docgen: true})
    const output = captureSynth(parentProject)
    expect(output['tasks.json']).toEqual(
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
    const output = captureSynth(parentProject)
    expect(output['tasks.json']).toEqual(
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
    const output = captureSynth(parentProject)
    expect(output['tasks.json']).toEqual(
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
    const output = captureSynth(parentProject)
    expect(output['tasks.json']).toEqual(
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
      const parentDirectory = mkdtemp()
      const project = new LernaProject({
        name: 'test',
        outdir: parentDirectory,
        defaultReleaseBranch: 'test',
        logging: {
          level: LogLevel.OFF,
        },
      })

      const subProject = new TypeScriptProject({
        name: 'test-sub-project',
        defaultReleaseBranch: 'test',
        logging: {
          level: LogLevel.OFF,
        },
      })
      expect(() => project.addSubProject(subProject)).toThrow('A sub project out dir should exists within the lerna package')
    })

    test('Should fail if sub project does not have output directory outside of parent root', () => {
      const parentDirectory = mkdtemp()
      const project = new LernaProject({
        name: 'test',
        outdir: parentDirectory,
        defaultReleaseBranch: 'test',
        logging: {
          level: LogLevel.OFF,
        },
      })

      const subProject = new TypeScriptProject({
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