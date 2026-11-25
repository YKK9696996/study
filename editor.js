(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const vanGogh=new URLSearchParams(location.search).get('artist')==='van-gogh';
 const draftKey=vanGogh?'study-editor-draft:van-gogh':'study-editor-draft';
 const previewUrl='./?preview=1'+(vanGogh?'&artist=van-gogh':'');
 const exportName=vanGogh?'van-gogh-content.js':'monet-content.js';
 const exportGlobal=vanGogh?'VAN_GOGH_CONTENT':'MONET_CONTENT';
 let data=structuredClone({...window.STUDY_CONTENT,...(vanGogh?window.VAN_GOGH_CONTENT:window.MONET_CONTENT)});
 try {
   const draft=JSON.parse(localStorage.getItem(draftKey));
   if(draft)data=vanGogh?{...data,title:draft.title,sections:draft.sections}:draft;
 } catch {}
 $('draft-preview').href=previewUrl;
 $('draft-control-preview').href=previewUrl+'&group=control';
 if(vanGogh){
   $('export-settings').hidden=true;
   for(const id of ['duration','version','study','control','experimental','intro'])$('edit-'+id).closest('label').hidden=true;
 }
 data=window.upgradeStudyLayout(data, !vanGogh);
 const message=t=>$('editor-status').textContent=t;
 const el=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
 function input(parent,label,value,onchange,multi=false){const l=el('label',label),v=el(multi?'textarea':'input');if(!multi)v.type='text';v.value=value||'';v.oninput=()=>onchange(v.value);l.append(v);parent.append(l);return v;}
 function audience(parent,obj){const l=el('label','显示给 '),s=el('select');[['both','两组'],['control','对照组'],['experimental','实验组']].forEach(([v,t])=>{const o=el('option',t);o.value=v;s.append(o);});s.value=obj.audience||'both';s.onchange=()=>obj.audience=s.value;l.append(s);parent.append(l);}
 function button(parent,label,action){const b=el('button',label);b.type='button';b.className='secondary small';b.onclick=action;parent.append(b);}
 function populate(){for(const [id,key] of [['title','title'],['duration','durationSeconds'],['version','version'],['study','studyId'],['intro','intro']])$('edit-'+id).value=data[key];$('edit-control').value=data.posttestUrls.control;$('edit-experimental').value=data.posttestUrls.experimental;render();}
 function render(){$('edit-sections').replaceChildren();data.sections.forEach((s,i)=>{const box=el('section');box.className='edit-section';box.append(el('h2','章节 '+(i+1)));input(box,'章节标题',s.title,v=>s.title=v);input(box,'说明文字',s.text,v=>s.text=v,true);input(box,'小结（选填）',s.summary,v=>s.summary=v,true);const row=el('div');row.className='row';audience(row,s);const layoutLabel=el('label','排版 '),layoutSelect=el('select');[['standard','标准（两列）'],['triptych','每排三张（三列）']].forEach(([v,t])=>{const o=el('option',t);o.value=v;layoutSelect.append(o);});layoutSelect.value=window.studySectionLayout(s, !vanGogh);layoutSelect.onchange=()=>s.layout=layoutSelect.value;layoutLabel.append(layoutSelect);row.append(layoutLabel);const label=el('label','启用章节'),check=el('input');check.type='checkbox';check.checked=s.enabled!==false;check.onchange=()=>s.enabled=check.checked;label.prepend(check);row.append(label);button(row,'上移',()=>{if(i){[data.sections[i-1],data.sections[i]]=[s,data.sections[i-1]];render();}});button(row,'删除章节',()=>{if(confirm('删除这个章节及其中图片？')){data.sections.splice(i,1);render();}});box.append(row);
 (s.cards||[]).forEach((c,j)=>{const card=el('div');card.className='edit-card';input(card,'图片 / 内容标题',c.title,v=>c.title=v);input(card,'说明',c.text,v=>c.text=v,true);input(card,'图片下方标注',c.caption,v=>c.caption=v);audience(card,c);if(c.image){const im=el('img');im.src=c.image;im.alt=c.title||'教材图片';card.append(im);}const f=el('input');f.type='file';f.accept='image/png,image/jpeg,image/webp';const l=el('label','添加或替换图片');l.append(f);card.append(l);f.onchange=async()=>{const file=f.files[0];if(!file)return;if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>12*1024*1024){message('请选择不超过12MB的 PNG、JPEG 或 WebP 图片。');return;}const reader=new FileReader();reader.onload=()=>{c.image=reader.result;render();message('图片已加入，记得保存或导出。');};reader.readAsDataURL(file);};button(card,'删除此内容',()=>{if(confirm('删除这项内容？')){s.cards.splice(j,1);render();}});box.append(card);});button(box,'添加图片或文字',()=>{s.cards=s.cards||[];s.cards.push({title:'',text:'',caption:'',image:'',audience:'both'});render();});$('edit-sections').append(box);});}
 function collect(){if(!$('settings').reportValidity())throw Error('请检查设置项。');data.title=$('edit-title').value;data.durationSeconds=Number($('edit-duration').value);data.version=$('edit-version').value.trim();data.studyId=$('edit-study').value.trim();data.intro=$('edit-intro').value;for(const g of ['control','experimental']){const v=$('edit-'+g).value.trim();if(v){const u=new URL(v);if(u.protocol!=='https:'||!['docs.google.com','forms.gle'].includes(u.hostname))throw Error('后测链接请使用 Google Forms 的 HTTPS 地址。');}data.posttestUrls[g]=v;}return data;}
 $('save-draft').onclick=()=>{try{localStorage.setItem(draftKey,JSON.stringify(collect()));message('草稿已保存在当前浏览器，预览不会计时。');window.open(previewUrl,'_blank','noopener');}catch(e){message('未保存：'+e.message+' 图片较多时可直接导出教材文件。');}};
 function download(name, globalName, content) {
   const blob=new Blob(['window.'+globalName+' = '+JSON.stringify(content,null,2)+';\n'],{type:'text/javascript;charset=utf-8'});
   const url=URL.createObjectURL(blob),link=el('a');
   link.href=url;
   link.download=name;
   link.click();
   setTimeout(()=>URL.revokeObjectURL(url),1000);
   message('已导出 '+name);
 }
 $('export').onclick=()=>{
   try {
     const {title,sections,layoutRevision}=collect();
     download(exportName,exportGlobal,vanGogh?{title,sections}:{title,sections,layoutRevision});
   } catch(e) { message(e.message); }
 };
 $('export-settings').onclick=()=>{
   try {
     const {studyId,version,durationSeconds,intro,posttestUrls}=collect();
     download('content.js','STUDY_CONTENT',{studyId,version,durationSeconds,intro,posttestUrls});
   } catch(e) { message(e.message); }
 };
 $('import-button').onclick=()=>$('import-file').click();$('import-file').onchange=async()=>{try{const file=$('import-file').files[0];if(!file)return;const raw=(await file.text()).trim().replace(/^window\.(?:STUDY_CONTENT|MONET_CONTENT|VAN_GOGH_CONTENT)\s*=\s*/,'').replace(/;\s*$/,'');const imported=JSON.parse(raw);const next=vanGogh?{...data,title:imported.title,sections:imported.sections}:{...data,...imported};if(!next.title||!Array.isArray(next.sections)||!next.posttestUrls||!Number.isFinite(Number(next.durationSeconds)))throw Error('文件不是有效的教材配置。');data=window.upgradeStudyLayout(next, !vanGogh);populate();message('已导入，请保存草稿或导出。');}catch(e){message('导入失败：'+e.message);}};
 $('add-triptych').onclick=()=>{data.sections.push({title:'画風の比較',text:'',summary:'',audience:'experimental',layout:'triptych',enabled:true,cards:['花の写真','スタイル画像','転送画像'].map(title=>({title,text:'',caption:'',image:'',imageSlot:true,audience:'experimental'}))});render();$('edit-sections').lastElementChild.scrollIntoView({behavior:'smooth',block:'start'});};
 $('add-section').onclick=()=>{data.sections.push({title:'新章节',text:'',summary:'',audience:'both',enabled:true,cards:[]});render();};populate();
})();
