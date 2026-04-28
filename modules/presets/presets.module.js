// 预设模块入口（占位）：后续接入到预设页面
export async function mount(ctx){
  try{
    const extRoot = (() => {
      try {
        const url = new URL(import.meta.url);
        const marker = '/scripts/extensions/';
        const pathname = String(url.pathname || '');
        const index = pathname.lastIndexOf(marker);
        if (index < 0) return 'third-party/ST-Archichat';
        const relative = pathname.slice(index + marker.length).replace(/^\/+/, '');
        const parts = relative.split('/').filter(Boolean);
        if (parts[0] === 'third-party' && parts[1]) return `third-party/${parts[1]}`;
        if (parts[0]) return parts[0];
      } catch {}
      return 'third-party/ST-Archichat';
    })();

    const html = await ctx.renderExtensionTemplateAsync(`${extRoot}/modules/presets`, 'panel');
    const $el = $(html).hide();
    $('body').append($el);
  }catch(e){ console.warn('[ST-Archichat][presets] mount failed', e); }
}

