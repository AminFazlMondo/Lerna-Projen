import {JsonFile, javascript, Project, Tasks, SourceCode} from 'projen'
import {LernaProjectOptions} from './types'

export * from './types'

function getDocsDirectory(project: Project) {
  const result = Object.entries(project).find(([key]) => key === 'docsDirectory')
  return result?.[1].replace(/\/$/, '')
}

function getArtifactsDirectory(project: Project) {
  const result = Object.entries(project).find(([key]) => key === 'artifactsDirectory')
  return result?.[1]
}

const jsiiTaskPattern = /jsii-docgen -o (?<output>.+)$/i

function extractJsiiDocsOutput(tasks: Tasks): string | undefined {
  const jsiiDocStep = tasks.tryFind('docgen')?.steps.find(step => jsiiTaskPattern.test(step.exec ?? ''))
  if (!jsiiDocStep || !jsiiDocStep.exec)
    return

  const match = jsiiDocStep.exec.match(jsiiTaskPattern)
  return match?.groups?.output
}

const lockedTaskNames = ['build', 'upgrade', 'upgrade-projen']

export class LernaProject extends javascript.NodeProject {

  private subProjects: Record<string, Project>
  private projenrcTs: boolean

  readonly docsDirectory: string
  readonly docgen: boolean
  readonly sinceLastRelease: boolean
  readonly useNx: boolean
  readonly independentMode: boolean
  readonly useWorkspaces: boolean

  constructor(options: LernaProjectOptions) {
    super({
      ...options,
      jest: false,
    })

    this.addDevDeps('lerna-projen', 'lerna@5')

    if (options.projenrcTs)
      this.addDevDeps('ts-node', 'typescript')

    this.subProjects = {}
    this.docsDirectory = options.docsDirectory ?? 'docs'
    this.docgen = options.docgen ?? false
    this.sinceLastRelease = options.sinceLastRelease ?? false
    this.useNx = options.useNx ?? false
    this.projenrcTs = options.projenrcTs ?? false
    this.independentMode = options.independentMode ?? false
    this.useWorkspaces = options.useWorkspaces ?? false
  }

  addSubProject(subProject: Project) {
    const {outdir} = subProject

    if (!outdir || !outdir.includes(this.outdir))
      throw new Error('A sub project out dir should exists within the lerna package')

    const relativeOutDir = outdir.replace(`${this.outdir}/`, '')

    this.subProjects[relativeOutDir] = subProject
  }

  preSynthesize() {
    super.preSynthesize()
    const projenCommand = this.projenrcTs ? 'ts-node --skip-project .projenrc.ts' : 'node .projenrc.js'
    const {defaultTask} = this
    if (!defaultTask)
      throw new Error('Could not find default task')
    defaultTask.reset(projenCommand)
    this.packageTask.reset(`mkdir -p ${this.artifactsJavascriptDirectory}`)

    this.appendLernaCommands()

    this.preCompileTask.exec(`lerna-projen clean-dist ${this.artifactsDirectory}`)

    this.addCrossLinks()
    this.updateSubProjects()
    this.addDocumentsIndex()
  }

  private addCrossLinks() {
    const lernaConfig: any = {
      useNx: this.useNx,
      version: this.independentMode ? 'independent' : '0.0.0',
    }

    const packages = Object.keys(this.subProjects)

    if (this.useWorkspaces)
      this.package.addField('packages', packages)
    else
      lernaConfig.packages = packages


    new JsonFile(this, 'lerna.json', {
      obj: lernaConfig,
    })
  }

  private appendLernaCommands() {
    const upgradeTaskName = 'upgrade'
    const postUpgradeTaskName = 'post-upgrade'
    const postUpgradeTask = this.tasks.tryFind(postUpgradeTaskName)
    postUpgradeTask?.prependExec(this.getLernaCommand(upgradeTaskName, false))
    postUpgradeTask?.exec('npx projen')
    postUpgradeTask?.exec(this.getLernaCommand(postUpgradeTaskName))

    this.tasks.all
      .forEach(task => {
        if (lockedTaskNames.includes(task.name) || task.name === postUpgradeTaskName)
          return

        task.exec(this.getLernaCommand(task.name))
      })
  }

  private getLernaCommand(taskName: string, useSinceFlag = true) {
    const mainCommand = `lerna run ${taskName} --stream`
    const postCommand = useSinceFlag && this.sinceLastRelease ? ' --since $(git describe --abbrev=0 --tags --match "v*")' : ''
    return `${mainCommand}${postCommand}`
  }

  private updateSubProjects() {
    const bumpTask = this.tasks.tryFind('bump')
    const unbumpTask = this.tasks.tryFind('unbump')

    Object.entries(this.subProjects).forEach(([subProjectPath, subProject]) => {
      const subProjectDocsDirectory = getDocsDirectory(subProject)
      if (this.docgen && subProjectDocsDirectory)
        this.postCompileTask.exec(`lerna-projen move-docs ${this.docsDirectory} ${subProjectPath} ${subProjectDocsDirectory}`)

      const packageAllTask = subProject.tasks.tryFind('package-all')

      if (packageAllTask)
        subProject.packageTask.spawn(packageAllTask)

      const artifactsDirectory = getArtifactsDirectory(subProject)

      this.packageTask.exec(`lerna-projen copy-dist ${subProjectPath}/${artifactsDirectory} ${this.artifactsDirectory}`)

      subProject.defaultTask?.reset()

      const bumpEnvs = {
        OUTFILE: 'package.json',
        CHANGELOG: `${artifactsDirectory}/changelog.md`,
        BUMPFILE: `${artifactsDirectory}/version.txt`,
        RELEASETAG: `${artifactsDirectory}/releasetag.txt`,
        RELEASE_TAG_PREFIX: '',
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

  private addDocumentsIndex() {
    if (!this.docgen)
      return

    const subProjectsDocs: Record<string, string> = {}

    const indexMarkdown = new SourceCode(this, `${this.docsDirectory}/index.md`)
    const readmeMarkdown = new SourceCode(this, `${this.docsDirectory}/README.md`)

    Object.entries(this.subProjects).forEach(([subProjectPath, subProject]) => {
      const subProjectDocsDirectory = getDocsDirectory(subProject)
      if (!subProjectDocsDirectory)
        return

      const jsiiDocsOutput = extractJsiiDocsOutput(subProject.tasks)
      if (jsiiDocsOutput) {
        const path = `${subProjectPath}/${jsiiDocsOutput}`
        indexMarkdown.line(`- ## [${subProject.name}](${path})`)
        subProjectsDocs[subProject.name] = path
      } else {
        subProjectsDocs[subProject.name] = `${subProjectPath}/index.html`
      }
      readmeMarkdown.line(`- ## [${subProject.name}](../${subProjectPath}/README.md)`)
    })

    const indexHtml = new SourceCode(this, `${this.docsDirectory}/index.html`)
    indexHtml.line('<!DOCTYPE html>')
    indexHtml.line('<html>')
    indexHtml.open('<body>')
    indexHtml.open('<ul>')
    Object.entries(subProjectsDocs).forEach(([name, path]) => {
      indexHtml.open('<li>')
      indexHtml.open(`<a href="${path}">`)
      indexHtml.line(name)
      indexHtml.close('</a>')
      indexHtml.close('</li>')
    })
    indexHtml.close('</ul>')
    indexHtml.close('</body>')
    indexHtml.line('</html>')
    indexHtml.line()

    this.gitattributes.addAttributes(`/${this.docsDirectory}/**`, 'linguist-generated')
  }
}