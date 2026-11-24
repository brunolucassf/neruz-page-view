import { defineConfig } from 'wxt';

const GECKO_ID = 'neruz-page-view@fontedev.com';

export default defineConfig({
  manifestVersion: 3,
  manifest: ({ browser }) => {
    const isFirefox = browser === 'firefox';
    return {
      name: '__MSG_extName__',
      description: '__MSG_extDescription__',
      default_locale: 'en',
      version: '1.1.0',
      action: { default_title: '__MSG_extName__' },
      commands: {
        _execute_action: {
          suggested_key: { default: 'Alt+Shift+P' },
          description: '__MSG_commandOpen__',
        },
      },
      permissions: [
        'storage',
        'scripting',
        'activeTab',
        'declarativeNetRequestWithHostAccess',
        ...(isFirefox ? [] : ['offscreen']),
      ],
      optional_permissions: ['clipboardWrite', ...(isFirefox ? [] : ['tabCapture'])],
      optional_host_permissions: ['http://*/*', 'https://*/*'],
      content_security_policy: {
        extension_pages:
          "script-src 'self'; object-src 'self'; base-uri 'none'; form-action 'none'",
      },
      ...(isFirefox
        ? {
            browser_specific_settings: {
              gecko: {
                id: GECKO_ID,
                strict_min_version: '128.0',
                data_collection_permissions: {
                  required: ['none'],
                  optional: ['technicalAndInteraction'],
                },
              },
            },
          }
        : {}),
    };
  },
});
