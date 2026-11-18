(() => {
  const APP = document.currentScript?.dataset.appId || 'pixel-app';
  const SPECS = {
    pixelArt: ['pixel-art sprite', 'Return JSON only: {"width":16,"height":16,"palette":["#hex"],"pixels":[[...]]}. pixels is height rows of width palette indexes. Use transparent as -1.'],
    pixelText: ['pixel lettering or icon art', 'Return JSON only: {"width":16,"height":16,"palette":["#hex"],"pixels":[[...]]}. pixels is height rows of width palette indexes. Use transparent as -1.'],
    pixelTilemap: ['seamless pixel tile', 'Return JSON only: {"width":16,"height":16,"palette":["#hex"],"pixels":[[...]]}. Make the edges tile seamlessly. pixels is height rows of width palette indexes; transparent is -1.'],
    pixelDualTilemaps: ['seamless dual tilemap tile', 'Return JSON only: {"width":16,"height":16,"palette":["#hex"],"pixels":[[...]]}. Make the edges tile seamlessly and use clear readable shapes. pixels is height rows of width palette indexes; transparent is -1.'],
    pixelPose: ['2D character pose', 'Return JSON only: {"nodes":[{"id":"node-id","x":0,"y":0}]}. Only include IDs from the supplied skeleton. Coordinates are in the editor character-local coordinate system. Keep feet near ground and limb lengths plausible.'],
    pixelMusic: ['Strudel music pattern', 'Return JSON only: {"pattern":"s(\"[bd sd]\").bank(\"tr909\")","title":"short name"}. "pattern" must be a single valid Strudel expression built from s(), note() or stack(), with method chains such as .bank()/.dec()/.lpf()/.fast(). No markdown, no explanation.'],
    pixelIsometric: ['isometric 3D scene', 'Return JSON only: {"objects":[{"type":"cube|sphere|cylinder|ramp|wall|building","position":[x,y,z],"scale":[x,y,z],"color":"#hex","name":"short name"}]}. Use at most 12 objects and coordinates between -8 and 8.'],
  };
  const spec = SPECS[APP];
  if (!spec) return;
  const style = document.createElement('style');
  style.textContent = `
    #pixel-ai-create-launch {
      position: fixed; right: 18px; bottom: 18px; z-index: 9998;
      display: inline-flex; align-items: center; gap: 8px;
      background: linear-gradient(135deg, #7c3aed, #5b21b6);
      color: #fff; border: 1px solid rgba(167, 139, 250, .55); border-radius: 10px;
      padding: 12px 18px; font: 600 14px Inter, system-ui, sans-serif;
      box-shadow: 0 8px 24px rgba(0, 0, 0, .45), 0 0 20px rgba(124, 58, 237, .35);
      cursor: pointer; transition: transform .15s ease, box-shadow .15s ease, filter .15s ease;
    }
    #pixel-ai-create-launch:hover {
      transform: translateY(-1px); filter: brightness(1.08);
      box-shadow: 0 12px 30px rgba(0, 0, 0, .5), 0 0 26px rgba(124, 58, 237, .5);
    }
    #pixel-ai-create {
      position: fixed; inset: 0; z-index: 9999; display: none;
      align-items: center; justify-content: center; padding: 20px;
      background: rgba(4, 7, 15, .78); backdrop-filter: blur(6px);
      font: 14px/1.5 Inter, system-ui, -apple-system, "Segoe UI", sans-serif;
      color: var(--text-primary, #e0e7ff);
    }
    #pixel-ai-create.open { display: flex; }
    #pixel-ai-create .card {
      width: min(640px, 100%); max-height: 88vh; overflow: auto;
      padding: 24px; border-radius: 12px;
      background: linear-gradient(180deg, var(--bg-dark, #1a1a2e), var(--bg-medium, #16213e));
      border: 1px solid var(--border-color, #2d3748);
      box-shadow: 0 24px 70px rgba(0, 0, 0, .65), 0 0 30px rgba(0, 255, 65, .06);
      scrollbar-color: var(--border-color, #2d3748) var(--bg-darkest, #0f0f1b);
    }
    #pixel-ai-create h2 {
      margin: 0 0 8px; color: var(--accent-primary, #00ff41);
      font-size: 1.25rem; font-weight: 700; letter-spacing: .01em;
      text-shadow: 0 0 18px rgba(0, 255, 65, .18);
    }
    #pixel-ai-create .card > p {
      margin: 0 0 16px; color: var(--text-secondary, #94a3b8); font-size: .85rem;
    }
    #pixel-ai-create textarea {
      box-sizing: border-box; width: 100%; min-height: 120px; resize: vertical;
      padding: 12px 14px; border-radius: 8px;
      border: 1px solid var(--border-color, #2d3748);
      background: var(--bg-darkest, #0f0f1b); color: var(--text-primary, #e0e7ff);
      font: inherit; line-height: 1.5; outline: none;
      transition: border-color .15s ease, box-shadow .15s ease;
    }
    #pixel-ai-create textarea:focus {
      border-color: var(--accent-tertiary, #00d9ff);
      box-shadow: 0 0 0 3px rgba(0, 217, 255, .14);
    }
    #pixel-ai-create .card > div { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
    #pixel-ai-create button {
      appearance: none; margin: 0; padding: 9px 14px; border-radius: 6px; cursor: pointer;
      border: 1px solid var(--border-color, #2d3748);
      background: var(--bg-light, #1e293b); color: var(--text-primary, #e0e7ff);
      font: 600 13px Inter, system-ui, sans-serif;
      transition: background .15s ease, border-color .15s ease, color .15s ease, box-shadow .15s ease;
    }
    #pixel-ai-create button:hover:not(:disabled) {
      background: var(--bg-medium, #16213e);
      border-color: var(--accent-tertiary, #00d9ff);
      color: var(--accent-tertiary, #00d9ff);
    }
    #pixel-ai-create button:disabled { opacity: .45; cursor: not-allowed; }
    #pixel-ai-create .generate { border-color: rgba(0, 217, 255, .4); color: var(--accent-tertiary, #00d9ff); }
    #pixel-ai-create .apply:not(:disabled) {
      background: var(--accent-primary, #00ff41); border-color: var(--accent-primary, #00ff41);
      color: #04120a; box-shadow: 0 0 16px rgba(0, 255, 65, .25);
    }
    #pixel-ai-create .apply:not(:disabled):hover {
      background: #5cff87; border-color: #5cff87; color: #04120a;
    }
    #pixel-ai-create .close { color: var(--text-secondary, #94a3b8); }
    #pixel-ai-create .status {
      min-height: 20px; margin: 12px 0 0;
      color: var(--text-secondary, #94a3b8); font-size: 12px;
    }
    #pixel-ai-create pre {
      margin: 12px 0 0; padding: 14px; max-height: 36vh; overflow: auto;
      border: 1px solid var(--border-color, #2d3748); border-radius: 8px;
      background: var(--bg-darkest, #0f0f1b); color: #9ae6b4;
      font: 12px/1.55 "Courier New", monospace;
      white-space: pre-wrap; word-break: break-word;
      scrollbar-color: var(--border-color, #2d3748) var(--bg-darkest, #0f0f1b);
    }
    #pixel-ai-create ::-webkit-scrollbar { width: 8px; height: 8px; }
    #pixel-ai-create ::-webkit-scrollbar-track { background: var(--bg-darkest, #0f0f1b); }
    #pixel-ai-create ::-webkit-scrollbar-thumb {
      background: var(--border-color, #2d3748); border-radius: 999px;
    }
    #pixel-ai-create ::-webkit-scrollbar-thumb:hover { background: var(--accent-tertiary, #00d9ff); }
    @media (max-width: 600px) {
      #pixel-ai-create { padding: 12px; }
      #pixel-ai-create .card { padding: 18px; border-radius: 10px; }
      #pixel-ai-create .card > div { flex-direction: column; }
      #pixel-ai-create button { width: 100%; }
    }
  `;
  document.head.appendChild(style);
  const launch = document.createElement('button'); launch.id='pixel-ai-create-launch'; launch.type='button'; launch.textContent='✦ AI Create';
  const modal = document.createElement('div'); modal.id='pixel-ai-create'; modal.innerHTML=`<section class="card" role="dialog" aria-modal="true" aria-labelledby="pixel-ai-title"><h2 id="pixel-ai-title">AI Create</h2><p>Describe what you want to make in ${spec[0]}. The generated result is previewed before it changes the editor.</p><textarea id="pixel-ai-prompt" placeholder="Describe what you want to create…"></textarea><div><button type="button" class="generate">Generate preview</button><button type="button" class="apply" disabled>Apply to editor</button><button type="button" class="close">Close</button></div><p class="status" role="status"></p><pre class="preview">Your preview will appear here.</pre></section>`;
  document.body.append(launch,modal);
  const status=modal.querySelector('.status'), preview=modal.querySelector('.preview'), apply=modal.querySelector('.apply');
  let result=null;
  launch.onclick=()=>modal.classList.add('open');
  modal.querySelector('.close').onclick=()=>modal.classList.remove('open');
  modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('open')});
  modal.querySelector('.generate').onclick=async()=>{
    try{
      if(!window.PixelAIProvider) throw new Error('AI provider settings are unavailable. Refresh the page and try again.');
      const prompt=modal.querySelector('#pixel-ai-prompt').value.trim();
      if(!prompt) throw new Error('Describe what you want to create first.');
      status.textContent='Generating preview…'; apply.disabled=true;
      let context='';
      if(APP==='pixelPose'&&window.PixelPoseAIContext) context=' Current skeleton nodes: '+JSON.stringify(window.PixelPoseAIContext());
      const text=await window.PixelAIProvider.generateText(`Create ${spec[0]} for this request: ${prompt}.${context} ${spec[1]}`,'You generate safe, valid JSON for a creative editor. Return only one JSON object with no markdown fences.');
      result=JSON.parse(text.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));
      preview.textContent=JSON.stringify(result,null,2); apply.disabled=false; status.textContent='Preview ready. Review it, then apply it to the current document.';
    }catch(error){result=null;preview.textContent='No result.';status.textContent=error.message||String(error)}
  };
  apply.onclick=()=>{
    if(!result)return;
    try{
      if(['pixelArt','pixelText','pixelTilemap','pixelDualTilemaps'].includes(APP)) applyPixelGrid(result,APP);
      else { const adapter=window['PixelAIApply_'+APP]; if(typeof adapter!=='function')throw new Error('The editor AI adapter is not ready. Refresh the page and try again.'); adapter(result); }
      status.textContent='Applied to the editor.';
    }catch(error){status.textContent=error.message||String(error)}
  };
  function applyPixelGrid(data, appId){
    if(!Array.isArray(data.pixels)||!data.pixels.length||!Array.isArray(data.palette)||!data.palette.length)throw new Error('The generated pixel grid is incomplete. Generate another preview.');
    if(appId==='pixelArt'||appId==='pixelText'){
      const s=window.State, cm=window.CanvasManager;
      const layer=s?.frames?.[s.currentFrameIndex]?.layers?.[s.activeLayerIndex];
      if(!layer?.data||!cm?.render)throw new Error('Could not find the active drawing layer.');
      const image=layer.data, w=image.width, h=image.height, pixels=data.pixels, palette=data.palette;
      const sourceH=pixels.length, sourceW=Math.max(...pixels.map(row=>Array.isArray(row)?row.length:0));
      if(!sourceW)throw new Error('The generated pixel grid is empty.');
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        const index=pixels[Math.floor(y*sourceH/h)]?.[Math.floor(x*sourceW/w)];
        if(index===-1||index===null||index===undefined)continue;
        const color=palette[Number(index)]; if(!color)continue;
        const hex=String(color).replace('#',''); if(!/^[0-9a-f]{6}$/i.test(hex))continue;
        const p=(y*w+x)*4; image.data[p]=parseInt(hex.slice(0,2),16);image.data[p+1]=parseInt(hex.slice(2,4),16);image.data[p+2]=parseInt(hex.slice(4,6),16);image.data[p+3]=255;
      }
      cm.render(); window.InputHandler?.saveState?.();
    }else{
      const s=window.State, layer=s?.layers?.[s.activeLayerIndex], canvas=layer?.canvas;
      if(!canvas)throw new Error('Could not find the active tile layer.');
      const ctx=canvas.getContext('2d'), pixels=data.pixels, palette=data.palette;
      ctx.clearRect(0,0,canvas.width,canvas.height);
      for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
        const index=pixels[Math.floor(y*pixels.length/canvas.height)]?.[Math.floor(x*Math.max(...pixels.map(r=>r.length))/canvas.width)];
        if(index===-1||index===null||index===undefined)continue;
        const color=palette[Number(index)]; if(color){ctx.fillStyle=color;ctx.fillRect(x,y,1,1)}
      }
      window.TilemapCore?.updatePreviews?.(); s.hasUnsavedChanges=true;
    }
  }
})();
