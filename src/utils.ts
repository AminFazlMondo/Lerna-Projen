import {NodeProject} from 'projen/lib/javascript'

function generateNxConfigForTaskDependency(taskName: string, dependsOnTaskName: string, dependsOn: NodeProject[]) {
  return {
    targets: {
      [taskName]: {
        dependsOn: [
          {
            projects: dependsOn.map(d => d.package.packageName),
            target: dependsOnTaskName,
          },
        ],
      },
    },
  }
}

/**
 * Adds dependency to the project for NX task runner
 * see https://nx.dev/reference/project-configuration#dependson
 *
 * @param project The Project to add dependency to
 * @param taskName The task name that is dependent on another tasks
 * @param dependsOnTaskName The task name that is dependent on in other projects
 * @param dependsOn The packages that source project is dependent on
 */
export function addNxTaskDependency(project: NodeProject, taskName: string, dependsOnTaskName: string, ...dependsOn: NodeProject[]): void {
  project.package.addField('nx', generateNxConfigForTaskDependency(taskName, dependsOnTaskName, dependsOn))
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

export interface AddNxDependencyOptions {
  /**
   * Task dependency options
   */
  taskDependency?: {
    /**
     * The task name that is dependent on another tasks
     */
    taskName: string;

    /**
     * The task name that is dependent on in other projects
     */
    dependsOnTaskName: string;

    /**
     * The packages that source project is dependent on
     */
    dependsOnProjects: NodeProject[];
  };

  /**
   * Project dependency options
   */
  projectDependency?: {
    /**
     * The packages that source project is dependent on
     */
    dependsOnProjects: NodeProject[];
  };
}

/**
 * Adds dependency to the project for NX task runner
 * see https://nx.dev/reference/project-configuration
 *
 * @param project The Project to add dependency to
 * @param options Dependency options
 */
export function addNxDependency(project: NodeProject, options: AddNxDependencyOptions): void {
  const projectDependencyConfig =
    options.projectDependency ? generateNxConfigForProjectDependency(options.projectDependency.dependsOnProjects) : undefined

  const taskDependencyConfig =
      options.taskDependency ?
        generateNxConfigForTaskDependency(
          options.taskDependency.taskName,
          options.taskDependency.dependsOnTaskName,
          options.taskDependency.dependsOnProjects)
        : undefined

  project.package.addField('nx', {
    ...projectDependencyConfig,
    ...taskDependencyConfig,
  })
}
