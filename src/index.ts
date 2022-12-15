import {JsonFile, javascript, Project, Tasks, SourceCode, typescript} from 'projen'
import {LernaProjectOptions, LernaTypescriptProjectOptions, TaskCustomization, TaskCustomizations} from './types'

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

interface ILernaProject {
  readonly sinceLastRelease: boolean;
  readonly useNx: boolean;
  readonly independentMode: boolean;
  readonly useWorkspaces: boolean;
  readonly docsDirectory: string;
  readonly docgen?: boolean;
  readonly taskCustomizations: TaskCustomizations;
}

/**
 * @pjid lerna-project
 */
export class LernaProject extends javascript.NodeProject implements ILernaProject {

  private projenrcTs: boolean

  readonly docsDirectory: string
  readonly docgen: boolean
  readonly sinceLastRelease: boolean
  readonly useNx: boolean
  readonly independentMode: boolean
  readonly useWorkspaces: boolean
  readonly taskCustomizations: TaskCustomizations

  private readonly factory: LernaProjectFactory

  constructor(options: LernaProjectOptions) {
    super(options)

    if (options.projenrcTs)
      this.addDevDeps('ts-node', 'typescript')

    this.docsDirectory = options.docsDirectory ?? 'docs'
    this.docgen = options.docgen ?? false
    this.sinceLastRelease = options.sinceLastRelease ?? false
    this.useNx = options.useNx ?? false
    this.projenrcTs = options.projenrcTs ?? false
    this.independentMode = options.independentMode ?? false
    this.useWorkspaces = options.useWorkspaces ?? false
    this.taskCustomizations = options.taskCustomizations ?? {}

    this.factory = new LernaProjectFactory(this)
  }

  /**
   * Adds a sub-project to this project.
   *
   * This is automatically called when a new project is created with `parent`
   * pointing to this project, so there is no real need to call this manually.
   *
   * @param sub-project The child project to add.
   * @internal
   */
  _addSubProject(subproject: Project): void {
    super._addSubProject(subproject)
    this.factory.addSubProject(subproject)
  }

  /**
   * @deprecated This is automatically called when a new project is created with `parent`
   */
  addSubProject(_subproject: Project) {
    console.warn('LernaProject.addSubProject is deprecated. It is now automatically called when a new project is created with `parent`')
  }

  preSynthesize() {
    super.preSynthesize()
    const projenCommand = this.projenrcTs ? 'ts-node --skip-project .projenrc.ts' : 'node .projenrc.js'
    const {defaultTask} = this
    if (!defaultTask)
      throw new Error('Could not find default task')
    defaultTask.reset(projenCommand)

    this.factory.build()
  }
}

/**
 * @pjid lerna-ts-project
 */
export class LernaTypescriptProject extends typescript.TypeScriptProject implements ILernaProject {
  readonly sinceLastRelease: boolean
  readonly useNx: boolean
  readonly independentMode: boolean
  readonly useWorkspaces: boolean
  readonly taskCustomizations: TaskCustomizations

  private readonly factory: LernaProjectFactory

  constructor(options: LernaTypescriptProjectOptions) {
    super(options)

    this.sinceLastRelease = options.sinceLastRelease ?? false
    this.useNx = options.useNx ?? false
    this.independentMode = options.independentMode ?? false
    this.useWorkspaces = options.useWorkspaces ?? false
    this.taskCustomizations = options.taskCustomizations ?? {}

    this.factory = new LernaProjectFactory(this)
  }

  /**
   * Adds a sub-project to this project.
   *
   * This is automatically called when a new project is created with `parent`
   * pointing to this project, so there is no real need to call this manually.
   *
   * @param sub-project The child project to add.
   * @internal
   */
  _addSubProject(subproject: Project): void {
    super._addSubProject(subproject)

    this.factory.addSubProject(subproject)
  }

  preSynthesize() {
    super.preSynthesize()
    this.factory.build()
  }
}

class LernaProjectFactory {
  private subProjects: Record<string, Project> = {}

  constructor(private readonly project: ILernaProject & javascript.NodeProject) {
    project.addDevDeps('lerna-projen', 'lerna@5')
  }

