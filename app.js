(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const preview = params.get('preview') === '1';
  function loadMaterial(content, draftKey, isMonet = false) {
    if (preview) {
      try { content = JSON.parse(localStorage.getItem(draftKey)) || content; } catch {}
    }
    return window.upgradeStudyLayout(content, isMonet);
  }
  const config = loadMaterial({...window.STUDY_CONTENT,...window.MONET_CONTENT}, 'study-editor-draft', true);
  const materials = {
    monet: config,
    'van-gogh': loadMaterial(window.VAN_GOGH_CONTENT, 'study-editor-draft:van-gogh')
  };
  const artistNames = {monet: 'モネ', 'van-gogh': 'ゴッホ'};
  const currentArtist = () => {
    const selected = new URLSearchParams(location.hash.slice(1)).get('artist') || params.get('artist');
    return selected === 'van-gogh' ? 'van-gogh' : 'monet';
  };
  let artist = currentArtist();
  const group = params.get('group') === 'control' ? 'control' : 'experimental';
  const visibleSections = material => material.sections.filter(s => s.enabled !== false && (s.audience === 'both' || s.audience === group));
  const duration = Number(config.durationSeconds);
  let session, sessionKey, interval;
  const make = (tag, text, className) => { const e=document.createElement(tag); if(text) e.textContent=text; if(className)e.className=className;return e; };
  const imageSrc = src => /^(assets\/[^?#]+|data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+)$/.test(src || '') ? src : '';
  function renderArtistNav(nav) {
    nav.replaceChildren();
    for (const [id, name] of Object.entries(artistNames)) {
      const link = make('a', name);
      link.href = '#artist=' + id;
      if (id === artist) link.setAttribute('aria-current', 'page');
      link.onclick = event => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        if (id === artist) return;
        history.pushState(null, '', link.href);
        showArtist(id, nav);
      };
      nav.append(link);
    }
  }
  function render() {
    updateTitle();
    $('sections').replaceChildren();
    renderArtistNav($('artist-nav'));
    renderArtistNav($('top-artist-nav'));
    $('top-artist-nav').hidden = false;
    visibleSections(materials[artist]).forEach(s => {
      const section=make('section',null,'material-section');
      section.append(make('h2',s.title));
      if(s.text)section.append(make('p',s.text,'section-text'));
      const layout = window.studySectionLayout(s, artist === 'monet');
      const cards=make('div',null,layout==='triptych'?'cards triptych':'cards');
      (s.cards||[]).filter(c=>c.audience==='both'||c.audience===group||!c.audience).forEach(c=>{
        const card=make('article',null,'card');if(c.title)card.append(make('h3',c.title));
        if(imageSrc(c.image)){
          const button=make('button',null,'image-button');button.type='button';button.setAttribute('aria-label',(c.title||'画像')+'を拡大');
          const img=make('img');img.src=imageSrc(c.image);img.alt=c.caption||c.title||'学習画像';button.append(img);
          button.onclick=()=>{if(!preview&&Date.now()>=session.endAt){finish();return;}$('large-image').src=img.src;$('large-image').alt=img.alt;$('large-caption').textContent=c.caption||c.title;$('lightbox').showModal();};
          card.append(button);if(c.caption)card.append(make('p',c.caption,'caption'));
        } else if(c.imageSlot) {
          card.append(make('div','画像準備中','image-placeholder'));
        }
        if(c.text)card.append(make('p',c.text));cards.append(card);
      });section.append(cards);if(s.summary)section.append(make('p',s.summary,'summary'));$('sections').append(section);
    });
  }
  function updateTitle() {
    const title = materials[artist].title;
    $('lesson-title').textContent = title;
    document.title = title + ' | 画風学習室';
  }
  function showArtist(id, nav) {
    artist = id;
    if (!preview && session && Date.now() >= session.endAt) { finish(); return; }
    if (preview || (session && !$('lesson').hidden)) {
      if ($('lightbox').open) $('lightbox').close();
      render();
      nav?.querySelector('[aria-current="page"]').focus({preventScroll:true});
      window.scrollTo(0,0);
    }
  }
  window.addEventListener('popstate', () => showArtist(currentArtist()));
  function persist(){localStorage.setItem(sessionKey,JSON.stringify(session));}
  function finish(){clearInterval(interval);if($('lightbox').open)$('lightbox').close();$('large-image').removeAttribute('src');$('sections').replaceChildren();$('lesson').hidden=true;$('welcome').hidden=true;$('finished').hidden=false;$('status').textContent='学習終了';$('finish-id').textContent='参加者番号：'+session.participant;session.finishedAt=session.finishedAt||Date.now();try{persist();}catch{}
    $('top-artist-nav').hidden = true;
    const url=config.posttestUrls?.[session.group]||'';
    try{const u=new URL(url);if(u.protocol!=='https:'||!['docs.google.com','forms.gle'].includes(u.hostname))throw Error();$('posttest').href=u.href;$('posttest').hidden=false;}catch{$('no-posttest').hidden=false;}
    window.scrollTo(0,0);
  }
  function tick(){const left=Math.max(0,Math.ceil((session.endAt-Date.now())/1000));if(!left){finish();return;}$('status').replaceChildren(make('span','残り時間 '),make('strong',String(Math.floor(left/60)).padStart(2,'0')+':'+String(left%60).padStart(2,'0'),'timer'+(left<=30?' warn':'')));}
  function begin(){if(session.group!==group){$('start-error').textContent='最初に使用した学習リンクから再開してください。';return;}if(Date.now()>=session.endAt){finish();return;}render();$('welcome').hidden=true;$('lesson').hidden=false;tick();interval=setInterval(tick,250);window.scrollTo(0,0);}
  $('intro').textContent=config.intro;
  $('duration').textContent=(duration/60)+'分';
  $('close-lightbox').onclick=()=>$('lightbox').close();
  $('start-form').onsubmit=e=>{e.preventDefault();const id=$('participant').value.trim();if(!id)return;sessionKey='study-session:'+config.studyId+':'+config.version+':'+id;
    try{const stored=localStorage.getItem(sessionKey);session=stored?JSON.parse(stored):{participant:id,group,version:config.version,startAt:Date.now(),endAt:Date.now()+duration*1000,hiddenCount:0};if(!Number.isFinite(session.endAt))throw Error();persist();}catch{$('start-error').textContent='このブラウザで学習時間を保存できません。通常のブラウザで開き直してください。';return;}begin();};
  document.addEventListener('visibilitychange',()=>{if(!session||preview||$('lesson').hidden)return;if(document.hidden){session.hiddenCount++;try{persist();}catch{}}else tick();});
  window.addEventListener('pageshow',()=>{if(session&&!preview)tick();});
  if(preview){$('welcome').hidden=true;$('lesson').hidden=false;$('status').textContent='教材プレビュー · 時間制限なし';render();return;}
  if(!Number.isFinite(duration)||duration<1||Object.values(materials).some(material => !visibleSections(material).length)){$('load-status').textContent='教材の設定を確認してください。';return;}
  const sources=[...new Set(Object.values(materials).flatMap(visibleSections).flatMap(s=>(s.cards||[]).filter(c=>!c.audience||c.audience==='both'||c.audience===group).map(c=>imageSrc(c.image)).filter(Boolean)))];
  Promise.all(sources.map(src=>new Promise((resolve,reject)=>{const img=new Image();const t=setTimeout(()=>reject(Error('timeout')),45000);img.onload=()=>{clearTimeout(t);resolve();};img.onerror=()=>{clearTimeout(t);reject(Error('image'));};img.src=src;}))).then(()=>{$('load-status').textContent='準備ができました。開始ボタンを押すと計時が始まります。';$('start').disabled=false;}).catch(()=>{$('load-status').textContent='一部の画像を読み込めませんでした。通信状態を確認し、ページを再読み込みしてください。';});
})();
