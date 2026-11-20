export const ptBR = {
  'popup.title': 'Neruz Page View',
  'popup.quickShot.label': 'Print bonito',
  'popup.quickShot.hint': 'Este site com moldura de aparelho, pronto para baixar.',
  'popup.openStudio.label': 'Abrir no Estúdio',
  'popup.openStudio.hint': 'Veja em várias telas ao mesmo tempo.',
  'popup.openUrl.placeholder': 'Ou cole um endereço (ex.: localhost:3000)',
  'popup.openUrl.button': 'Abrir',
  'popup.unsupportedPage':
    'Esta página é do próprio navegador e não pode ser capturada. Abra um site e tente de novo.',

  'studio.bar.url.placeholder': 'Digite ou cole um endereço',
  'studio.bar.url.go': 'Abrir',
  'studio.bar.useCurrentTab': 'Usar aba atual',
  'studio.bar.mirror.label': 'Espelhar',
  'studio.bar.mirror.on': 'Espelhar: ligado',
  'studio.bar.mirror.off': 'Espelhar: desligado',
  'studio.bar.mirror.tooltip': 'Role ou clique em uma tela e as outras repetem.',
  'studio.bar.zoom.in': 'Aproximar',
  'studio.bar.zoom.out': 'Afastar',
  'studio.bar.zoom.fit': 'Caber',
  'studio.bar.active.count': '{n}/{total} ativas',
  'studio.bar.active.tooltip':
    'Até {total} telas ficam ativas ao mesmo tempo para o computador não travar.',

  'studio.library.cat.phone': 'Celular',
  'studio.library.cat.laptop': 'Notebook',
  'studio.library.custom.width': 'Largura (px)',
  'studio.library.custom.height': 'Altura (px)',
  'studio.library.custom.error.range': 'Use um valor entre {min} e {max}.',

  'studio.screen.a11yName': 'Tela {n}, {device}, {w} por {h}',
  'studio.screen.rotate': 'Girar',
  'studio.screen.dark': 'Modo escuro',
  'studio.screen.active': 'Ativa',

  'studio.capture.title': 'Captura',
  'studio.capture.mode.label': 'Modo',
  'studio.capture.mode.quick.label': 'Rápido',
  'studio.capture.mode.quick.desc': 'Captura agora, do jeito que está.',
  'studio.capture.mode.experience.label': 'Experiência',
  'studio.capture.mode.experience.desc': 'Espera as animações terminarem.',
  'studio.capture.mode.moments.label': 'Momentos',
  'studio.capture.mode.moments.desc': 'Um print por seção da página.',
  'studio.capture.mode.recommended': 'Recomendado',
  'studio.capture.target.label': 'O que capturar',
  'studio.capture.target.active': 'Tela ativa',
  'studio.capture.target.all': 'Todas as telas',
  'studio.capture.advanced': 'Avançado',
  'studio.capture.advanced.format': 'Formato',
  'studio.capture.cta': 'Capturar',
  'studio.capture.cta.all': 'Capturar {n} telas',

  'queue.step.waiting': 'Esperando as animações',
  'queue.step.capturing': 'Capturando',
  'queue.step.stitching': 'Juntando as partes',
  'queue.progress': '{percent}%',
  'queue.cancel': 'Cancelar',

  'perm.site.title': 'Permitir {domain}?',
  'perm.site.body':
    'Para mostrar este site nas telas, o navegador precisa da sua permissão para {domain}.',
  'perm.site.what':
    'A extensão só abre, espelha e captura as páginas que você escolher. Nada sai do seu computador.',
  'perm.site.next': 'Em seguida, o navegador vai mostrar uma janela própria. Confirme lá.',
  'perm.site.allow': 'Permitir só este site',
  'perm.site.later': 'Agora não',
  'perm.site.granted': 'Pronto, {domain} liberado.',
  'perm.site.denied':
    'Sem permissão, este site não aparece nas telas. Você pode permitir quando quiser.',
  'perm.localhost.body':
    'Para testar seu projeto local, permita o acesso a {domain}. Vale só para ele.',

  'block.frame.title': 'Este site não deixa ser exibido aqui',
  'block.frame.body':
    'É uma escolha de segurança do próprio site, não um erro seu. Você ainda pode capturá-lo de outro jeito.',
  'block.timeout.title': 'Esta página demorou demais',
  'block.timeout.body':
    'Ela não terminou de carregar em {s} segundos. Pode ser o site ou a conexão.',
  'block.action.retry': 'Tentar de novo',

  'state.empty.title': 'Qual site você quer ver?',
  'state.empty.body': 'Digite um endereço ou use a aba que já está aberta.',
  'state.empty.examples': 'Exemplos:',
  'state.loading.screen': 'Carregando {device}',
  'state.error.generic.title': 'Não deu certo desta vez',
  'state.error.generic.body':
    'Algo travou durante a captura. Tente de novo; se repetir, pule esta tela.',
  'state.error.invalidUrl': 'Esse endereço não parece válido. Confira e tente de novo.',
  'state.error.copyFailed': 'Não foi possível copiar. Use Baixar.',
  'state.error.retry': 'Tentar de novo',
  'state.success.shot': 'Print pronto.',
  'state.success.download': 'Baixar',
  'state.success.copy': 'Copiar',
  'state.success.show': 'Mostrar',
  'state.canceled': 'Tarefa cancelada.',
  'popup.preview.copied': 'Copiado.',

  'common.close': 'Fechar',

  'settings.credits': 'Desenvolvido por Fonte Dev · Bruno Lucas',
} as const;

export type MessageKey = keyof typeof ptBR;
