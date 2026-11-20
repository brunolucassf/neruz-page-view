import { defineConfig } from 'wxt';

const isTestBuild = process.env.POC_TEST === '1';

export default defineConfig({
  outDir: isTestBuild ? '.output-test' : '.output',
  manifest: {
    name: isTestBuild ? 'Neros PoC (TESTE)' : 'Neros PoC',
    version: '0.0.1',
    permissions: [
      'storage',
      'scripting',
      'activeTab',
      'declarativeNetRequestWithHostAccess',
      'offscreen',
      ...(isTestBuild ? ['tabCapture'] : []),
    ],
    optional_permissions: isTestBuild ? [] : ['tabCapture'],
    optional_host_permissions: ['http://*/*', 'https://*/*'],
    ...(isTestBuild ? { host_permissions: ['<all_urls>'] } : {}),
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'; base-uri 'none'; form-action 'none'",
    },
    action: { default_title: 'Abrir Estudio' },
  },
});
