import { NextRequest, NextResponse } from "next/server";

function escapeAttribute(value: string) {
  return value.replace(/["<>]/g, "");
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug")?.trim().toLowerCase();

  if (!slug) {
    return new NextResponse("// Missing slug", {
      status: 400,
      headers: { "Content-Type": "application/javascript; charset=utf-8" },
    });
  }

  const origin = request.nextUrl.origin;
  const safeSlug = escapeAttribute(slug);
  const dataUrl = `${origin}/api/widget/testimonials/data?slug=${encodeURIComponent(
    safeSlug
  )}`;

  const script = `(function(){var dataUrl=${JSON.stringify(
    dataUrl
  )};var current=document.currentScript;var container=(current&&current.previousElementSibling&&current.previousElementSibling.matches('[data-reviewpilot-testimonials]'))?current.previousElementSibling:document.querySelector('[data-reviewpilot-testimonials]');if(!container){container=document.createElement('div');container.setAttribute('data-reviewpilot-testimonials','');(current&&current.parentNode?current.parentNode:document.body).insertBefore(container,current||null);}var root=container.attachShadow?container.attachShadow({mode:'open'}):container;var style=document.createElement('style');style.textContent=\`
  :host{all:initial}
  .rpw-shell{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#f8fafc}
  .rpw-frame{position:relative;overflow:hidden;border-radius:28px;border:1px solid rgba(255,255,255,.10);background:linear-gradient(180deg,rgba(7,17,29,.97),rgba(7,17,29,.88));padding:28px;box-shadow:0 22px 80px rgba(3,8,20,.34)}
  .rpw-frame:before{content:'';position:absolute;inset:0 0 auto 0;height:180px;background:radial-gradient(circle at top left,rgba(52,211,153,.18),transparent 58%)}
  .rpw-frame[data-theme="MIDNIGHT"]:before{background:radial-gradient(circle at top left,rgba(56,189,248,.18),transparent 58%)}
  .rpw-frame[data-theme="GLASS"]{background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.04));border-color:rgba(255,255,255,.16)}
  .rpw-frame[data-theme="GLASS"]:before{background:radial-gradient(circle at top left,rgba(255,255,255,.16),transparent 58%)}
  .rpw-head{position:relative;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
  .rpw-badge{display:inline-flex;align-items:center;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);padding:8px 12px;border-radius:999px;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.52)}
  .rpw-chip{display:inline-flex;align-items:center;border-radius:999px;padding:8px 12px;font-size:12px}
  .rpw-frame[data-theme="EMERALD"] .rpw-chip{border:1px solid rgba(52,211,153,.22);background:rgba(16,185,129,.12);color:#bbf7d0}
  .rpw-frame[data-theme="MIDNIGHT"] .rpw-chip{border:1px solid rgba(56,189,248,.22);background:rgba(14,165,233,.12);color:#bae6fd}
  .rpw-frame[data-theme="GLASS"] .rpw-chip{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.08);color:rgba(255,255,255,.82)}
  .rpw-copy{position:relative;max-width:760px;margin-top:22px}
  .rpw-title{margin:0;font-size:32px;line-height:1.15;font-weight:650;letter-spacing:-.03em}
  .rpw-sub{margin:14px 0 0;color:rgba(255,255,255,.62);font-size:15px;line-height:1.8}
  .rpw-grid{position:relative;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:28px}
  .rpw-card{border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.04);border-radius:24px;padding:20px;backdrop-filter:blur(8px)}
  .rpw-stars{font-size:14px;letter-spacing:.12em}
  .rpw-frame[data-theme="MIDNIGHT"] .rpw-stars{color:#93c5fd}
  .rpw-frame[data-theme="GLASS"] .rpw-stars{color:#d1fae5}
  .rpw-frame[data-theme="EMERALD"] .rpw-stars{color:#6ee7b7}
  .rpw-quote{margin:16px 0 0;color:rgba(255,255,255,.82);font-size:14px;line-height:1.85}
  .rpw-meta{margin-top:18px;padding-top:14px;border-top:1px solid rgba(255,255,255,.09)}
  .rpw-name{margin:0;font-size:14px;font-weight:600;color:#fff}
  .rpw-detail{margin:6px 0 0;font-size:12px;color:rgba(255,255,255,.46)}
  .rpw-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:20px;padding-top:14px;border-top:1px solid rgba(255,255,255,.08);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.38)}
  .rpw-support{letter-spacing:0;text-transform:none;font-size:12px;color:rgba(255,255,255,.48)}
  .rpw-empty{padding:28px 12px 6px;color:rgba(255,255,255,.52);font-size:14px}
  @media (max-width:960px){.rpw-grid{grid-template-columns:1fr}.rpw-title{font-size:28px}}
  @media (max-width:640px){.rpw-frame{padding:22px}.rpw-title{font-size:24px}.rpw-sub{font-size:14px}}
  \`;root.innerHTML='';root.appendChild(style);var mount=document.createElement('div');mount.className='rpw-shell';mount.innerHTML='<div class="rpw-frame"><div class="rpw-head"><span class="rpw-badge">Loading widget</span><span class="rpw-chip">Loading...</span></div><div class="rpw-copy"><h2 class="rpw-title">Loading recent customer experiences</h2><p class="rpw-sub">Preparing the latest 5-star highlights for this website.</p></div></div>';root.appendChild(mount);fetch(dataUrl,{headers:{Accept:'application/json'}}).then(function(res){if(!res.ok){throw new Error('widget-unavailable')}return res.json()}).then(function(data){var theme=data.theme||'EMERALD';var chipLabel=theme==='MIDNIGHT'?'Midnight glass':theme==='GLASS'?'Soft glass':'Emerald glow';var cards=(data.items||[]).map(function(item){var detail=item.visitCount>1?item.visitCount+' visits captured':'Verified 5-star visit';return '<article class="rpw-card"><div class="rpw-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div><p class="rpw-quote">&ldquo;'+escapeHtml(item.quote)+'&rdquo;</p><div class="rpw-meta"><p class="rpw-name">'+escapeHtml(item.customerName)+'</p><p class="rpw-detail">'+escapeHtml(detail)+'</p></div></article>';}).join('');var footer='<div class="rpw-footer"><span>'+escapeHtml(data.footerLabel||'Powered by ReviewPilot AI')+'</span>'+(data.supportEmail?'<span class="rpw-support">'+escapeHtml(data.supportEmail)+'</span>':'')+'</div>';mount.innerHTML='<div class="rpw-frame" data-theme=\"'+escapeHtml(theme)+'\"><div class="rpw-head"><span class="rpw-badge">'+escapeHtml(data.badgeLabel||'Review widget')+'</span><span class="rpw-chip">'+escapeHtml(chipLabel)+'</span></div><div class="rpw-copy"><h2 class="rpw-title">'+escapeHtml(data.headline)+'</h2><p class="rpw-sub">'+escapeHtml(data.subheadline)+'</p></div>'+(cards?'<div class="rpw-grid">'+cards+'</div>':'<div class="rpw-empty">No public-safe 5-star highlights are available yet.</div>')+footer+'</div>';}).catch(function(){mount.innerHTML='<div class="rpw-frame"><div class="rpw-head"><span class="rpw-badge">Widget unavailable</span><span class="rpw-chip">Unavailable</span></div><div class="rpw-copy"><h2 class="rpw-title">Widget unavailable</h2><p class="rpw-sub">This testimonial widget is not enabled yet or does not have any publishable 5-star highlights.</p></div></div>';});function escapeHtml(value){return String(value||'').replace(/[&<>\"']/g,function(char){return ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'})[char]||char;});}})();`;

  return new NextResponse(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=900",
    },
  });
}
