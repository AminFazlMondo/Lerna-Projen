import { NodeProject } from 'projen/lib/javascript';

function generateNxTargetEntriesForTaskDependency(options: AddNxTaskDependencyOptions) {
  function getDependentOnAttribute() {
    const { dependsOnTaskName, dependsOnProjects } = options;

    if (dependsOnProjects.length === 0 && !dependsOnTaskName) {return undefined;}

    return [{
      projects: dependsOnProjects.length === 0 ? undefined : dependsOnProjects.map(d => d.package.packageName),
      target: dependsOnTaskName,
    }];
  }
  return [
    options.taskName,
    {
      dependsOn: getDependentOnAttribute(),
      cache: options.cache ?? undefined,
      inputs: options.inputs && options.inputs.length > 0 ? options.inputs : undefined,
      outputs: options.outputs && options.outputs.length > 0 ? options.outputs : undefined,
    },
  ];
}

function generateNxConfigForTasksDependency(options: AddNxTaskDependencyOptions[]) {
  return {
    targets: Object.fromEntries(options.map(generateNxTargetEntriesForTaskDependency)),
  };
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
  project.package.addField('nx', generateNxConfigForTasksDependency([{ taskName, dependsOnTaskName, dependsOnProjects }]));
}

function generateNxConfigForProjectDependency(dependsOn: NodeProject[]) {
  return {
    implicitDependencies: dependsOn.map(d => d.package.packageName),
  };
}

/**
 * Adds dependency to the project for NX task runner
 * see https://nx.dev/reference/project-configuration#implicitdependencies
 *
 * @param project The Project to add dependency to
 * @param dependsOn The packages that source project is dependent on
 */
export function addNxProjectDependency(project: NodeProject, ...dependsOn: NodeProject[]): void {
  project.package.addField('nx', generateNxConfigForProjectDependency(dependsOn));
}

export interface AddNxTaskDependencyOptions {
  /**
   * The task name that is dependent on another tasks
   */
  readonly taskName: string;

  /**
   * The task name that is dependent on in other projects
   */
  readonly dependsOnTaskName?: string;

  /**
   * The packages that source project is dependent on
   */
  readonly dependsOnProjects: NodeProject[];

  /**
   * Cache Task Results
   * @default false
   */
  readonly cache?: boolean;

  /**
   * define what gets included as part of the calculated hash (e.g. files, environment variables, etc.)
   */
  readonly inputs?: string[];

  /**
   * define folders where files might be placed as part of the task execution.
   */
  readonly outputs?: string[];
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
  if (options.taskDependency && options.tasksDependency) {throw new Error('Task Dependency and Tasks dependency option cannot be used in conjunction');}

  const projectDependencyConfig =
    options.projectDependency ? generateNxConfigForProjectDependency(options.projectDependency.dependsOnProjects) : undefined;

  const tasksDependency = options.taskDependency ? [options.taskDependency] : options.tasksDependency;

  const taskDependencyConfig =
    tasksDependency ?
      generateNxConfigForTasksDependency(tasksDependency):
      undefined;

  project.package.addField('nx', {
    ...projectDependencyConfig,
    ...taskDependencyConfig,
  });
}
