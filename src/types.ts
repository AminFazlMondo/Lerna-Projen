import {NodeProjectOptions} from 'projen'

export interface LernaProjectOptions extends NodeProjectOptions {
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
}