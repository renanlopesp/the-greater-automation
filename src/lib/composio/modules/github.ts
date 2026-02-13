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
            action: 'GITHUB_LIST_USER_REPOS',
            displayField: 'full_name',
            valueField: 'name',
          },
        },
        labels: {
          type: 'multi-select',
          dataSource: {
            action: 'GITHUB_LIST_REPO_LABELS',
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
            action: 'GITHUB_LIST_USER_REPOS',
            displayField: 'full_name',
            valueField: 'name',
          },
        },
      },
    },
    GITHUB_ADD_COMMENT_TO_ISSUE: {
      fieldOverrides: {
        repo: {
          type: 'select',
          dataSource: {
            action: 'GITHUB_LIST_USER_REPOS',
            displayField: 'full_name',
            valueField: 'name',
          },
        },
      },
    },
    GITHUB_CREATE_PR_COMMENT: {
      fieldOverrides: {
        repo: {
          type: 'select',
          dataSource: {
            action: 'GITHUB_LIST_USER_REPOS',
            displayField: 'full_name',
            valueField: 'name',
          },
        },
      },
    },
  },
}
