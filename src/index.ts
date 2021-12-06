import {JsonFile, javascript, Project} from 'projen'
import {LernaProjectOptions} from './types'

export * from './types'

function getDocsDirectory(project: Project) {
  const result = Object.entries(project).find(([key]) => key === 'docsDirectory')
  return result?.[1].replace(/\/$/, '')
}

export class LernaProject extends javascript.NodeProject {

  private subProjects: Record<string, Project>
  private projenrcTs: boolean

  readonly docsDirectory: string
  readonly docgen: boolean
  readonly sinceLastRelease: boolean

  constructor(options: LernaProjectOptions) {
    const devDeps = [
      'lerna',
      'lerna-projen',
    ]

    if (options.projenrcTs)
      devDeps.push('ts-node', 'typescript')

    super({
      ...options,
      jest: false,
      devDeps,
    })

    this.subProjects = {}
    this.docsDirectory = options.docsDirectory ?? 'docs'
    this.docgen = options.docgen ?? false
    this.sinceLastRelease = options.sinceLastRelease ?? false
    this.projenrcTs = options.projenrcTs ?? false
  }

  addSubProject(subProject: Project) {
    const {outdir} = subProject

    if (!outdir || !outdir.includes(this.outdir))
      throw new Error('A sub project out dir should exists within the lerna package')

    const relativeOutDir = outdir.replace(`${this.outdir}/`, '')

    this.subProjects[relativeOutDir] = subProject
  }

  preSynthesize() {
    const defaultTask = this.tasks.tryFind('default')
    defaultTask?.reset('npm i lerna-projen --package-lock=false')
    const projenCommand = this.projenrcTs ? 'ts-node --skip-project .projenrc.ts' : 'node .projenrc.js'
    defaultTask?.exec(projenCommand)
    defaultTask?.exec('lerna run default --stream')

    this.tasks.all
      .forEach(task => {
        if (task.name === 'build')
          return

        const mainCommand = `lerna run ${task.name} --stream`
        const postCommand = this.sinceLastRelease ? ' --since $(git describe --abbrev=0 --tags --match "v*")' : ''
        task.exec(`${mainCommand}${postCommand}`)
      })

    this.preCompileTask.exec('lerna-projen clean-dist')

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
        this.postCompileTask.exec(`lerna-projen move-docs ${this.docsDirectory} ${subProjectPath} ${subProjectDocsDirectory}`)

      this.packageTask.exec(`lerna-projen copy-dist ${subProjectPath}`)
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