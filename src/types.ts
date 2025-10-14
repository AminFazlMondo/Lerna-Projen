import { javascript, typescript } from 'projen';

export interface LernaCommonProjectOptions {
  /**
   * (experimental) Flag to run tasks only for the packages that has changes since last release
   *
   * @default false
   * @experimental
   */
  readonly sinceLastRelease?: boolean;

  /**
   * (experimental) Environment variable name to read the git reference from
   * to be used as the base for the `since` option in lerna commands.
   * If not provided, defaults to running git command to find last release tag.
   * The reference that is stored in the environment variable could be:
   * a commit SHA, branch name, or tag name.
   *
   * @experimental
   */
  readonly sinceGitReferenceEnvironmentVariableName?: string;

  /**
   * Whether or not to use Nx for task scheduling
   * https://lerna.js.org/docs/lerna-and-nx
   *
   * @default false
   */
  readonly useNx?: boolean;

  /**
   * Whether or not to use independent versioning for sub-projects
   * https://lerna.js.org/docs/features/version-and-publish#independent-mode
   *
   * @default false
   */
  readonly independentMode?: boolean;

  /**
   * Whether or not to use workspaces in the package.json file
   * Otherwise, will add packages to lerna.json
   *
   * @default false
   */
  readonly useWorkspaces?: boolean;

  /**
   * Key value pair of task name and TaskCustomization to customize the lerna run step added to the task.
   *
   * @default {} "No task customizations"
   */
  readonly taskCustomizations?: TaskCustomizations;

}

export interface LernaProjectOptions extends javascript.NodeProjectOptions, LernaCommonProjectOptions {
  /**
   * (experimental) Use TypeScript for your projenrc file (`.projenrc.ts`).
   *
   * @default false
   * @experimental
   */
  readonly projenrcTs?: boolean;

  /**
   * Consolidate sub projects doc files
   *
   * @default false
   * @experimental
   */
  readonly docgen?: boolean;

  /**
   * (experimental) Docs directory.
   *
   * @default "docs"
   * @experimental
   */
  readonly docsDirectory?: string;
}

export interface LernaTypescriptProjectOptions extends typescript.TypeScriptProjectOptions, LernaCommonProjectOptions {
  /**
   * Whether the project root package has source code.
   *
   * When set to `false`, removes typescript compilation from the compile step for the root project.
   *
   * @default false
   */
  readonly hasRootSourceCode?: boolean;
}

export type TaskCustomizations = { [taskName: string]: TaskCustomization };

export interface TaskCustomization {
  /**
   * Whether to add a lerna run step to the task
   *
   * @default true
   */
  readonly addLernaStep?: boolean;

  /**
   * List of glob patterns matching the name of packages to include in the lerna run step
   *
   * @default []
   */
  readonly include?: string[];

  /**
   * List of glob patterns matching the name of packages to exclude from the lerna run step
   *
   * @default []
   */
  readonly exclude?: string[];

  /**
   * (experimental) Flag to run tasks only for the packages that has changes since last release
   *
   * @default "Value passed in project options"
   */
  readonly sinceLastRelease?: boolean;
}