  addSubProject(subProject: Project) {
    const {outdir} = subProject

    const relativeOutDir = outdir.replace(`${this.project.outdir}/`, '')

    this.subProjects[relativeOutDir] = subProject
  }

  build() {
    this.project.packageTask.reset(`mkdir -p ${this.project.artifactsJavascriptDirectory}`)
    this.project.preCompileTask.exec(`lerna-projen clean-dist ${this.project.artifactsDirectory}`)

    this.appendLernaCommands()
    this.addCrossLinks()
    this.updateSubProjects()
    this.addDocumentsIndex()
  }

  private addCrossLinks() {

    const lernaConfig: any = {
      useNx: this.project.useNx,
      version: this.project.independentMode ? 'independent' : '0.0.0',
    }

    const packages = Object.keys(this.subProjects)

    if (this.project.useWorkspaces)
      this.project.package.addField('packages', packages)
    else
      lernaConfig.packages = packages


    new JsonFile(this.project, 'lerna.json', {
      obj: lernaConfig,
    })
  }

  private appendLernaCommands() {
    const upgradeTaskName = 'upgrade'
    const postUpgradeTaskName = 'post-upgrade'
    const postUpgradeTask = this.project.tasks.tryFind(postUpgradeTaskName)
    postUpgradeTask?.prependExec(this.getLernaCommand(upgradeTaskName, {sinceLastRelease: false}))
    postUpgradeTask?.exec('npx projen')
    postUpgradeTask?.exec(this.getLernaCommand(postUpgradeTaskName))

    this.project.tasks.all
      .forEach(task => {
        const customization = this.project.taskCustomizations[task.name]
        const addLernaStep = customization?.addLernaStep ?? true

        if (lockedTaskNames.includes(task.name) || task.name === postUpgradeTaskName || !addLernaStep)
          return

        task.exec(this.getLernaCommand(task.name, customization))
      })
  }

  private getLernaCommand(taskName: string, customization?: TaskCustomization) {
    const mainCommand = `lerna run ${taskName} --stream`
    const useSinceFlag = customization?.sinceLastRelease ?? this.project.sinceLastRelease

    const includePatterns = customization?.include ?? []
    const excludePatterns = customization?.exclude ?? []

    const scopeFlags = includePatterns.map((glob) => ` --scope ${glob}`).join('')
    const ignoreFlags = excludePatterns.map((glob) => ` --ignore ${glob}`).join('')


    const postCommand = useSinceFlag ? ' --since $(git describe --abbrev=0 --tags --match "v*")' : ''
    return `${mainCommand}${postCommand}${scopeFlags}${ignoreFlags}`
  }

  private updateSubProjects() {
    const bumpTask = this.project.tasks.tryFind('bump')
    const unbumpTask = this.project.tasks.tryFind('unbump')

    Object.entries(this.subProjects).forEach(([subProjectPath, subProject]) => {
      const subProjectDocsDirectory = getDocsDirectory(subProject)
      if (this.project.docgen && subProjectDocsDirectory)
        this.project.postCompileTask.exec(`lerna-projen move-docs ${this.project.docsDirectory} ${subProjectPath} ${subProjectDocsDirectory}`)

      const packageAllTask = subProject.tasks.tryFind('package-all')

      if (packageAllTask)
        subProject.packageTask.spawn(packageAllTask)

      const artifactsDirectory = getArtifactsDirectory(subProject)

      this.project.packageTask.exec(`lerna-projen copy-dist ${subProjectPath}/${artifactsDirectory} ${this.project.artifactsDirectory}`)

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
    if (!this.project.docgen)
      return

    const subProjectsDocs: Record<string, string> = {}

    const indexMarkdown = new SourceCode(this.project, `${this.project.docsDirectory}/index.md`)
    const readmeMarkdown = new SourceCode(this.project, `${this.project.docsDirectory}/README.md`)

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

    const indexHtml = new SourceCode(this.project, `${this.project.docsDirectory}/index.html`)
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

    this.project.gitattributes.addAttributes(`/${this.project.docsDirectory}/**`, 'linguist-generated')
  }
}