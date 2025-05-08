import { Command } from 'commander';
import { copy, readdirSync, existsSync, move, emptyDirSync, readFileSync, writeFileSync } from 'fs-extra';

const program = new Command();

interface FileDetailsType {
  path: string;
  content?: Buffer | undefined;
}

program
  .command('clean-dist <distFolder>')
  .action(async (distFolder) => {
    const existingFiles: string[] = [
      `${distFolder}/changelog.md`,
      `${distFolder}/version.txt`,
      `${distFolder}/releasetag.txt`,
    ];
    const fileDetails = existingFiles.map(readFileIfExists);
    emptyDirSync(distFolder);
    fileDetails.forEach(writeFileIfExists);
  });

program
  .command('copy-dist <subProjectDist> <parentDist>')
  .action(async (subProjectPath, parentDist) => {
    const subProjectDist = `./${subProjectPath}`;
    if (!existsSync(subProjectDist)) {return;}

    const entries = readdirSync(subProjectDist);
    await Promise.all(entries.map(f => copy(`${subProjectDist}/${f}`, `${parentDist}/${f}`, { recursive: true, overwrite: true })));
  });


program
  .command('move-docs <parentDocsDirectory> <subProjectPath> <subProjectDocsDirectory>')
  .action(async (parentDocsDirectory, subProjectPath, subProjectDocsDirectory) => {
    await moveDocs(parentDocsDirectory, subProjectPath, subProjectDocsDirectory, false);
    await moveDocs(parentDocsDirectory, subProjectPath, 'API.md', true);
  });

async function moveDocs(parentDocsDirectory: string, subProjectPath: string, subPath: string, isFile: boolean): Promise<void> {
  const subProjectDocs = `./${subProjectPath}/${subPath}`;
  if (!existsSync(subProjectDocs)) {return;}

  const destinationFolder = `./${parentDocsDirectory}/${subProjectPath}`;
  emptyDirSync(destinationFolder);
  const moveOptions = { overwrite: true };
  if (isFile) {
    await move(subProjectDocs, `${destinationFolder}/${subPath}`, moveOptions);
  } else {
    const entries = readdirSync(subProjectDocs);
    await Promise.all(entries.map(f => move(`${subProjectDocs}/${f}`, `${destinationFolder}/${f}`, moveOptions)));
  }
}

function readFileIfExists(filePath: string): FileDetailsType {
  if (!(existsSync(filePath))) {return { path: filePath };}

  return {
    path: filePath,
    content: readFileSync(filePath),
  };
}

function writeFileIfExists(details: FileDetailsType): void {
  if (!details.content) {return;}

  writeFileSync(details.path, details.content);
}

program.parse(process.argv);