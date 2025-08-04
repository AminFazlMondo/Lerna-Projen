import * as path from 'path';
import { JsonFile, javascript, Project, Tasks, SourceCode, typescript, YamlFile } from 'projen';
import { LernaProjectOptions, LernaTypescriptProjectOptions, TaskCustomization, TaskCustomizations } from './types';

export * from './types';
export * as utils from './utils';

function getDocsDirectory(project: Project) {
  const result = Object.entries(project).find(([key]) => key === 'docsDirectory');
  return result?.[1].replace(/\/$/, '');
}

function getArtifactsDirectory(project: Project) {
  const result = Object.entries(project).find(([key]) => key === 'artifactsDirectory');
  return result?.[1];
}

const jsiiTaskPattern = /jsii-docgen -o (?<output>.+)$/i;

function extractJsiiDocsOutput(tasks: Tasks): string | undefined {
  const jsiiDocStep = tasks.tryFind('docgen')?.steps.find(step => jsiiTaskPattern.test(step.exec ?? ''));
  if (!jsiiDocStep || !jsiiDocStep.exec) {return;}

  const match = jsiiDocStep.exec.match(jsiiTaskPattern);
  return match?.groups?.output;
}

function appendWorkflowBootstrapSteps<T extends LernaProjectOptions | LernaTypescriptProjectOptions>(options: T): T {
  if (!options.sinceLastRelease) {return options;}

  return {
    ...options,
    workflowBootstrapSteps: [
      {
        name: 'Fetch tags',
        run: 'if [ $(git rev-parse --is-shallow-repository) != "false" ] ; then git fetch origin main --tags --unshallow; fi',
        if: '${{ github.workflow == \'build\' }}',
      },
      ...options.workflowBootstrapSteps ?? [],
    ],
  };
}

const lockedTaskNames = ['build', 'upgrade', 'upgrade-projen', 'clobber', 'post-upgrade'];

interface ILernaProject {
  readonly sinceLastRelease: boolean;
  readonly useNx: boolean;
  readonly independentMode: boolean;
  readonly useWorkspaces: boolean;
  readonly docsDirectory: string;
  readonly docgen?: boolean;
  readonly taskCustomizations: TaskCustomizations;
  readonly pnpmVersion?: string;

  customizeTask(taskName: string, customization: TaskCustomization): void;
}

/**
 * @pjid lerna-project
 */
export class LernaProject extends javascript.NodeProject implements ILernaProject {

  private projenrcTs: boolean;

  readonly docsDirectory: string;
  readonly docgen: boolean;
  readonly sinceLastRelease: boolean;
  readonly useNx: boolean;
  readonly independentMode: boolean;
  readonly useWorkspaces: boolean;
  readonly taskCustomizations: TaskCustomizations;
  readonly pnpmVersion?: string;

  private readonly factory: LernaProjectFactory;

  constructor(options: LernaProjectOptions) {
    super(appendWorkflowBootstrapSteps(options));

    if (options.projenrcTs) {this.addDevDeps('ts-node', 'typescript');}

    this.docsDirectory = options.docsDirectory ?? 'docs';
    this.docgen = options.docgen ?? false;
    this.sinceLastRelease = options.sinceLastRelease ?? false;
    this.useNx = options.useNx ?? false;
    this.projenrcTs = options.projenrcTs ?? false;
    this.independentMode = options.independentMode ?? false;
    this.useWorkspaces = options.useWorkspaces ?? false;
    this.taskCustomizations = options.taskCustomizations ?? {};
    this.pnpmVersion = options.pnpmVersion;

    this.factory = new LernaProjectFactory(this);
  }

  /**
   * Adds a customization for the specified task
   *
   * @param taskName Name of the task to customize
   * @param customization TaskCustomization options
   */
  customizeTask(taskName: string, customization: TaskCustomization): void {
    this.taskCustomizations[taskName] = customization;
  }

  preSynthesize() {
    super.preSynthesize();
    const projenCommand = this.projenrcTs ? 'ts-node --skip-project .projenrc.ts' : 'node .projenrc.js';
    const { defaultTask } = this;
    if (!defaultTask) {throw new Error('Could not find default task');}
    defaultTask.reset(projenCommand);

    this.factory.build();
  }
}

/**
 * @pjid lerna-ts-project
 */
