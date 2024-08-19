import {NodeProject} from 'projen/lib/javascript'
import {synthSnapshot} from 'projen/lib/util/synth'
import {mkdtemp} from './util'
import {addNxTaskDependency, addNxProjectDependency, addNxDependency} from '../src/utils'

describe('utils', () => {
  describe('addNxTaskDependency', () => {
    test('should add dependency in nx', () => {
      const project1 = new NodeProject({
        defaultReleaseBranch: 'main',
        name: 'project-1',
        outdir: mkdtemp(),
      })
      const project2 = new NodeProject({
        defaultReleaseBranch: 'main',
        name: 'project-2',
        outdir: mkdtemp(),
      })
      const project3 = new NodeProject({
        defaultReleaseBranch: 'main',
        name: 'project-3',
        outdir: mkdtemp(),
      })

      addNxTaskDependency(project1, 'test', 'lint', project2, project3)
      addNxTaskDependency(project2, 'compile', 'pre-compile', project1)

      const output1 = synthSnapshot(project1)
      const output2 = synthSnapshot(project2)

      expect(output1['package.json'].nx).toMatchSnapshot()
      expect(output2['package.json'].nx).toMatchSnapshot()
    })
  })

  describe('addNxProjectDependency', () => {
    test('should add dependency in nx', () => {
      const project1 = new NodeProject({
        defaultReleaseBranch: 'main',
        name: 'project-1',
        outdir: mkdtemp(),
      })
      const project2 = new NodeProject({
        defaultReleaseBranch: 'main',
        name: 'project-2',
        outdir: mkdtemp(),
      })
      const project3 = new NodeProject({
        defaultReleaseBranch: 'main',
        name: 'project-3',
        outdir: mkdtemp(),
      })

      addNxProjectDependency(project1, project2, project3)
      addNxProjectDependency(project2, project3)

      const output1 = synthSnapshot(project1)
      const output2 = synthSnapshot(project2)

      expect(output1['package.json'].nx).toMatchSnapshot()
      expect(output2['package.json'].nx).toMatchSnapshot()
    })
  })

  describe('addNxDependency', () => {
    test('should add dependency in nx when only task dependency is specified', () => {
      const project1 = new NodeProject({
        defaultReleaseBranch: 'main',
        name: 'project-1',
        outdir: mkdtemp(),
      })
      const project2 = new NodeProject({
        defaultReleaseBranch: 'main',
        name: 'project-2',
        outdir: mkdtemp(),
      })
      const project3 = new NodeProject({
        defaultReleaseBranch: 'main',
        name: 'project-3',
        outdir: mkdtemp(),
      })

      addNxDependency(project1, {
        tasksDependency: [{
          taskName: 'test',
          dependsOnTaskName: 'lint',
          dependsOnProjects: [project2, project3],
        }],
      })

      const output1 = synthSnapshot(project1)

      expect(output1['package.json'].nx).toMatchSnapshot()
    })

    test('should add dependency in nx when only project dependency is specified', () => {
      const project1 = new NodeProject({
        defaultReleaseBranch: 'main',
        name: 'project-1',
        outdir: mkdtemp(),
      })
      const project2 = new NodeProject({
        defaultReleaseBranch: 'main',
        name: 'project-2',
        outdir: mkdtemp(),
      })
      const project3 = new NodeProject({
        defaultReleaseBranch: 'main',
        name: 'project-3',
        outdir: mkdtemp(),
      })

      addNxDependency(project1, {
        projectDependency: {
          dependsOnProjects: [project2, project3],
        },
      })

      const output1 = synthSnapshot(project1)

      expect(output1['package.json'].nx).toMatchSnapshot()
    })

    test('should add dependency in nx when both task and project dependency is specified', () => {
      const project1 = new NodeProject({
        defaultReleaseBranch: 'main',
        name: 'project-1',
        outdir: mkdtemp(),
      })
      const project2 = new NodeProject({
        defaultReleaseBranch: 'main',
        name: 'project-2',
        outdir: mkdtemp(),
      })
      const project3 = new NodeProject({
        defaultReleaseBranch: 'main',
        name: 'project-3',
        outdir: mkdtemp(),
      })

      addNxDependency(project1, {
        projectDependency: {
          dependsOnProjects: [project2],
        },
        tasksDependency: [
          {
            taskName: 'test',
            dependsOnTaskName: 'lint',
            dependsOnProjects: [project3],
          },
          {
            taskName: 'default',
            dependsOnTaskName: 'build',
            dependsOnProjects: [project3],
          },
        ],
      })

      const output1 = synthSnapshot(project1)

      expect(output1['package.json'].nx).toMatchSnapshot()
    })

    test('should add cache flag when specified', () => {
      const project1 = new NodeProject({
        defaultReleaseBranch: 'main',
        name: 'project-1',
        outdir: mkdtemp(),
      })
      const project2 = new NodeProject({
        defaultReleaseBranch: 'main',
        name: 'project-2',
        outdir: mkdtemp(),
      })
      const project3 = new NodeProject({
        defaultReleaseBranch: 'main',
        name: 'project-3',
        outdir: mkdtemp(),
      })

      addNxDependency(project1, {
        tasksDependency: [
          {
            taskName: 'test',
            dependsOnTaskName: 'lint',
            dependsOnProjects: [project3],
            cache: true,
          },
          {
            taskName: 'default',
            dependsOnTaskName: 'build',
            dependsOnProjects: [project2],
          },
        ],
      })

      const output1 = synthSnapshot(project1)

      expect(output1['package.json'].nx).toMatchSnapshot()
    })

    describe('deprecated', () => {
      test('should add dependency in nx when only task dependency is specified', () => {
        const project1 = new NodeProject({
          defaultReleaseBranch: 'main',
          name: 'project-1',
          outdir: mkdtemp(),
        })
        const project2 = new NodeProject({
          defaultReleaseBranch: 'main',
          name: 'project-2',
          outdir: mkdtemp(),
        })
        const project3 = new NodeProject({
          defaultReleaseBranch: 'main',
          name: 'project-3',
          outdir: mkdtemp(),
        })

        addNxDependency(project1, {
          taskDependency: {
            taskName: 'test',
            dependsOnTaskName: 'lint',
            dependsOnProjects: [project2, project3],
          },
        })

        const output1 = synthSnapshot(project1)

        expect(output1['package.json'].nx).toMatchSnapshot()
      })

      test('should add dependency in nx when both task and project dependency is specified', () => {
        const project1 = new NodeProject({
          defaultReleaseBranch: 'main',
          name: 'project-1',
          outdir: mkdtemp(),
        })
        const project2 = new NodeProject({
          defaultReleaseBranch: 'main',
          name: 'project-2',
          outdir: mkdtemp(),
        })
        const project3 = new NodeProject({
          defaultReleaseBranch: 'main',
          name: 'project-3',
          outdir: mkdtemp(),
        })

        addNxDependency(project1, {
          projectDependency: {
            dependsOnProjects: [project2],
          },
          taskDependency: {
            taskName: 'test',
            dependsOnTaskName: 'lint',
            dependsOnProjects: [project3],
          },
        })

        const output1 = synthSnapshot(project1)

        expect(output1['package.json'].nx).toMatchSnapshot()
      })
    })
  })
})