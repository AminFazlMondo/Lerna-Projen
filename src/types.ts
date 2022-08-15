import {javascript} from 'projen'

export interface LernaProjectOptions extends javascript.NodeProjectOptions {
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

  /**
   * (experimental) Flag to run tasks only for the packages that has changes since last release
   *
   * @default false
   * @experimental
   */
  readonly sinceLastRelease?: boolean;

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

}