export class LernaTypescriptProject extends typescript.TypeScriptProject implements ILernaProject {
  readonly sinceLastRelease: boolean;
  readonly useNx: boolean;
  readonly independentMode: boolean;
  readonly useWorkspaces: boolean;
  readonly taskCustomizations: TaskCustomizations;
  readonly pnpmVersion?: string;

  private readonly factory: LernaProjectFactory;

  constructor(options: LernaTypescriptProjectOptions) {
    super(appendWorkflowBootstrapSteps(options));

    this.sinceLastRelease = options.sinceLastRelease ?? false;
    this.useNx = options.useNx ?? false;
    this.independentMode = options.independentMode ?? false;
    this.useWorkspaces = options.useWorkspaces ?? false;
    this.taskCustomizations = options.taskCustomizations ?? {};
    this.pnpmVersion = options.pnpmVersion;

    if (!(options.hasRootSourceCode ?? false)) {this.tasks.tryFind('compile')?.reset();}

    this.tasks.tryFind('docgen')?.reset();

    this.factory = new LernaProjectFactory(this);
  }

  /**
   * Adds a customization for the specified task
   *
   * @param taskName Name of the task to customize
   * @param customization TaskCustomization options
   */
  customizeTask(taskName: string, customization: TaskCustomization): void {
    this.taskCustomizations[taskName] = customization;
  }

  preSynthesize() {
    super.preSynthesize();
    this.factory.build();
  }
}

class LernaProjectFactory {
  constructor(private readonly project: ILernaProject & javascript.NodeProject) {
    project.addDevDeps('lerna-projen', 'lerna');
  }

  build() {
    this.project.packageTask.reset(`mkdir -p ${this.project.artifactsJavascriptDirectory}`);
    this.project.preCompileTask.exec(`lerna-projen clean-dist ${this.project.artifactsDirectory}`);

    this.setupPackageManager();
    this.appendLernaCommands();
    this.addCrossLinks();
    this.updateSubProjects();
    this.addDocumentsIndex();
  }

  private setupPackageManager() {
    if (this.project.package.packageManager === javascript.NodePackageManager.PNPM && Number(this.project.pnpmVersion) >= 9) {
      this.project.npmrc.addConfig('node-linker', 'hoisted');
    }
  }

  private getSubProjectPath(subProject: Project) {
    return path.relative(this.project.outdir, subProject.outdir);
  }

  private addCrossLinks() {

    const lernaConfig: any = {
      useNx: this.project.useNx,
      version: this.project.independentMode ? 'independent' : '0.0.0',
    };

    const packages = this.project.subprojects.map(subProject => this.getSubProjectPath(subProject));

    if (this.project.useWorkspaces) {
      if (this.project.packageManager === javascript.NodePackageManager.PNPM) {
        new YamlFile(this.project, 'pnpm-workspace.yaml', {
          obj: {
            packages,
          },
        });
      }
      this.project.package.addField('workspaces', packages);
    } else {lernaConfig.packages = packages;}


    new JsonFile(this.project, 'lerna.json', {
      obj: lernaConfig,
    });
  }

  private appendLernaCommands() {
    const upgradeTaskName = 'upgrade';
    const postUpgradeTaskName = 'post-upgrade';
    const postUpgradeTask = this.project.tasks.tryFind(postUpgradeTaskName);
    postUpgradeTask?.prependExec(this.getLernaCommand(upgradeTaskName, { sinceLastRelease: false }));
    postUpgradeTask?.exec('npx projen');

    this.project.tasks.all
      .forEach(task => {
        const customization = this.project.taskCustomizations[task.name];
        const addLernaStep = customization?.addLernaStep ?? true;

        if (lockedTaskNames.includes(task.name) || !addLernaStep) {return;}

        task.exec(this.getLernaCommand(task.name, customization));
      });
  }

  private getLernaCommand(taskName: string, customization?: TaskCustomization) {
    const mainCommand = `lerna run ${taskName} --stream`;
    const useSinceFlag = customization?.sinceLastRelease ?? this.project.sinceLastRelease;

    const includePatterns = customization?.include ?? [];
    const excludePatterns = customization?.exclude ?? [];

    const scopeFlags = includePatterns.map((glob) => ` --scope ${glob}`).join('');
    const ignoreFlags = excludePatterns.map((glob) => ` --ignore ${glob}`).join('');


    const postCommand = useSinceFlag ? ' --since $(git describe --abbrev=0 --tags --match "v*" HEAD^)' : '';
    return `${mainCommand}${postCommand}${scopeFlags}${ignoreFlags}`;
  }

