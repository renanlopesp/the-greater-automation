import type { AppModule } from './types'

export const slackModule: AppModule = {
  appId: 'slack',
  displayName: 'Slack',
  actions: {
    SLACK_SEND_MESSAGE: {
      fieldOverrides: {
        channel: {
          type: 'select',
          dataSource: {
            action: 'SLACK_LIST_CHANNELS',
            displayField: 'name',
            valueField: 'id',
          },
        },
      },
    },
    SLACK_SEND_DM: {
      fieldOverrides: {
        user: {
          type: 'select',
          dataSource: {
            action: 'SLACK_LIST_USERS',
            displayField: 'real_name',
            valueField: 'id',
          },
        },
      },
    },
  },
}
