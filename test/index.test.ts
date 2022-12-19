import {LogLevel, javascript, typescript, cdk} from 'projen'
import {synthSnapshot} from 'projen/lib/util/synth'
import {LernaProject, LernaTypescriptProject, TaskCustomizations} from '../src'

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

  /**
   * @default false
   */
  useWorkspaces?: boolean;

  /**
   * @default {}
   */
  taskCustomizations?: TaskCustomizations;
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
    useWorkspaces: params.useWorkspaces,
    independentMode: params.independentMode,
    taskCustomizations: params.taskCustomizations ?? {},
  })

  const SubProjectType = (params.subProjectHasDocs ?? true) ? typescript.TypeScriptProject : javascript.NodeProject
  new SubProjectType({
    name: 'test-sub-project',
    parent: parentProject,
    outdir: subProjectDirectory,
    defaultReleaseBranch: 'test',
    logging: {
      level: LogLevel.OFF,
    },
  })
  return parentProject
}

function generateProjectsTypescript(
  parentDocsFolder: string,
  subProjectDirectory: string,
  params: GenerateProjectsParams = {}): LernaTypescriptProject {

  const parentProject = new LernaTypescriptProject({
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
    useWorkspaces: params.useWorkspaces,
    independentMode: params.independentMode,
    taskCustomizations: params.taskCustomizations ?? {},
  })

  const SubProjectType = (params.subProjectHasDocs ?? true) ? typescript.TypeScriptProject : javascript.NodeProject
  new SubProjectType({
    name: 'test-sub-project',
    parent: parentProject,
    outdir: subProjectDirectory,
    defaultReleaseBranch: 'test',
    logging: {
      level: LogLevel.OFF,
    },
  })
  return parentProject
}

const parentDocsFolder = 'stub-docs'
const lernaFilePath = 'lerna.json'
const packageJsonFilePath = 'package.json'
const tasksFilePath = '.projen/tasks.json'
const gitAttributesFilesPath = '.gitattributes'
const docsMarkdownFilePath = `${parentDocsFolder}/index.md`
const docsReadmeFilePath = `${parentDocsFolder}/README.md`
const docsHtmlFilePath = `${parentDocsFolder}/index.html`
const subProjectDirectory = 'packages/test-sub-project'
const expectedDocsCommand = `lerna-projen move-docs ${parentDocsFolder} ${subProjectDirectory} docs`