  private updateSubProjects() {
    const bumpTask = this.project.tasks.tryFind('bump');
    const unbumpTask = this.project.tasks.tryFind('unbump');

    this.project.subprojects.forEach((subProject) => {
      const subProjectDocsDirectory = getDocsDirectory(subProject);
      const subProjectPath = this.getSubProjectPath(subProject);
      if (this.project.docgen && subProjectDocsDirectory) {this.project.postCompileTask.exec(`lerna-projen move-docs ${this.project.docsDirectory} ${subProjectPath} ${subProjectDocsDirectory}`);}

      const packageAllTask = subProject.tasks.tryFind('package-all');

      if (packageAllTask) {subProject.packageTask.spawn(packageAllTask);}

      const artifactsDirectory = getArtifactsDirectory(subProject);

      this.project.packageTask.exec(`lerna-projen copy-dist ${subProjectPath}/${artifactsDirectory} ${this.project.artifactsDirectory}`);

      subProject.defaultTask?.reset();

      const bumpEnvs = {
        OUTFILE: 'package.json',
        CHANGELOG: `${artifactsDirectory}/changelog.md`,
        BUMPFILE: `${artifactsDirectory}/version.txt`,
        RELEASETAG: `${artifactsDirectory}/releasetag.txt`,
        RELEASE_TAG_PREFIX: '',
      };

      if (bumpTask && !subProject.tasks.tryFind('bump')) {
        const subBumpTask = subProject.addTask(bumpTask.name, {
          description: bumpTask.description,
          condition: bumpTask.condition,
          env: bumpEnvs,
        });
        subBumpTask.builtin('release/bump-version');
      }

      if (unbumpTask && !subProject.tasks.tryFind('unbump')) {
        const subBumpTask = subProject.addTask(unbumpTask.name, {
          description: unbumpTask.description,
          condition: unbumpTask.condition,
          env: bumpEnvs,
        });
        subBumpTask.builtin('release/reset-version');
      }
    });
  }

  private addDocumentsIndex() {
    if (!this.project.docgen) {return;}

    const subProjectsDocs: Record<string, string> = {};

    const indexMarkdown = new SourceCode(this.project, `${this.project.docsDirectory}/index.md`);
    const readmeMarkdown = new SourceCode(this.project, `${this.project.docsDirectory}/README.md`);

    this.project.subprojects.forEach((subProject) => {
      const subProjectDocsDirectory = getDocsDirectory(subProject);
      if (!subProjectDocsDirectory) {return;}

      const subProjectPath = this.getSubProjectPath(subProject);
      const jsiiDocsOutput = extractJsiiDocsOutput(subProject.tasks);
      if (jsiiDocsOutput) {
        const docsPath = `${subProjectPath}/${jsiiDocsOutput}`;
        indexMarkdown.line(`- ## [${subProject.name}](${docsPath})`);
        subProjectsDocs[subProject.name] = docsPath;
      } else {
        subProjectsDocs[subProject.name] = `${subProjectPath}/index.html`;
      }
      readmeMarkdown.line(`- ## [${subProject.name}](../${subProjectPath}/README.md)`);
    });

    const indexHtml = new SourceCode(this.project, `${this.project.docsDirectory}/index.html`);
    indexHtml.line('<!DOCTYPE html>');
    indexHtml.line('<html>');
    indexHtml.open('<body>');
    indexHtml.open('<ul>');
    Object.entries(subProjectsDocs).forEach(([name, docsPath]) => {
      indexHtml.open('<li>');
      indexHtml.open(`<a href="${docsPath}">`);
      indexHtml.line(name);
      indexHtml.close('</a>');
      indexHtml.close('</li>');
    });
    indexHtml.close('</ul>');
    indexHtml.close('</body>');
    indexHtml.line('</html>');
    indexHtml.line();

    this.project.gitattributes.addAttributes(`/${this.project.docsDirectory}/**`, 'linguist-generated');
  }
}