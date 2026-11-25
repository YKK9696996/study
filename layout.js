
(() => {
  window.studySectionLayout = (section, isMonet) => {
    if (section.layout) return section.layout;
    const sharedImageSection = isMonet && section.audience === 'both' &&
      section.cards?.some(card => card.image || card.imageSlot);
    return sharedImageSection ? 'triptych' : 'standard';
  };

  window.upgradeStudyLayout = (input, isMonet = false) => {
    const data=structuredClone(input);
    if (isMonet && data.layoutRevision === 1 &&
        data.studyId === window.STUDY_CONTENT.studyId &&
        !data.sections.some(section => section.audience === 'control' ||
          section.id === 'monet-other-works')) {
      const gallery = window.MONET_CONTENT.sections.find(section => section.id === 'monet-other-works');
      if (gallery) {
        const firstComparison = data.sections.findIndex(section => section.audience === 'experimental');
        data.sections.splice(firstComparison < 0 ? data.sections.length : firstComparison, 0, structuredClone(gallery));
      }
    }
    if(data.layoutRevision===1)return data;
    const i=data.sections.findIndex(s=>s.audience==='both' && !s.layout && s.cards?.length===4 &&
      s.cards.map(c=>c.image).join('|')==='assets/image3.jpeg|assets/image5.png|assets/image4.jpeg|assets/image6.png');
    if(i<0)return data;
    const old=data.sections[i];
    const style=data.sections.flatMap(s=>s.cards||[]).find(c=>c.image==='assets/image1.jpeg');
    if(!style)return data;
    const control={...old,audience:'control',cards:old.cards.filter(c=>c.audience!=='experimental')};
    const groups=[0,2].map((n,index)=>({
      title:'\u753b\u98a8\u306e\u6bd4\u8f03 '+String(index+1).padStart(2,'0'),
      text:old.text||'',summary:old.summary||'',enabled:old.enabled!==false,
      audience:'experimental',layout:'triptych',
      cards:[
        {...old.cards[n],title:'\u82b1\u306e\u5199\u771f',audience:'experimental'},
        {...style,title:'\u30b9\u30bf\u30a4\u30eb\u753b\u50cf',text:'',caption:style.title+' / \u539f\u4f5c',audience:'experimental'},
        {...old.cards[n+1],title:'\u751f\u6210\u753b\u50cf',audience:'experimental'}
      ]
    }));
    data.sections.splice(i,1,control,...groups);
    data.layoutRevision=1;
    return data;
  };
})();
