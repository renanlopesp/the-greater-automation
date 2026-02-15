import type { AppModule } from './types'

export const githubModule: AppModule = {
  appId: 'github',
  displayName: 'GitHub',
  actions: {
    GITHUB_CREATE_ISSUE: {
      fieldOverrides: {
        repo: {
          type: 'select',
          dataSource: {
            action: 'GITHUB_LIST_REPOSITORIES_FOR_THE_AUTHENTICATED_USER',
            displayField: 'full_name',
            valueField: 'name',
            params: { per_page: 100 },
          },
        },
        labels: {
          type: 'multi-select',
          dataSource: {
            action: 'GITHUB_LIST_LABELS_FOR_A_REPOSITORY',
            displayField: 'name',
            valueField: 'name',
            params: {},
          },
          dependsOn: ['owner', 'repo'],
        },
      },
    },
    GITHUB_UPDATE_ISSUE: {
      fieldOverrides: {
        repo: {
          type: 'select',
          dataSource: {
            action: 'GITHUB_LIST_REPOSITORIES_FOR_THE_AUTHENTICATED_USER',
            displayField: 'full_name',
            valueField: 'name',
            params: { per_page: 100 },
          },
        },
      },
    },
    GITHUB_ADD_COMMENT_TO_ISSUE: {
      fieldOverrides: {
        repo: {
          type: 'select',
          dataSource: {
            action: 'GITHUB_LIST_REPOSITORIES_FOR_THE_AUTHENTICATED_USER',
            displayField: 'full_name',
            valueField: 'name',
            params: { per_page: 100 },
          },
        },
      },
    },
    GITHUB_CREATE_PR_COMMENT: {
      fieldOverrides: {
        repo: {
          type: 'select',
          dataSource: {
            action: 'GITHUB_LIST_REPOSITORIES_FOR_THE_AUTHENTICATED_USER',
            displayField: 'full_name',
            valueField: 'name',
            params: { per_page: 100 },
          },
        },
      },
    },
  },
}
