import {NodeProject} from 'projen/lib/javascript'
import {synthSnapshot} from 'projen/lib/util/synth'
import {addNxTaskDependency, addNxProjectDependency} from '../src/utils'

describe('utils', () => {
  describe('addNxTaskDependency', () => {
    test('should add dependency in nx', () => {
      const project1 = new NodeProject({
        defaultReleaseBranch: 'main',
        name: 'project-1',
      })
      const project2 = new NodeProject({
        defaultReleaseBranch: 'main',
        name: 'project-2',
      })
      const project3 = new NodeProject({
        defaultReleaseBranch: 'main',
        name: 'project-3',
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
      })
      const project2 = new NodeProject({
        defaultReleaseBranch: 'main',
        name: 'project-2',
      })
      const project3 = new NodeProject({
        defaultReleaseBranch: 'main',
        name: 'project-3',
      })

      addNxProjectDependency(project1, project2, project3)
      addNxProjectDependency(project2, project3)

      const output1 = synthSnapshot(project1)
      const output2 = synthSnapshot(project2)

      expect(output1['package.json'].nx).toMatchSnapshot()
      expect(output2['package.json'].nx).toMatchSnapshot()
    })
  })
})