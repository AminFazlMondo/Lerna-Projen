import {Command} from 'commander'
import {copy, readdirSync, existsSync, move, emptyDirSync, readFileSync, writeFileSync} from 'fs-extra'

const program = new Command()

program
  .command('clean-dist <distFolder>')
  .action(async (distFolder) => {
    const changeLogFilePath = `${distFolder}/changelog.md`
    const versionFilePath = `${distFolder}/version.txt`
    const releaseTagFilePath = `${distFolder}/releasetag.txt`
    const changeLogFile = readFileSync(changeLogFilePath)
    const versionFile = readFileSync(versionFilePath)
    const releaseTagFile = readFileSync(releaseTagFilePath)
    emptyDirSync(distFolder)
    writeFileSync(changeLogFilePath, changeLogFile)
    writeFileSync(versionFilePath, versionFile)
    writeFileSync(releaseTagFilePath, releaseTagFile)
  })

program
  .command('copy-dist <subProjectDist> <parentDist>')
  .action(async (subProjectPath, parentDist) => {
    const subProjectDist = `./${subProjectPath}`
    if (!existsSync(subProjectDist))
      return

    const entries = readdirSync(subProjectDist)
    await Promise.all(entries.map(f => copy(`${subProjectDist}/${f}`, `${parentDist}/${f}`, {recursive: true, overwrite: true})))
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

  const destinationFolder = `./${parentDocsDirectory}/${subProjectPath}`
  emptyDirSync(destinationFolder)
  const moveOptions = {overwrite: true}
  if (isFile) {
    await move(subProjectDocs, `${destinationFolder}/${subPath}`, moveOptions)
  } else {
    const entries = readdirSync(subProjectDocs)
    await Promise.all(entries.map(f => move(`${subProjectDocs}/${f}`, `${destinationFolder}/${f}`, moveOptions)))
  }
}

program.parse(process.argv)