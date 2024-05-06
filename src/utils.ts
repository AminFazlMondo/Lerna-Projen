import {NodeProject} from 'projen/lib/javascript'

function generateNxTargetEntriesForTaskDependency(options: AddNxTaskDependencyOptions) {
  return [
    options.taskName,
    {
      dependsOn: [
        {
          projects: options.dependsOnProjects.map(d => d.package.packageName),
          target: options.dependsOnTaskName,
        },
      ],
    },
  ]
}

function generateNxConfigForTasksDependency(options: AddNxTaskDependencyOptions[]) {
  return {
    targets: Object.fromEntries(options.map(generateNxTargetEntriesForTaskDependency)),
  }
}

/**
 * Adds dependency to the project for NX task runner
 * see https://nx.dev/reference/project-configuration#dependson
 *
 * @param project The Project to add dependency to
 * @param taskName The task name that is dependent on another tasks
 * @param dependsOnTaskName The task name that is dependent on in other projects
 * @param dependsOnProjects The packages that source project is dependent on
 */
export function addNxTaskDependency(project: NodeProject, taskName: string, dependsOnTaskName: string, ...dependsOnProjects: NodeProject[]): void {
  project.package.addField('nx', generateNxConfigForTasksDependency([{taskName, dependsOnTaskName, dependsOnProjects}]))
}

function generateNxConfigForProjectDependency(dependsOn: NodeProject[]) {
  return {
    implicitDependencies: dependsOn.map(d => d.package.packageName),
  }
}

/**
 * Adds dependency to the project for NX task runner
 * see https://nx.dev/reference/project-configuration#implicitdependencies
 *
 * @param project The Project to add dependency to
 * @param dependsOn The packages that source project is dependent on
 */
export function addNxProjectDependency(project: NodeProject, ...dependsOn: NodeProject[]): void {
  project.package.addField('nx', generateNxConfigForProjectDependency(dependsOn))
}

export interface AddNxTaskDependencyOptions {
  /**
   * The task name that is dependent on another tasks
   */
  readonly taskName: string;

  /**
   * The task name that is dependent on in other projects
   */
  readonly dependsOnTaskName: string;

  /**
   * The packages that source project is dependent on
   */
  readonly dependsOnProjects: NodeProject[];
}

export interface AddNxProjectDependencyOptions {
  /**
   * The packages that source project is dependent on
   */
  readonly dependsOnProjects: NodeProject[];
}

export interface AddNxDependencyOptions {
  /**
   * Task dependency options
   * @deprecated use `tasksDependency`
   */
  readonly taskDependency?: AddNxTaskDependencyOptions;

  /**
   * Task dependency options
   */
  readonly tasksDependency?: AddNxTaskDependencyOptions[];

  /**
   * Project dependency options
   */
  readonly projectDependency?: AddNxProjectDependencyOptions;
}

/**
 * Adds dependency to the project for NX task runner
 * see https://nx.dev/reference/project-configuration
 *
 * @param project The Project to add dependency to
 * @param options Dependency options
 */
export function addNxDependency(project: NodeProject, options: AddNxDependencyOptions): void {
  if (options.taskDependency && options.tasksDependency)
    throw new Error('Task Dependency and Tasks dependency option cannot be used in conjunction')

  const projectDependencyConfig =
    options.projectDependency ? generateNxConfigForProjectDependency(options.projectDependency.dependsOnProjects) : undefined

  const tasksDependency = options.taskDependency ? [options.taskDependency] : options.tasksDependency

  const taskDependencyConfig =
    tasksDependency ?
      generateNxConfigForTasksDependency(tasksDependency):
      undefined

  project.package.addField('nx', {
    ...projectDependencyConfig,
    ...taskDependencyConfig,
  })
}
