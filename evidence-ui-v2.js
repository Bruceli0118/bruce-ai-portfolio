(() => {
 'use strict';
 const messages={
 'zh-CN':['复制邮箱','邮箱已复制','自动复制不可用，请手动复制邮箱','关闭预览'],
 'en':['Copy email','Email copied','Copy unavailable. Please copy manually.','Close preview'],
 'zh-Hant':['複製郵箱','郵箱已複製','請手動複製郵箱','關閉預覽'],
 'ja':['メールをコピー','コピーしました','アドレスを手動でコピーしてください','プレビューを閉じる']
 }[document.documentElement.lang];if(!messages)return;
 const button=document.querySelector('.email-copy'),status=document.querySelector('.copy-status');
 button.hidden=false;button.addEventListener('click',async()=>{let timer;button.disabled=true;status.textContent=messages[0]+'…';try{await Promise.race([navigator.clipboard.writeText('39210670@qq.com'),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('timeout')),2000);})]);status.textContent=messages[1];}catch{status.textContent=messages[2];}finally{clearTimeout(timer);button.disabled=false;}});
 const dialog=document.createElement('dialog');dialog.className='preview-dialog';dialog.setAttribute('aria-label',messages[3]);
 const close=document.createElement('button');close.type='button';close.textContent=messages[3]+' ×';
 const image=document.createElement('img'),caption=document.createElement('p');dialog.append(close,image,caption);document.body.append(dialog);let origin=null;
 close.addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});dialog.addEventListener('close',()=>{origin?.focus();document.body.style.overflow='';});
 document.querySelectorAll('.preview-open').forEach(trigger=>trigger.addEventListener('click',e=>{const img=trigger.querySelector('img');if(!dialog.showModal){location.href=img.src;return;}e.preventDefault();origin=trigger;image.src=img.src;image.alt=img.alt;caption.textContent=trigger.closest('figure').querySelector('figcaption').textContent;dialog.showModal();document.body.style.overflow='hidden';close.focus();}));
 const links=[...document.querySelectorAll('.site-header nav a')];
 if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];if(!visible)return;links.forEach(a=>{const current=a.hash==='#'+visible.target.id;a.classList.toggle('nav-current',current);if(current)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});},{rootMargin:'-10% 0px -50% 0px'});document.querySelectorAll('main>section').forEach(s=>observer.observe(s));}
})();
