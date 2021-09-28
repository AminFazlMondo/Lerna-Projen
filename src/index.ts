import {JsonFile, NodeProject, Project} from 'projen'
import {LernaProjectOptions} from './types'

export * from './types'

function getDocsDirectory(project: Project) {
  const result = Object.entries(project).find(([key]) => key === 'docsDirectory')
  return result?.[1].replace(/\/$/, '')
}

export class LernaProject extends NodeProject {

  private subProjects: Record<string, Project>

  readonly docsDirectory: string
  readonly docgen: boolean

  constructor(options: LernaProjectOptions) {
    super({
      ...options,
      jest: false,
      devDeps: [
        'lerna',
        'lerna-projen',
      ],
    })

    this.subProjects = {}
    this.docsDirectory = options.docsDirectory ?? 'docs'
    this.docgen = options.docgen ?? false
  }

  addSubProject(subProject: Project) {
    const {outdir} = subProject

    if (!outdir || !outdir.includes(this.outdir))
      throw new Error('A sub project out dir should exists within the lerna package')

    const relativeOutDir = outdir.replace(`${this.outdir}/`, '')

    if (this.subProjects[relativeOutDir])
      throw new Error('A sub project is defined with the same output path')

    this.subProjects[relativeOutDir] = subProject
  }

  preSynthesize() {
    this.tasks.all
      .forEach(task => {
        task.exec(`lerna run ${task.name} --stream`)
      })

    this.buildTask.builtin('lerna-projen clean-dist')

    this.files.push(new JsonFile(this, 'lerna.json', {
      obj: {
        packages: Object.keys(this.subProjects),
        version: '4.0.0',
      },
    }))

    const bumpTask = this.tasks.tryFind('bump')
    const unbumpTask = this.tasks.tryFind('unbump')

    Object.entries(this.subProjects).forEach(([subProjectPath, subProject]) => {
      const subProjectDocsDirectory = getDocsDirectory(subProject)
      if (this.docgen && subProjectDocsDirectory)
        this.buildTask.builtin(`lerna-projen move-docs ${this.docsDirectory} ${subProjectPath} ${subProjectDocsDirectory}`)

      this.buildTask.builtin(`lerna-projen copy-dist ${subProjectPath}`)
      subProject.tasks.tryFind('default')?.reset()

      const bumpEnvs = {
        OUTFILE: 'package.json',
        CHANGELOG: 'dist/changelog.md',
        BUMPFILE: 'dist/version.txt',
      }

      if (bumpTask) {
        const subBumpTask = subProject.addTask(bumpTask.name, {
          description: bumpTask.description,
          condition: bumpTask.condition,
          env: bumpEnvs,
        })
        subBumpTask.builtin('release/bump-version')
      }

      if (unbumpTask) {
        const subBumpTask = subProject.addTask(unbumpTask.name, {
          description: unbumpTask.description,
          condition: unbumpTask.condition,
          env: bumpEnvs,
        })
        subBumpTask.builtin('release/reset-version')
      }
    })
  }
}