import {JsonFile, NodeProject, Project} from 'projen'
import {LernaProjectOptions} from './types'

export * from './types'

export class LernaProject extends NodeProject {

  private subProjects: Record<string, Project>

  constructor(options: LernaProjectOptions) {
    super({
      ...options,
      jest: false,
      devDeps: [
        'lerna',
        'lerna-projen',
      ],
      projenCommand: 'npx lerna-projen',
    })

    this.subProjects = {}

    this.tasks.all
      .filter(task => task.name !== 'default')
      .forEach(task => {
        task.exec(`lerna run ${task.name} --stream`)
      })
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
    this.files.push(new JsonFile(this, 'lerna.json', {
      obj: {
        packages: Object.keys(this.subProjects),
        version: '4.0.0',
      },
    }))
  }
}