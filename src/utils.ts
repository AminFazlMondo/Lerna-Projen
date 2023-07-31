import {NodeProject} from 'projen/lib/javascript'

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
  project.package.addField('nx', {
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
  })
}