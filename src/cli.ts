import {Command} from 'commander'
import {copy, readdirSync, remove, existsSync, move} from 'fs-extra'

const program = new Command()

const distFolder = './dist'

program
  .command('clean-dist')
  .action(async () => {
    const entries = readdirSync(distFolder)
    await Promise.all(entries.map(f => remove(`${distFolder}/${f}`)))
  })

program
  .command('copy-dist <subProjectPath>')
  .action(async (subProjectPath) => {
    const subProjectDist = `./${subProjectPath}/dist`
    if (!existsSync(subProjectDist))
      return

    const entries = readdirSync(subProjectDist)
    await Promise.all(entries.map(f => copy(`${subProjectDist}/${f}`, `${distFolder}/${f}`, {recursive: true})))
  })


program
  .command('move-docs <parentDocsDirectory> <subProjectPath> <subProjectDocsDirectory>')
  .action(async (parentDocsDirectory, subProjectPath, subProjectDocsDirectory) => {
    await moveDocs(parentDocsDirectory, subProjectPath, subProjectDocsDirectory, false)
    await moveDocs(parentDocsDirectory, subProjectPath, 'API.md', true)
  })

async function moveDocs(parentDocsDirectory: string, subProjectPath: string, subPath: string, isFile: boolean): Promise<void> {
  const subProjectDocs = `./${subProjectPath}/${subPath}`
  if (!existsSync(subProjectDocs))
    return
  if (isFile) {
    await move(subProjectDocs, `./${parentDocsDirectory}/${subProjectPath}/${subPath}`)
  } else {
    const entries = readdirSync(subProjectDocs)
    await Promise.all(entries.map(f => move(`${subProjectDocs}/${f}`, `./${parentDocsDirectory}/${subProjectPath}/${f}`)))
  }
}

program.parse(process.argv)