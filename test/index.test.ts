import {LogLevel, javascript, typescript, cdk} from 'projen'
import {synthSnapshot} from 'projen/lib/util/synth'
import {LernaProject} from '../src'

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

  useNx?:boolean;

  /**
   * @default false
   */
  independentMode?: boolean;
}

function generateProjects(
  parentDocsFolder: string,
  subProjectDirectory: string,
  params: GenerateProjectsParams = {}): LernaProject {

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
    useNx: params.useNx,
    independentMode: params.independentMode,
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
const lernaFilePath = 'lerna.json'
const tasksFilePath = '.projen/tasks.json'
const docsMarkdownFilePath = `${parentDocsFolder}/index.md`
const docsReadmeFilePath = `${parentDocsFolder}/README.md`
const docsHtmlFilePath = `${parentDocsFolder}/index.html`
const subProjectDirectory = 'packages/test-sub-project'
const expectedDocsCommand = `lerna-projen move-docs ${parentDocsFolder} ${subProjectDirectory} docs`

describe('Happy Path for Typescript', () => {
  const parentProject = generateProjects(parentDocsFolder, subProjectDirectory)
  const output = synthSnapshot(parentProject)

  test('lerna file', () => {
    expect(output[lernaFilePath]).toMatchObject({
      packages: [subProjectDirectory],
      useNx: false,
      version: '0.0.0',
    })
  })

  describe('tasks', () => {
    test('default', () => {
      expect(output[tasksFilePath]).toEqual(
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
      expect(output[tasksFilePath]).toEqual(
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
      expect(output[tasksFilePath]).toEqual(
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
      expect(output[tasksFilePath]).toEqual(
        expect.objectContaining({
          tasks: expect.objectContaining({
            ['pre-compile']: expect.objectContaining({
              steps: expect.arrayContaining([
                {
                  exec: 'lerna-projen clean-dist dist',
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
      expect(output[tasksFilePath]).toEqual(
        expect.objectContaining({
          tasks: expect.objectContaining({
            package: expect.objectContaining({
              steps: expect.arrayContaining([
                {
                  exec: 'lerna run package --stream',
                },
                {
                  exec: `lerna-projen copy-dist ${subProjectDirectory}/dist dist`,
                },
              ]),
            }),
          }),
        }),
      )

    })

    test('should not include docs tasks by default', ()=> {
      expect(output[tasksFilePath]).toEqual(
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
      try {
        expect(output[tasksFilePath]).toEqual(
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
      } catch {
        expect(output[tasksFilePath]).toEqual(
          expect.objectContaining({
            tasks: expect.objectContaining({
              ['post-upgrade']: expect.objectContaining({
                steps: [
                  {exec: 'lerna run upgrade --stream'},
                  {exec: 'npx projen'},
                  {exec: 'lerna run post-upgrade --stream'},
                ],
              }),
            }),
          }),
        )
      }
    })

    test('post-upgrade', () => {
      expect(output[tasksFilePath]).toEqual(
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
  describe('sub project has docs', () => {
    const parentProject = new LernaProject({
      name: 'test',
      defaultReleaseBranch: 'test',
      logging: {
        level: LogLevel.OFF,
      },
      docgen: true,
      docsDirectory: parentDocsFolder,
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
    const output = synthSnapshot(parentProject)

    test('package-all is added', () => {
      expect(output[`${subProjectDirectory}/${tasksFilePath}`]).toEqual(
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

    test('docs index', () => {
      expect(output[docsHtmlFilePath]).toMatchSnapshot()
      expect(output[docsMarkdownFilePath]).toMatchSnapshot()
      expect(output[docsReadmeFilePath]).toMatchSnapshot()
    })
  })
})

describe('docgen set to true', () => {
  describe('sub project has docs', () => {
    const parentProject = generateProjects(parentDocsFolder, subProjectDirectory, {docgen: true})
    const output = synthSnapshot(parentProject)

    test('document generator step added to post-compile', () => {
      expect(output[tasksFilePath]).toEqual(
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

    test('docs index', () => {
      expect(output[docsHtmlFilePath]).toMatchSnapshot()
      expect(output[docsMarkdownFilePath]).toMatchSnapshot()
      expect(output[docsReadmeFilePath]).toMatchSnapshot()
    })
  })

  test('sub project does not have docs', () => {
    const parentProject = generateProjects(parentDocsFolder, subProjectDirectory, {docgen: true, subProjectHasDocs: false})
    const output = synthSnapshot(parentProject)
    expect(output[tasksFilePath]).toEqual(
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

  test('multiple sub-projects', () => {
    const parentProject = new LernaProject({
      name: 'test',
      defaultReleaseBranch: 'test',
      logging: {
        level: LogLevel.OFF,
      },
      docgen: true,
      docsDirectory: parentDocsFolder,
    })

    parentProject.addSubProject(new cdk.JsiiProject({
      name: 'test-sub-project-1',
      defaultReleaseBranch: 'test',
      logging: {
        level: LogLevel.OFF,
      },
      outdir: `${subProjectDirectory}-1`,
      parent: parentProject,
      repositoryUrl: '',
      author: '',
      authorAddress: '',
    }))

    parentProject.addSubProject(new typescript.TypeScriptProject({
      name: 'test-sub-project-2',
      defaultReleaseBranch: 'test',
      logging: {
        level: LogLevel.OFF,
      },
      outdir: `${subProjectDirectory}-2`,
      parent: parentProject,
    }))

    parentProject.addSubProject(new javascript.NodeProject({
      name: 'test-sub-project-3',
      defaultReleaseBranch: 'test',
      logging: {
        level: LogLevel.OFF,
      },
      outdir: `${subProjectDirectory}-3`,
      parent: parentProject,
    }))

    parentProject.addSubProject(new cdk.JsiiProject({
      name: 'test-sub-project-4',
      defaultReleaseBranch: 'test',
      logging: {
        level: LogLevel.OFF,
      },
      outdir: `${subProjectDirectory}-4`,
      parent: parentProject,
      repositoryUrl: '',
      author: '',
      authorAddress: '',
    }))

    const output = synthSnapshot(parentProject)

    expect(output[docsHtmlFilePath]).toMatchSnapshot()
    expect(output[docsMarkdownFilePath]).toMatchSnapshot()
    expect(output[docsReadmeFilePath]).toMatchSnapshot()
  })
})

describe('useNx', () => {
  const parentProject = generateProjects(parentDocsFolder, subProjectDirectory, {useNx: true})
  const output = synthSnapshot(parentProject)
  test('lerna file', () => {
    expect(output[lernaFilePath]).toMatchObject({
      packages: [subProjectDirectory],
      useNx: true,
      version: '0.0.0',
    })
  })
})

describe('independentMode', () => {
  const parentProject = generateProjects(parentDocsFolder, subProjectDirectory, {independentMode: true})
  const output = synthSnapshot(parentProject)
  test('lerna file', () => {
    expect(output[lernaFilePath]).toMatchObject({
      packages: [subProjectDirectory],
      useNx: false,
      version: 'independent',
    })
  })
})

describe('since last release', () => {
  const parentProject = generateProjects(parentDocsFolder, subProjectDirectory, {sinceLastRelease: true})
  const output = synthSnapshot(parentProject)
  test('should include since filter', () => {
    expect(output[tasksFilePath]).toEqual(
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
  test('should not include since filter for upgrade task', () => {
    expect(output[tasksFilePath]).toEqual(
      expect.objectContaining({
        tasks: expect.objectContaining({
          ['post-upgrade']: expect.objectContaining({
            steps: expect.arrayContaining([
              {
                exec: 'lerna run upgrade --stream',
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
    const output = synthSnapshot(parentProject)
    expect(output[tasksFilePath]).toEqual(
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
        outdir: 'parentDir',
        defaultReleaseBranch: 'test',
        logging: {
          level: LogLevel.OFF,
        },
      })

      const subProject = new typescript.TypeScriptProject({
        name: 'test-sub-project',
        outdir: 'subProjectDir',
        defaultReleaseBranch: 'test',
        logging: {
          level: LogLevel.OFF,
        },
      })
      expect(() => project.addSubProject(subProject)).toThrow('A sub project out dir should exists within the lerna package')
    })

  })

})