describe('Happy Path for Javascript', () => {
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

    test('clobber', () => {
      expect(output[tasksFilePath]).toEqual(
        expect.objectContaining({
          tasks: expect.objectContaining({
            clobber: expect.objectContaining({
              steps: expect.not.arrayContaining([
                {
                  exec: 'lerna run clobber --stream',
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

describe('Happy Path for Typescript', () => {
  const parentProject = generateProjectsTypescript(parentDocsFolder, subProjectDirectory)
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

    test('clobber', () => {
      expect(output[tasksFilePath]).toEqual(
        expect.objectContaining({
          tasks: expect.objectContaining({
            clobber: expect.objectContaining({
              steps: expect.not.arrayContaining([
                {
                  exec: 'lerna run clobber --stream',
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

    new cdk.JsiiProject({
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

    test('gitattributes', () => {
      expect(output[gitAttributesFilesPath]).toContain(`/${parentDocsFolder}/** linguist-generated`)
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

    test('gitattributes', () => {
      expect(output[gitAttributesFilesPath]).toContain(`/${parentDocsFolder}/** linguist-generated`)
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

    new cdk.JsiiProject({
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
    })

    new typescript.TypeScriptProject({
      name: 'test-sub-project-2',
      defaultReleaseBranch: 'test',
      logging: {
        level: LogLevel.OFF,
      },
      outdir: `${subProjectDirectory}-2`,
      parent: parentProject,
    })

    new javascript.NodeProject({
      name: 'test-sub-project-3',
      defaultReleaseBranch: 'test',
      logging: {
        level: LogLevel.OFF,
      },
      outdir: `${subProjectDirectory}-3`,
      parent: parentProject,
    })

    new cdk.JsiiProject({
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
    })

    const output = synthSnapshot(parentProject)

    expect(output[docsHtmlFilePath]).toMatchSnapshot()
    expect(output[docsMarkdownFilePath]).toMatchSnapshot()
    expect(output[docsReadmeFilePath]).toMatchSnapshot()
  })
})

describe('docgen set to false', () => {
  const parentProject = generateProjects(parentDocsFolder, subProjectDirectory, {docgen: false})
  const output = synthSnapshot(parentProject)

  test('should not add gitattributes for docs folder', () => {
    expect(output[gitAttributesFilesPath]).not.toContain(`/${parentDocsFolder}/** linguist-generated`)
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

describe('useWorkspaces', () => {
  const parentProject = generateProjects(parentDocsFolder, subProjectDirectory, {useWorkspaces: true})
  const output = synthSnapshot(parentProject)
  test('lerna file', () => {
    expect(output[lernaFilePath]).not.toHaveProperty('packages')
    expect(output[lernaFilePath]).toMatchObject({
      version: '0.0.0',
    })
  })
  test('package.json', () => {
    expect(output[packageJsonFilePath]).toMatchObject({
      packages: expect.arrayContaining([subProjectDirectory]),
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

describe('task customization', () => {
  describe('javascript project', () => {
    const parentProject = generateProjects(parentDocsFolder, subProjectDirectory, {
      sinceLastRelease: false,
      taskCustomizations: {
        compile: {
          sinceLastRelease: true,
        },
        test: {
          exclude: ['stub-exclude-package-name-1', 'stub-exclude-package-name-2'],
          include: ['stub-include-package-name'],
        },
      },
    })

    parentProject.customizeTask('default', {
      addLernaStep: false,
    })
    const output = synthSnapshot(parentProject)
    test('should not add lerna run step to default task', () => {
      expect(output[tasksFilePath]).toEqual(
        expect.objectContaining({
          tasks: expect.objectContaining({
            default: expect.objectContaining({
              steps: expect.not.arrayContaining([
                {
                  exec: 'lerna run default --stream',
                },
              ]),
            }),
          }),
        }),
      )
    })

    test('should add since flag to compile task', () => {
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

    test('should add ignore and scope flags to test task', () => {
      expect(output[tasksFilePath]).toEqual(
        expect.objectContaining({
          tasks: expect.objectContaining({
            test: expect.objectContaining({
              steps: expect.arrayContaining([
                {
                  exec: 'lerna run test --stream --scope stub-include-package-name --ignore stub-exclude-package-name-1 --ignore stub-exclude-package-name-2',
                },
              ]),
            }),
          }),
        }),
      )
    })
  })
  describe('typescript project', () => {
    const parentProject = generateProjectsTypescript(parentDocsFolder, subProjectDirectory, {
      sinceLastRelease: false,
      taskCustomizations: {
        compile: {
          sinceLastRelease: true,
        },
        test: {
          exclude: ['stub-exclude-package-name-1', 'stub-exclude-package-name-2'],
          include: ['stub-include-package-name'],
        },
      },
    })

    parentProject.customizeTask('default', {
      addLernaStep: false,
    })
    const output = synthSnapshot(parentProject)
    test('should not add lerna run step to default task', () => {
      expect(output[tasksFilePath]).toEqual(
        expect.objectContaining({
          tasks: expect.objectContaining({
            default: expect.objectContaining({
              steps: expect.not.arrayContaining([
                {
                  exec: 'lerna run default --stream',
                },
              ]),
            }),
          }),
        }),
      )
    })

    test('should add since flag to compile task', () => {
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

    test('should add ignore and scope flags to test task', () => {
      expect(output[tasksFilePath]).toEqual(
        expect.objectContaining({
          tasks: expect.objectContaining({
            test: expect.objectContaining({
              steps: expect.arrayContaining([
                {
                  exec: 'lerna run test --stream --scope stub-include-package-name --ignore stub-exclude-package-name-1 --ignore stub-exclude-package-name-2',
                },
              ]),
            }),
          }),
        }),
      )
    })
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

      expect(() => new typescript.TypeScriptProject({
        name: 'test-sub-project',
        defaultReleaseBranch: 'test',
        parent: project,
        logging: {
          level: LogLevel.OFF,
        },
      })).toThrow('"outdir" must be specified for subprojects')
    })

  })

})