function e({triggers:e,getTitle:t}){let n=[...e];if(n.length===0)return;let r=document.createElement(`dialog`);r.className=`project-lightbox`,r.setAttribute(`aria-label`,`Project image preview`),r.innerHTML=`
    <button class="project-lightbox__close" type="button" aria-label="Close image preview">
      <span aria-hidden="true">&times;</span>
    </button>
    <figure class="project-lightbox__figure">
      <img class="project-lightbox__image" alt="" />
      <figcaption class="project-lightbox__caption"></figcaption>
    </figure>
  `,document.body.append(r);let i=r.querySelector(`.project-lightbox__image`),a=r.querySelector(`.project-lightbox__caption`),o=r.querySelector(`.project-lightbox__close`),s=null,c=()=>r.close(),l=e=>{let n=e.querySelector(`img`);n&&(s=e,i.src=n.currentSrc||n.src,i.alt=n.alt,a.textContent=t?.(e,n)||n.alt,document.body.classList.add(`has-lightbox-open`),r.showModal(),o.focus())};n.forEach(e=>{e.matches(`button, a, input, select, textarea`)||(e.tabIndex=0,e.setAttribute(`role`,`button`),e.addEventListener(`keydown`,t=>{(t.key===`Enter`||t.key===` `)&&(t.preventDefault(),l(e))})),e.addEventListener(`click`,()=>l(e))}),o.addEventListener(`click`,c),r.addEventListener(`click`,e=>{e.target===r&&c()}),r.addEventListener(`close`,()=>{document.body.classList.remove(`has-lightbox-open`),i.removeAttribute(`src`),s?.focus(),s=null})}export{e as t};